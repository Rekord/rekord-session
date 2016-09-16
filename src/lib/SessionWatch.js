
function SessionWatch( key, object )
{
  this.key = key;
  this.object = object;
  this.relations = false;
  this.parent = false;
  this.children = {};
  this.offs = [];
  this.save = false;
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

  destroy: function(session)
  {
    var offs = this.offs;
    var object = this.object;

    for (var i = 0; i < offs.length; i++)
    {
      offs[ i ]();
    }

    session.watching.remove( this.key );

    this.destroyChildren( session );

    object.$session = null;

    this.parent = null;
    this.offs.length = 0;
    this.save = false;
  },

  destroyChildren: function(session)
  {
    var children = this.children;

    for (var childKey in children)
    {
      children[ childKey ].destroy( session );
    }

    this.children = {};
  }

});
