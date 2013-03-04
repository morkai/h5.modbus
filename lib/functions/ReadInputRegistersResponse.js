'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadInputRegistersResponse;

/**
 * The read input registers response (code 0x04).
 *
 * A binary representation this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count (`N`; 1 byte),
 *   - values of the registers (`N` bytes).
 *
 * @name h5.modbus.functions.ReadInputRegistersResponse
 * @constructor
 * @extends {h5.modbus.functions.Response}
 * @param {Buffer} values Values of the registers. A buffer of even length
 * between 2 and 250.
 * @throws {Error} If the `values` is not a Buffer of even length
 * between 2 and 250.
 */
function ReadInputRegistersResponse(values)
{
  Response.call(this, 0x03);

  if (values.length % 2 !== 0 || values.length < 1 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` Buffer must be an even number " +
        "between 2 and 250, got '%d'",
      values.length
    ));
  }

  /**
   * Values of the registers. A buffer of even length between 2 and 250.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(ReadInputRegistersResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of even length
 *     between 2 and 250.
 *
 * @param {object} options An options object.
 * @returns {h5.modbus.functions.ReadInputRegistersResponse} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadInputRegistersResponse.fromOptions = function(options)
{
  return new ReadInputRegistersResponse(options.values);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {h5.modbus.functions.ReadInputRegistersResponse} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
ReadInputRegistersResponse.fromBuffer = function(buffer)
{
  util.assertFunctionCode(buffer[0], 0x04);

  var byteCount = buffer[1];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 2, byteCount + 2);

  return new ReadInputRegistersResponse(values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadInputRegistersResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x04)
    .pushByte(this.values.length)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadInputRegistersResponse.prototype.toString = function()
{
  return util.format(
    "0x04 (RES) %d input registers:",
    this.values.length / 2,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the registers.
 */
ReadInputRegistersResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the register values.
 */
ReadInputRegistersResponse.prototype.getCount = function()
{
  return this.values.length / 2;
};
