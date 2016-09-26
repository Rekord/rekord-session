/* rekord-session 1.4.1 - Adds mass changes & discards to Rekord by Philip Diffenderfer */
(function(global, Rekord, undefined)
{
  var Map = Rekord.Map;
  var Model = Rekord.Model;
  var Promise = Rekord.Promise;
  var Database = Rekord.Database;
  var Collection = Rekord.Collection;
  var ModelCollection = Rekord.ModelCollection;
  var RelationHasOne = Rekord.Relations.hasOne;
  var RelationBelongsTo = Rekord.Relations.belongsTo;
  var Cascade = Rekord.Cascade;

  var isObject = Rekord.isObject;
  var isNumber = Rekord.isNumber;
  var uuid = Rekord.uuid;
  var equals = Rekord.equals;
  var noop = Rekord.noop;

  var addMethods = Rekord.addMethods;
  var replaceMethod = Rekord.replaceMethod;
  var addEventful = Rekord.addEventful;
  var addEventFunction = Rekord.addEventFunction;

  var keyParser = Rekord.createParser('$key()');

var Listeners = {

  RelationUpdate: function(session, watcher, parent, related, property)
  {
    return function onRelationUpdate(relator, relation)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      if ( relation.lastRelated && session.isWatching( relation.lastRelated ) )
      {
        session.unwatch( relation.lastRelated );
      }

      if ( relation.related && !session.isWatching( relation.related ) )
      {
        session.watch( relation.related, watcher.relations[ property ], watcher );
      }
    };
  },

  CollectionAdd: function(session, watcher)
  {
    return function onAdd(collection, added)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      session.watch( added, watcher.relations, watcher );
    };
  },

  CollectionAdds: function(session, watcher)
  {
    return function onAdds(collection, added)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      for (var i = 0; i < added.length; i++)
      {
        session.watch( added[ i ], watcher.relations, watcher );
      }
    };
  },

  CollectionRemove: function(session, watcher)
  {
    return function onRemove(collection, removed)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      session.unwatch( removed );
    };
  },

  CollectionRemoves: function(session, watcher)
  {
    return function onRemoves(collection, removed)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      for (var i = 0; i < removed.length; i++)
      {
        session.unwatch( removed[ i ] );
      }
    };
  },

  CollectionReset: function(session, watcher)
  {
    return function onReset(collection)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      watcher.moveChildren( session.unwatched );

      for (var i = 0; i < collection.length; i++)
      {
        session.watch( collection[ i ], watcher.relations, watcher );
      }
    };
  },

  CollectionCleared: function(session, watcher)
  {
    return function onCleared(collection)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      watcher.moveChildren( session.unwatched );
    };
  }

};


replaceMethod( Model.prototype, '$save', function($save)
{
  return function(setProperties, setValue, cascade)
  {
    var fakeIt = this.$session && this.$session.isActive();

    if ( this.$isDeleted() )
    {
      Rekord.debug( Rekord.Debugs.SAVE_DELETED, this.$db, this );

      return Promise.resolve( this );
    }

    if ( fakeIt )
    {
      var cascade =
        (arguments.length === 3 ? cascade :
          (arguments.length === 2 && isObject( setProperties ) && isNumber( setValue ) ? setValue :
            (arguments.length === 1 && isNumber( setProperties ) ?  setProperties : this.$db.cascade ) ) );

      this.$set( setProperties, setValue );

      this.$session.saveModel( this, cascade );

      return Promise.resolve( this );
    }

    return $save.apply( this, arguments );
  };
});

replaceMethod( Model.prototype, '$remove', function($remove)
{
  return function(cascade)
  {
    var ignoreExists = this.$session && this.$session.isSaving();
    var fakeIt = this.$session && this.$session.isActive();

    if ( !this.$exists() && !ignoreExists )
    {
      return Promise.resolve( this );
    }

    if ( fakeIt )
    {
      this.$session.removeModel( this, cascade );

      return Promise.resolve( this );
    }

    return $remove.apply( this, arguments );
  };
});


