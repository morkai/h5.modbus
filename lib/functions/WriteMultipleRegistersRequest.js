'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteMultipleRegistersResponse =
  require('./WriteMultipleRegistersResponse');

module.exports = WriteMultipleRegistersRequest;

/**
 * The write multiple registers request (code 0x10).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers (2 bytes),
 *   - a byte count (`N`; 1 byte),
 *   - values of the registers (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} address A starting address. A number between 0 and 0xFFFF.
 * @param {Buffer} values Values of the registers.
 * A buffer of even length between 2 and 246.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `values` is not a Buffer of even length
 * between 2 and 246.
 */
function WriteMultipleRegistersRequest(address, values)
{
  Request.call(this, 0x10);

  if (values.length % 2 !== 0 || values.length < 2 || values.length > 246)
  {
    throw new Error(util.format(
      "The length of the `values` Buffer must be an even number "
        + "between 2 and 246, got: %d",
      values.length
    ));
  }

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * Values of the registers. A buffer of even length between 2 and 256.
   *
   * @private
   * @type {Buffer}
   */
  this.values = values;
}

util.inherits(WriteMultipleRegistersRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     A starting address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `values` (Buffer, required) -
 *     Values of the registers. Must be a buffer of even length
 *     between 2 and 246.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {Buffer} options.values
 * @returns {WriteMultipleRegistersRequest} A response
 * created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMultipleRegistersRequest.fromOptions = function(options)
{
  return new WriteMultipleRegistersRequest(options.address, options.values);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteMultipleRegistersRequest} A request
 * created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteMultipleRegistersRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 8);
  util.assertFunctionCode(buffer[0], 0x10);

  var address = buffer.readUInt16BE(1, true);
  var byteCount = buffer[5];
  var values = new Buffer(byteCount);

  buffer.copy(values, 0, 6, 6 + byteCount);

  return new WriteMultipleRegistersRequest(address, values);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteMultipleRegistersRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(6 + this.values.length);

  buffer[0] = 0x10;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.values.length / 2, 3, true);
  buffer[4] = this.values.length;
  this.values.copy(buffer, 5);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteMultipleRegistersRequest.prototype.toString = function()
{
  return util.format(
    "0x10 (REQ) Set %d registers starting from address %d to:",
    this.values.length / 2,
    this.address,
    this.values
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteMultipleRegistersRequest.prototype.createResponse =
  function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteMultipleRegistersResponse
  );
};

/**
 * @returns {number} A starting address.
 */
WriteMultipleRegistersRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {Buffer} Values of the registers
 */
WriteMultipleRegistersRequest.prototype.getValues = function()
{
  return this.values;
};
