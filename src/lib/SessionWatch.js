
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
