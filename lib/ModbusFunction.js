/*jshint unused:false*/

'use strict';

module.exports = ModbusFunction;

/**
 * @name h5.modbus.ModbusFunction
 * @constructor
 * @param {number} code
 */
function ModbusFunction(code)
{
  /**
   * @private
   * @type {number}
   */
  this.code = code;
}

/**
 * @param {object} options
 * @returns {h5.modbus.ModbusFunction}
 * @throws {Error}
 */
ModbusFunction.fromOptions = function(options)
{
  throw new Error("Cannot call an abstract static method!");
};

/**
 * @param {Buffer} buffer
 * @returns {h5.modbus.ModbusFunction}
 * @throws {Error}
 */
ModbusFunction.fromBuffer = function(buffer)
{
  throw new Error("Cannot call an abstract static method!");
};

/**
 * @returns {Buffer}
 */
ModbusFunction.prototype.toBuffer = function()
{
  throw new Error("Abstract method must be overridden by the child class!");
};

/**
 * @returns {string}
 */
ModbusFunction.prototype.toString = function()
{
  throw new Error("Abstract method must be overridden by the child class!");
};

/**
 * @returns {number}
 */
ModbusFunction.prototype.getCode = function()
{
  return this.code;
};
