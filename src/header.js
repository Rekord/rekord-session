// UMD (Universal Module Definition)
(function (root, factory)
{
  if (typeof define === 'function' && define.amd) // jshint ignore:line
  {
    // AMD. Register as an anonymous module.
    define(['rekord'], function(Rekord) { // jshint ignore:line
      return factory(root, Rekord);
    });
  }
  else if (typeof module === 'object' && module.exports)  // jshint ignore:line
  {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(global, require('rekord'));  // jshint ignore:line
  }
  else
  {
    // Browser globals (root is window)
    root.Rekord = factory(root, root.Rekord);
  }
}(this, function(global, Rekord, undefined)
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