function Session()
{
  this.status = Session.Status.Active;
  this.watching = new Map();
  this.removing = new Map();
  this.unwatched = new Map();
  this.validationRequired = false;
  this.promise = Promise.resolve( this );
}

Session.Status =
{
  Active: 'active',

  Saving: 'saving',

  Disabled: 'disabled',

  Destroyed: 'destroyed'
};

Session.Events =
{
  Discard: 'discard', // (Session)

  SaveStart: 'save-start', // (Session)

  SaveSuccess: 'save-sucess', // (Session)

  SaveFailure: 'save-failure', // (Session)

  Destroy: 'destroy', // (Session)

  Watch: 'watch', // (Session, Model, SessionWatch)

  Unwatch: 'unwatch',  // (Session, Collection, SessionWatch)

  Invalid: 'invalid',  // (Session)

  Valid: 'valid',  // (Session)

  Changes: 'discard save-start save-success save-failure destroy'  // (Session)
};

addMethods( Session.prototype,
{

  hasChanges: function(checkSavedOnly)
  {
    if (this.removing.size() > 0)
    {
      return true;
    }

    var unwatchedChanges = searchModels( this.unwatched, false, function(model, watcher)
    {
      if ( (!checkSavedOnly || watcher.save) && model.$hasChanges() )
      {
        return true;
      }
    });

    if ( unwatchedChanges )
    {
      return true;
    }

    var watchedChanges = searchModels( this.watching, false, function(model, watcher)
    {
      if ( (!checkSavedOnly || watcher.save) && model.$hasChanges() )
      {
        return true;
      }
    });

    return watchedChanges;
  },

  getChanged: function(checkSavedOnly, out)
  {
    var target = out || new Collection();

    target.push.apply( target, this.removing.values );

    searchModels( this.watching, null, function(model, watcher)
    {
      if ( (!checkSavedOnly || watcher.save) && model.$hasChanges() )
      {
        target.push( model );
      }
    });

    searchModels( this.unwatched, null, function(model, watcher)
    {
      if ( (!checkSavedOnly || watcher.save) && model.$hasChanges() )
      {
        target.push( model );
      }
    });

    return target;
  },

  validate: function(stopAtInvalid)
  {
    var valid = true;

    if ( Rekord.Validation )
    {
      searchModels( this.watching, true, function(model, watcher)
      {
        if ( model.$validate && !model.$validate() )
        {
          valid = false;

          if ( stopAtInvalid )
          {
            return false;
          }
        }
      });

      if ( valid )
      {
        this.trigger( Session.Events.Valid, [this] );
      }
      else
      {
        this.trigger( Session.Events.Invalid, [this] );
      }
    }

    return valid;
  },

  setValidationRequired: function(required)
  {
    this.validationRequired = required;
  },

  save: function(fullValidate)
  {
    if ( this.status !== Session.Status.Active )
    {
      return Promise.reject( this );
    }

    if ( this.validationRequired && !this.validate( !fullValidate ) )
    {
      return Promise.reject( this );
    }

    if ( this.promise.isPending() )
    {
      return Promise.reject( this );
    }

    this.trigger( Session.Events.SaveStart, [this] );

    var sessionPromise = new Promise();

    var savePromise = Promise.singularity( sessionPromise, this, this.handleSave );

    sessionPromise.resolve( this );

    savePromise.success( this.onSaveSuccess, this );
    savePromise.complete( this.onSaveComplete, this );

    this.promise = savePromise;

    return savePromise;
  },

  handleSave: function(singularity)
  {
    this.status = Session.Status.Saving;

    searchModels( this.watching, true, this.executeSave, this );

    searchModels( this.removing, true, this.executeRemove, this );

    searchAny( this.unwatched, true, this.executeUnwatchedSave, this );

    this.status = Session.Status.Active;
  },

  executeSave: function(model, watcher)
  {
    if ( watcher.save )
    {
      // Remove it so $save processes normally
      if ( !model.$isSaved() )
      {
        model.$db.models.remove( model.$key() );
      }

      model.$save( watcher.cascade ).success( this.afterSave( watcher ) );
    }
  },

  executeRemove: function(model, watcher)
  {
    if ( model.$status === Model.Status.RemovePending )
    {
      this.resync( model );

      model.$remove( watcher.cascade ).success( this.afterRemove( watcher, this ) );
    }
  },

  executeUnwatchedSave: function(model, watcher)
  {
    if ( watcher.save )
    {
      if ( !model.$isSaved() )
      {
        model.$db.models.remove( model.$key() );
      }

      model.$save( watcher.cascade ).success( this.afterUnwatchSave( watcher ) );
    }
  },

  afterSave: function(watcher)
  {
    return function onSave()
    {
      watcher.resetSave();
      watcher.saveState( true );
    };
  },

  afterRemove: function(watcher, session)
  {
    return function onRemove()
    {
      session.removing.remove( watcher.key );
      watcher.destroyReferences();
    };
  },

  afterUnwatchSave: function(watcher)
  {
    return function onSave()
    {
      watcher.destroy();
    };
  },

  onSaveComplete: function()
  {
    if ( this.promise.isSuccess() )
    {
      this.trigger( Session.Events.SaveSuccess, [this] );
    }
    else
    {
      this.trigger( Session.Events.SaveFailure, [this] );
    }
  },

  onSaveSuccess: function()
  {
    searchAny( this.unwatched, true, this.onSaveSuccessUnwatched, this );

    this.removing.reset();
    this.unwatched.reset();
  },

  onSaveSuccessUnwatched: function(model, watcher)
  {
    watcher.destroy();
  },

  discard: function()
  {
    searchModels( this.removing, true, this.discardRemove, this );

    searchAny( this.unwatched, true, this.discardUnwatched, this );

    searchModels( this.watching, true, this.discardSave, this );

    this.removing.reset();
    this.unwatched.reset();

    return this;
  },

  discardSave: function(model, watcher)
  {
    if ( watcher.save && !model.$isSaved() )
    {
      model.$db.removeFromModels( model );
    }

    watcher.resetSave();
    watcher.restoreState();

    model.$updated();
  },

  discardRemove: function(model, watcher)
  {
    if ( model.$status === Model.Status.RemovePending )
    {
      this.resync( model );

      watcher.reattach();
    }
  },

  discardUnwatched: function(model, watcher)
  {
    watcher.reattach();
  },

  disable: function()
  {
    if ( this.status === Session.Status.Active )
    {
      this.status = Session.Status.Disabled;
    }
  },

  enable: function()
  {
    if ( this.status === Session.Status.Disabled )
    {
      this.status = Session.Status.Active;
    }
  },

  isEnabled: function()
  {
    return this.status !== Session.Status.Disabled &&
           this.status !== Session.Status.Destroyed;
  },

  isActive: function()
  {
    return this.status === Session.Status.Active;
  },

  isDisabled: function()
  {
    return this.status === Session.Status.Disabled;
  },

  isSaving: function()
  {
    return this.status === Session.Status.Saving;
  },

  isDestroyed: function()
  {
    return this.status === Session.Status.Destroyed;
  },

  destroy: function()
  {
    if ( this.status !== Session.Status.Destroyed )
    {
      var watches = this.watching.values;

      for (var i = 0; i < watches.length; i++)
      {
        var watcher = watches[ i ];

        if ( !watcher.parent )
        {
          watcher.destroy();
        }
      }

      var unwatched = this.unwatched.values;

      for (var i = 0; i < unwatched.length; i++)
      {
        var watcher = unwatched[ i ];

        if ( !watcher.parent )
        {
          watcher.destroy();
        }
      }

      var removing = this.removing.values;

      for (var i = 0; i < removing.length; i++)
      {
        var remover = removing[ i ];

        remover.destroyReferences();
      }

      this.watching.reset();
      this.unwatched.reset();
      this.removing.reset();

      this.status = Session.Status.Destroyed;
      this.trigger( Session.Events.Destroy, [this] );
    }
  },

  getSessionKey: function(object, create)
  {
    if ( object instanceof Model )
    {
      return object.$uid();
    }
    else if ( object instanceof ModelCollection )
    {
      if ( !object.$sessionKey && create )
      {
        object.$sessionKey = uuid();
      }

      return object.$sessionKey;
    }
    else if ( create )
    {
      throw 'The object provided cannot be watched by session.';
    }
  },

  getSessionWatch: function(object, create)
  {
    var key = this.getSessionKey( object, create );

    if ( key )
    {
      var watch = this.watching.get( key );

      if ( !watch && create )
      {
        watch = this.unwatched.get( key );

        this.unwatched.remove( key );

        if ( watch )
        {
          this.watching.put( key, watch );
        }
      }

      if ( !watch && create )
      {
        watch = new SessionWatch( key, object );

        this.watching.put( key, watch );
      }

      return watch;
    }
  },

  getAnyWatch: function(object)
  {
    var key = this.getSessionKey( object );

    if ( key )
    {
      return this.watching.get( key ) || this.unwatched.get( key );
    }
  },

  getRemoveWatch: function(object)
  {
    var key = this.getSessionKey( object );

    if ( key )
    {
      return this.removing.get( key );
    }
  },

  isWatching: function(object)
  {
    var key = this.getSessionKey( object );

    return key && this.watching.has( key );
  },

  isUnwatched: function(object)
  {
    var key = this.getSessionKey( object );

    return key && this.unwatched.has( key );
  },

  isRemoved: function(object)
  {
    var key = this.getSessionKey( object );

    return key && this.removing.has( key );
  },

  hasWatched: function(object)
  {
    var key = this.getSessionKey( object );

    return key && ( this.watching.has( key ) || this.removing.has( key ) || this.unwatched.has( key ) );
  },

  watchMany: function(models, relations)
  {
    var watchers = [];

    for (var i = 0; i < models.length; i++)
    {
      watchers.push( this.watch( models[ i ], relations ) );
    }

    return watchers;
  },

  // Watching is typically performed on saved models without changes.
  watch: function(model, relations, parent)
  {
    var watcher = this.getSessionWatch( model, true );

    watcher.setRelations( relations );
    watcher.setSession( this );
    watcher.setParent( parent );
    watcher.saveState();

    if ( isObject( relations ) )
    {
      for (var property in relations)
      {
        var value = model[ property ];

        if ( value instanceof Model )
        {
          this.watch( value, relations[ property ], watcher );
        }
        else if ( value instanceof ModelCollection )
        {
          this.watchCollection( value, relations[ property ], watcher );
        }

        var relation = model.$getRelation( property );

        if ( relation instanceof RelationHasOne || relation instanceof RelationBelongsTo )
        {
          watcher.addListener( Model.Events.RelationUpdate, Listeners.RelationUpdate( this, watcher, model, value, property ) );
        }
      }
    }

    this.trigger( Session.Events.Watch, [this, model, watcher] );

    return watcher;
  },

  // Watching is typically performed on saved models without changes.
  watchCollection: function(collection, relations, parent)
  {
    var watcher = this.getSessionWatch( collection, true );

    watcher.setRelations( relations );
    watcher.setSession( this );
    watcher.setParent( parent );

    collection.each(function(model)
    {
      this.watch( model, relations, watcher );

    }, this );

    watcher.addListener( Collection.Events.Add, Listeners.CollectionAdd( this, watcher ) );
    watcher.addListener( Collection.Events.Adds, Listeners.CollectionAdds( this, watcher ) );
    watcher.addListener( Collection.Events.Reset, Listeners.CollectionReset( this, watcher ) );
    watcher.addListener( Collection.Events.Remove, Listeners.CollectionRemove( this, watcher ) );
    watcher.addListener( Collection.Events.Removes, Listeners.CollectionRemoves( this, watcher ) );
    watcher.addListener( Collection.Events.Cleared, Listeners.CollectionCleared( this, watcher ) );

    this.trigger( Session.Events.Watch, [this, collection, watcher] );

    return watcher;
  },

  unwatch: function(object)
  {
    if ( object )
    {
      var watcher = this.getSessionWatch( object );

      if ( watcher )
      {
        if ( this.isDestroyable( object ) )
        {
          watcher.destroy();
        }
        else
        {
          watcher.resetSave();
          watcher.moveTo( this.unwatched );
        }

        this.trigger( Session.Events.Unwatch, [this, object, watcher] );
      }
    }
  },

  saveModel: function(model, cascade)
  {
    // Search in either watching or unwatched. An unwatched model is one that
    // could have recently been reunlated from another model and might need
    // it's foreign key saved.
    var watcher = this.getAnyWatch( model );

    if ( watcher )
    {
      watcher.addCascade( cascade );

      if ( !watcher.save )
      {
        var key = model.$key();
        var db = model.$db;

        if ( db.models.has( key ) )
        {
          db.trigger( Database.Events.ModelUpdated, [model] );

          model.$trigger( Model.Events.UpdateAndSave );
        }
        else
        {
          db.models.put( key, model );
          db.trigger( Database.Events.ModelAdded, [model] );
          db.updated();

          model.$trigger( Model.Events.CreateAndSave );
        }

        watcher.save = true;
      }
    }
  },

  removeModel: function(model, cascade)
  {
    // Search in either watching or unwatched. An unwatched model is one that
    // could have recently been unrelated from another model.
    var watcher = this.getAnyWatch( model );

    if ( watcher )
    {
      if ( this.isDestroyable( model ) )
      {
        watcher.destroy();
      }
      else
      {
        watcher.resetSave();
        watcher.addCascade( cascade );
        watcher.moveTo( this.removing );

        model.$status = Model.Status.RemovePending;
        model.$db.removeFromModels( model );
      }
    }
    else
    {
      var removed = this.getRemoveWatch( model );

      if ( removed )
      {
        removed.addCascade( cascade );
      }
    }
  },

  isDestroyable: function(object)
  {
    return object instanceof Model && !object.$isSaved();
  },

  resync: function(model)
  {
    model.$status = Model.Status.Synced;
    model.$db.models.put( model.$key(), model );
  }

});

