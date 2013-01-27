
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
 * @return {h5.modbus.ModbusFunction}
 * @throws {Error}
 */
ModbusFunction.fromOptions = function(options)
{
  throw new Error("Cannot call an abstract static method!");
};

/**
 * @param {Buffer} buffer
 * @return {h5.modbus.ModbusFunction}
 * @throws {Error}
 */
ModbusFunction.fromBuffer = function(buffer)
{
  throw new Error("Cannot call an abstract static method!");
};

/**
 * @return {Buffer}
 */
ModbusFunction.prototype.toBuffer = function()
{
  throw new Error("Abstract method must be overridden by the child class!");
};

/**
 * @return {string}
 */
ModbusFunction.prototype.toString = function()
{
  throw new Error("Abstract method must be overridden by the child class!");
};

/**
 * @return {number}
 */
ModbusFunction.prototype.getCode = function()
{
  return this.code;
};
