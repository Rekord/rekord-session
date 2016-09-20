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
