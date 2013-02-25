'use strict';

var util = require('./util');
var Request = require('./Request');
var ReadCoilsResponse = require('./ReadCoilsResponse');

module.exports = ReadCoilsRequest;

/**
 * The read coils request (code 0x01).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of coils (2 bytes).
 *
 * @name h5.modbus.functions.ReadCoilsRequest
 * @constructor
 * @extends {h5.modbus.functions.Request}
 * @param {number} address A starting address. Must be between 0 and 0xFFFF.
 * @param {number} quantity A quantity of coils. Must be between 1 and 2000.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 2000.
 */
function ReadCoilsRequest(address, quantity)
{
  Request.call(this, 0x01);

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of coils. A number between 1 and 2000.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 2000);
}

util.inherits(ReadCoilsRequest, Request);

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
 *     A quantity of coils. If specified, must be a number between 1 and 2000.
 *     Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number=} options.address
 * @param {number=} options.quantity
 * @return {h5.modbus.functions.ReadCoilsRequest} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadCoilsRequest.fromOptions = function(options)
{
  return new ReadCoilsRequest(options.address, options.quantity);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the request.
 * @return {h5.modbus.functions.ReadCoilsRequest} A request created from
 * its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadCoilsRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x01);

  return new ReadCoilsRequest(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @return {Buffer} A binary representation of this request.
 */
ReadCoilsRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x01;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @return {string} A string representation of this request.
 */
ReadCoilsRequest.prototype.toString = function()
{
  return util.format(
    "0x01 (REQ) Read %d coils starting from address %d",
    this.quantity,
    this.address
  );
};

/**
 * @param {Buffer} responseBuffer
 * @return {h5.modbus.functions.Response}
 * @throws {Error}
 */
ReadCoilsRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(responseBuffer, ReadCoilsResponse);
};

/**
 * @return {number} A starting address.
 */
ReadCoilsRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @return {number} A quantity of coils.
 */
ReadCoilsRequest.prototype.getQuantity = function()
{
  return this.quantity;
};