addEventful( Session.prototype );

addEventFunction( Session.prototype, 'change', Session.Events.Changes );


function SessionWatch( key, object )
{
  this.key = key;
  this.object = object;
  this.state = null;
  this.relations = false;
  this.parent = false;
  this.children = {};
  this.offs = [];
  this.save = false;
  this.cascade = undefined;
  this.state = null;
}

addMethods( SessionWatch.prototype,
{

  setRelations: function(relations)
  {
    if ( isObject( relations ) )
    {
      if ( this.relations && !equals( this.relations, relations ) )
      {
        throw 'Changing already watched relations is not allowed.';
      }

      this.relations = relations;
    }
  },

  setSession: function(session)
  {
    var object = this.object;
    var objectSession = object.$session;

    if ( objectSession && objectSession !== session && !objectSession.isDestroyed() )
    {
      throw 'An object can only be watched by one live session at a time.';
    }

    object.$session = session;
  },

  setParent: function(parent)
  {
    this.parent = parent;

    if ( parent )
    {
      parent.children[ this.key ] = this;
    }
  },

  addListener: function(eventName, listener)
  {
    var object = this.object;
    var off = noop;

    if ( object.$on )
    {
      off = object.$on( eventName, listener );
    }
    else if ( object.on )
    {
      off = object.on( eventName, listener );
    }

    this.offs.push( off );
  },

  addCascade: function(cascade)
  {
    if ( isNumber( cascade ) )
    {
      if ( this.cascade === undefined )
      {
        this.cascade = 0;
      }

      this.cascade = this.cascade | cascade;
    }
  },

  resetSave: function()
  {
    this.save = false;
    this.cascade = undefined;
  },

  saveState: function(override)
  {
    if ( this.state && !override )
    {
      return;
    }

    var model = this.object;
    var oldState = model.$savedState;

    model.$push();

    var relations = this.relations;
    var state = model.$savedState;

    if ( isObject( relations ) )
    {
      for (var relationName in relations)
      {
        var value = model[ relationName ];

        if ( value instanceof Model )
        {
          state[ relationName ] = value.$key();
        }
        else if ( value instanceof ModelCollection )
        {
          state[ relationName ] = value.pluck( keyParser );
        }
        else
        {
          state[ relationName ] = null;
        }
      }
    }

    this.state = state;

    model.$savedState = oldState;
  },

  restoreState: function()
  {
    var model = this.object;
    var state = this.state;

    if ( isObject( state ) )
    {
      var relations = model.$db.relations;
      var relationsWatched = this.relations;
      var relationsSnapshot = {};

      for (var relationName in relationsWatched)
      {
        var relation = relations[ relationName ];

        relationsSnapshot[ relationName ] = {
          clearKey: relation.clearKey,
          cascadeRemove: relation.cascadeRemove,
          cascade: relation.cascade
        };

        relation.clearKey = false;
        relation.cascadeRemove = Cascade.None;
        relation.cascade = Cascade.None;
      }

      model.$set( state, undefined, true, true );
      model.$decode();

      for (var relationName in relationsWatched)
      {
        var relation = relations[ relationName ];
        var snapshot = relationsSnapshot[ relationName ];

        relation.clearKey = snapshot.clearKey;
        relation.cascadeRemove = snapshot.cascadeRemove;
        relation.cascade = snapshot.cascade;
      }
    }
  },

  removeListeners: function()
  {
    var offs = this.offs;

    for (var i = 0; i < offs.length; i++)
    {
      offs[ i ]();
    }

    offs.length = 0;
  },

  moveTo: function(target)
  {
    var session = this.object.$session;

    this.removeListeners();
    this.moveChildren( target );

    if ( this.parent )
    {
      delete this.parent.children[ this.key ];
    }

    session.watching.remove( this.key );
    session.unwatched.remove( this.key );
    session.removing.remove( this.key );

    target.put( this.key, this );
  },

  reattach: function()
  {
    var session = this.object.$session;

    session.removing.remove( this.key );
    session.unwatched.remove( this.key );
    session.watching.put( this.key, this );

    session.watch( this.object, this.relations, this.parent );
  },

  destroy: function()
  {
    var children = this.children;

    this.children = {};
    this.removeListeners();
    this.destroyReferences();

    for (var childKey in children)
    {
      children[ childKey ].destroy();
    }
  },

  destroyReferences: function()
  {
    var session = this.object.$session;

    session.watching.remove( this.key );
    session.removing.remove( this.key );
    session.unwatched.remove( this.key );

    this.object.$session = null;
    this.state = null;

    this.parent = null;
    this.save = false;
    this.cascade = undefined;
  },

  moveChildren: function(target)
  {
    var children = this.children;

    for (var childKey in children)
    {
      children[ childKey ].moveTo( target );
    }
  }

});


function searchAny(map, defaultResult, callback, context)
{
  var watchers = map.values;

  for (var i = watchers.length - 1; i >= 0; i--)
  {
    var watcher = watchers[ i ];
    var result = callback.call( context, watcher.object, watcher );

    if ( result !== undefined )
    {
      return result;
    }
  }

  return defaultResult;
}

function searchModels(map, defaultResult, callback, context)
{
  var watchers = map.values;

  for (var i = watchers.length - 1; i >= 0; i--)
  {
    var watcher = watchers[ i ];

    if ( watcher.object instanceof Model )
    {
      var result = callback.call( context, watcher.object, watcher );

      if ( result !== undefined )
      {
        return result;
      }
    }
  }

  return defaultResult;
}


  Rekord.Session = Session;
  Rekord.SessionWatch = SessionWatch;
  Rekord.SessionListeners = Listeners;

})(this, this.Rekord);
