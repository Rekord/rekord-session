


function Session()
{
  this.status = Session.Status.Active;
  this.watching = new Map();
  this.removing = new Collection();
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
    if (this.removing.length > 0)
    {
      return true;
    }

    return this.searchModels( false, function(model, watcher)
    {
      if ( (!checkSavedOnly || watcher.save) && model.$hasChanges() )
      {
        return true;
      }
    });
  },

  getChanged: function(checkSavedOnly, out)
  {
    var target = out || new Collection();

    target.push.apply( target, this.removing );

    return this.searchModels( target, function(model, watcher)
    {
      if ( (!checkSavedOnly || watcher.save) && model.$hasChanges() )
      {
        target.push( model );
      }
    });
  },

  validate: function(stopAtInvalid)
  {
    var valid = true;

    if ( Rekord.Validation )
    {
      this.searchModels( true, function(model, watcher)
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

    return Promise.singularity( Promise.resolve( this ), this, this.handleSave );
  },

  handleSave: function()
  {
    this.status = Session.Status.Saving;

    this.searchModels( true, this.executeSave );

    this.removing.each( this.executeRemove, this );

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

      model.$save().success( this.afterSave( watcher, model) );
    }
  },

  executeRemove: function(model)
  {
    if ( model.$status === Model.Status.RemovePending )
    {
      // Add it back so $remove processes normally
      model.$status = Model.Status.Synced;
      model.$db.models.put( model.$key(), model );

      model.$remove().success( this.afterRemove( this, model ) );
    }
  },

  afterSave: function(watcher, model)
  {
    return function onSave()
    {
      model.$push();
      watcher.save = false;
    };
  },

  afterRemove: function(session, model)
  {
    return function onRemove()
    {
      session.removing.remove( model );
    };
  },

  discard: function()
  {
    this.searchModels( true, this.discardSave );

    this.removing.each( this.discardRemove );
    this.removing.clear();

    return this;
  },

  discardSave: function(model, watcher)
  {
    if ( watcher.save )
    {
      if ( !model.$isSaved() )
      {
        model.$db.removeFromModels( model );
      }
      else
      {
        model.$pop();
      }

      watcher.save = false;
    }
  },

  discardRemove: function(model)
  {
    if ( model.$status === Model.Status.RemovePending )
    {
      model.$pop();
      model.$status = Model.Status.Synced;
      model.$db.models.put( model.$key(), model );
      model.$updated();
    }
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

  searchModels: function(defaultResult, callback, context)
  {
    var callbackContext = context || this;
    var watches = this.watching.values;

    for (var i = 0; i < watches.length; i++)
    {
      var watcher = watches[ i ];

      if ( watcher.object instanceof Model )
      {
        var result = callback.call( callbackContext, watcher.object, watcher );

        if ( result !== undefined )
        {
          return result;
        }
      }
    }

    return defaultResult;
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
          watcher.destroy( this );
        }
      }

      this.watching.reset();
      this.removing.clear();

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
    else
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
        watch = new SessionWatch( key, object );

        this.watching.put( key, watch );
      }

      return watch;
    }
  },

  isWatching: function(object)
  {
    var key = this.getSessionKey( object );

    return key !== false && this.watching.has( key );
  },

  watch: function(model, relations, parent)
  {
    var watcher = this.getSessionWatch( model, true );

    watcher.setRelations( relations );
    watcher.setSession( this );
    watcher.setParent( parent );

    model.$push();

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
        watcher.destroy( this );
      }
    }
  },

  saveModel: function(model)
  {
    var watcher = this.getSessionWatch( model );

    if ( watcher && !watcher.save )
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
  },

  removeModel: function(model)
  {
    var watcher = this.getSessionWatch( model );

    if ( watcher )
    {
      model.$push();
      model.$status = Model.Status.RemovePending;
      model.$db.removeFromModels( model );

      this.removing.add( model );

      watcher.destroy( this );
    }
  }

});
