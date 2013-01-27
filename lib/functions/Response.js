var inherits = require('util').inherits;
var ModbusFunction = require('../ModbusFunction');

module.exports = Response;

/**
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
 * @return {boolean}
 */
Response.prototype.isException = function()
{
  return this.getCode() > 0x80;
};
