var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = WriteMultipleRegistersResponse;

/**
 * The write multiple registers response (code 0x10).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers written (2 bytes).
 *
 * @name h5.modbus.functions.WriteMultipleRegistersResponse
 * @constructor
 * @extends {h5.modbus.functions.Response}
 * @param {number} address A starting address. A number between 0 and 0xFFFF.
 * @param {number} quantity A quantity of registers written. A number between 1 and 123.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 123.
 */
function WriteMultipleRegistersResponse(address, quantity)
{
  Response.call(this, 0x10);

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of registers written. A number between 1 and 123.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 123);
}

util.inherits(WriteMultipleRegistersResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `address` (number, optional) -
 *     A starting address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `quantity` (number, optional) -
 *     A quantity of registers written. If specified, must be a number between 1 and 123.
 *     Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number=} options.address
 * @param {number=} options.quantity
 * @return {h5.modbus.functions.WriteMultipleRegistersResponse} A response created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMultipleRegistersResponse.fromOptions = function(options)
{
  return new WriteMultipleRegistersResponse(options.address, options.quantity);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @return {h5.modbus.functions.WriteMultipleRegistersResponse} Read input registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation of the read input registers response.
 */
WriteMultipleRegistersResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x10);

  return new WriteMultipleRegistersResponse(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of the read input registers response.
 *
 * @return {Buffer} A binary representation of the response.
 */
WriteMultipleRegistersResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x10;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @return {string} A string representation of this response.
 */
WriteMultipleRegistersResponse.prototype.toString = function()
{
  return util.format(
    "0x10 (RES) %d registers starting from address %d were written",
    this.quantity,
    this.address
  );
};

/**
 * @return {number} A starting address.
 */
WriteMultipleRegistersResponse.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @return {number} A quantity of registers written.
 */
WriteMultipleRegistersResponse.prototype.getQuantity = function()
{
  return this.quantity;
};
