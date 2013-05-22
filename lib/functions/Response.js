'use strict';

var inherits = require('util').inherits;
var ModbusFunction = require('../ModbusFunction');

module.exports = Response;

/**
 * @name h5.modbus.Response
 * @constructor
 * @extends {h5.modbus.ModbusFunction}
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
