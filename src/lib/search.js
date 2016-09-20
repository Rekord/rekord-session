
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
