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
