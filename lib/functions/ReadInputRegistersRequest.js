'use strict';

var util = require('./util');
var Request = require('./Request');
var ReadInputRegistersResponse = require('./ReadInputRegistersResponse');

module.exports = ReadInputRegistersRequest;

/**
 * The read input registers request (code 0x04).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers (2 bytes).
 *
 * @name h5.modbus.functions.ReadInputRegistersRequest
 * @constructor
 * @extends {h5.modbus.functions.Request}
 * @param {number} address A starting address.
 * Must be between 0x0000 and 0xFFFF.
 * @param {number} quantity A quantity of input registers.
 * Must be between 1 and 125.
 * @throws {Error} If the `address` is not a number between 0x0000 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 125.
 */
function ReadInputRegistersRequest(address, quantity)
{
  Request.call(this, 0x04);

  /**
   * A starting address. A number between 0x0000 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of input registers. A number between 1 and 125.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 125);
}

util.inherits(ReadInputRegistersRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     A starting address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `quantity` (number, optional) -
 *     A quantity of inputs. If specified, must be a number between 1 and 125.
 *     Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number=} options.address
 * @param {number=} options.quantity
 * @returns {h5.modbus.functions.ReadInputRegistersRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadInputRegistersRequest.fromOptions = function(options)
{
  return new ReadInputRegistersRequest(options.address, options.quantity);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {h5.modbus.functions.ReadInputRegistersRequest} A request created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadInputRegistersRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x04);

  return new ReadInputRegistersRequest(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadInputRegistersRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x04;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadInputRegistersRequest.prototype.toString = function()
{
  return util.format(
    "0x04 (REQ) Read %d input registers starting from address %d",
    this.quantity,
    this.address
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {h5.modbus.functions.Response}
 * @throws {Error}
 */
ReadInputRegistersRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadInputRegistersResponse
  );
};

/**
 * @returns {number} A starting address.
 */
ReadInputRegistersRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A quantity of input registers.
 */
ReadInputRegistersRequest.prototype.getQuantity = function()
{
  return this.quantity;
};
