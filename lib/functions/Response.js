'use strict';

var inherits = require('util').inherits;
var ModbusFunction = require('../ModbusFunction');

module.exports = Response;

/**
 * @constructor
 * @extends {ModbusFunction}
 * @param {number} code
 */
function Response(code)
{
  ModbusFunction.call(this, code);
}

inherits(Response, ModbusFunction);

/**
 * @returns {boolean}
 */
Response.prototype.isException = function()
{
  return false;
};
