


function Session()
{
  this.status = Session.Status.Active;
  this.watching = new Map();
  this.removing = new Map();
  this.unwatched = new Map();
  this.validationRequired = false;
}

Session.Status =
{
  Active: 'active',

  Saving: 'saving',

  Disabled: 'disabled',

  Destroyed: 'destroyed'
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

    var sessionPromise = new Promise();

    var savePromise = Promise.singularity( sessionPromise, this, this.handleSave );

    sessionPromise.resolve( this );

    savePromise.success( this.onSaveSuccess, this );

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
      // Add it back so $remove processes normally
      model.$status = Model.Status.Synced;
      model.$db.models.put( model.$key(), model );

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
      watcher.saveState( true );
      watcher.save = false;
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
    if ( watcher.save )
    {
      watcher.save = false;

      if ( !model.$isSaved() )
      {
        model.$db.removeFromModels( model );
      }
    }

    watcher.restoreState();

    model.$updated();
  },

  discardRemove: function(model, watcher)
  {
    if ( model.$status === Model.Status.RemovePending )
    {
      model.$status = Model.Status.Synced;
      model.$db.models.put( model.$key(), model );

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

      var removing = this.removing.values;

      for (var i = 0; i < removing.length; i++)
      {
        var remover = removing[ i ];

        remover.destroyReferences();
      }

      this.watching.reset();
      this.removing.reset();

      this.status = Session.Status.Destroyed;
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
    var watcher = null;

    if ( key )
    {
      watcher = this.watching.get( key );

      if ( !watcher )
      {
        watcher = this.unwatched.get( key );
      }
    }

    return watcher;
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

    return watcher;
  },

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

    return watcher;
  },

  unwatch: function(object)
  {
    if ( object )
    {
      var watcher = this.getSessionWatch( object );

      if ( watcher )
      {
        watcher.moveTo( this.unwatched );
      }
    }
  },

  saveModel: function(model, cascade)
  {
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
    var watcher = this.getAnyWatch( model );

    if ( watcher )
    {
      watcher.addCascade( cascade );
      watcher.moveTo( this.removing );

      model.$status = Model.Status.RemovePending;
      model.$db.removeFromModels( model );
    }
    else
    {
      var removed = this.getRemoveWatch( model );

      if ( removed )
      {
        removed.addCascade( cascade );
      }
    }
  }

});
