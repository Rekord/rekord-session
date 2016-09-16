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

  var isObject = Rekord.isObject;
  var uuid = Rekord.uuid;
  var equals = Rekord.equals;
  var noop = Rekord.noop;

  var addMethods = Rekord.addMethods;
  var replaceMethod = Rekord.replaceMethod;
