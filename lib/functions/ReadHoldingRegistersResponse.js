'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadHoldingRegistersResponse;

/**
 * The read holding registers response (code 0x03).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `N` (1 byte),
 *   - values of the registers (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Buffer} values Values of the registers.
 * A buffer of even length between 2 and 250.
 * @throws {Error} If the length of the `values` buffer is not
 * between 2 and 250.
 */
function ReadHoldingRegistersResponse(values)
{
  Response.call(this, 0x03);

  if (values.length % 2 !== 0 || values.length < 2 || values.length > 250)
  {
    throw new Error(util.format(
      "The length of the `values` buffer must be an even number "
        + "between 2 and 250, got: %d",
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

util.inherits(ReadHoldingRegistersResponse, Response);

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
 * @param {Buffer} options.values
 * @returns {ReadHoldingRegistersResponse} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadHoldingRegistersResponse.fromOptions = function(options)
{
  return new ReadHoldingRegistersResponse(options.values);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadHoldingRegistersResponse} A response
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read holding registers response.
 */
ReadHoldingRegistersResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 4);
  util.assertFunctionCode(buffer[0], 0x03);

  var byteCount = buffer[1];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 2, byteCount + 2);

  return new ReadHoldingRegistersResponse(values);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadHoldingRegistersResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x03)
    .pushByte(this.values.length)
    .pushBuffer(this.values)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadHoldingRegistersResponse.prototype.toString = function()
{
  return util.format(
    "0x03 (RES) %d holding registers:",
    this.values.length / 2,
    this.values
  );
};

/**
 * @returns {Buffer} Values of the registers.
 */
ReadHoldingRegistersResponse.prototype.getValues = function()
{
  return this.values;
};

/**
 * @returns {number} A number of the register values.
 */
ReadHoldingRegistersResponse.prototype.getCount = function()
{
  return this.values.length / 2;
};
