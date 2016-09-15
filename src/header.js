(function(global, Rekord, undefined)
{
  var Model = Rekord.Model;
  var Database = Rekord.Database;
  var Promise = Rekord.Promise;
  var Collection = Rekord.Collection;
  var ModelCollection = Rekord.ModelCollection;

  var isEmpty = Rekord.isEmpty;
  var isString = Rekord.isString;
  var isArray = Rekord.isArray;
  var isObject = Rekord.isObject;
  var isFunction = Rekord.isFunction;
  var isDate = Rekord.isDate;
  var isNumber = Rekord.isNumber;
  var isBoolean = Rekord.isBoolean;
  var isValue = Rekord.isValue;
  var isPrimitiveArray = Rekord.isPrimitiveArray;
  var isRegExp = Rekord.isRegExp;
  var isRekord = Rekord.isRekord;

  var noop = Rekord.noop;
  var equalsCompare = Rekord.equalsCompare;
  var equals = Rekord.equals;
  var indexOf = Rekord.indexOf;
  var sizeof = Rekord.sizeof;

  var split = Rekord.split;
  var transfer = Rekord.transfer;
  var format = Rekord.format;

  var parseDate = Rekord.parseDate;

  var addMethod = Rekord.addMethod;
  var addMethods = Rekord.addMethods;
  var replaceMethod = Rekord.replaceMethod;
