var Listeners = {

  RelationUpdate: function(session, watcher, parent, related, property)
  {
    return function(relator, relation)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      if ( session.isWatching( relation.lastRelated ) && !session.isWatching( session.related ) )
      {
        session.unwatch( relation.lastRelated );
        session.watch( session.related, watcher.relations[ property ], watcher );
      }
    };
  },

  CollectionAdd: function(session, watcher)
  {
    return function (collection, added)
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
    return function (collection, added)
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
    return function (collection, removed)
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
    return function (collection, removed)
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
    return function (collection)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      watcher.destroyChildren();

      for (var i = 0; i < collection.length; i++)
      {
        session.watch( collection[ i ], watcher.relations, watcher );
      }
    };
  },

  CollectionCleared: function(session, watcher)
  {
    return function (collection)
    {
      if ( session.isDestroyed() )
      {
        return;
      }

      watcher.destroyChildren();
    };
  }

};
