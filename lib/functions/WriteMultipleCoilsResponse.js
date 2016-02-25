'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteMultipleCoilsResponse;

/**
 * The write multiple coils response (code 0x0F).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of outputs set (2 bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {number} address A starting address.
 * Must be between 0x0000 and 0xFFFF.
 * @param {number} quantity A quantity of outputs set.
 * Must be between 1 and 1968.
 * @throws {Error} If the `address` is not a number between 0x0000 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 1968.
 */
function WriteMultipleCoilsResponse(address, quantity)
{
  Response.call(this, 0x0F);

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of outputs written. A number between 1 and 1968.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 1968);
}

util.inherits(WriteMultipleCoilsResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     A starting address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `quantity` (number, optional) -
 *     A quantity of coils set.
 *     If specified, must be a number between 1 and 1968.
 *     Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {number} [options.quantity]
 * @returns {WriteMultipleCoilsResponse} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMultipleCoilsResponse.fromOptions = function(options)
{
  return new WriteMultipleCoilsResponse(options.address, options.quantity);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {WriteMultipleCoilsResponse} A response created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
WriteMultipleCoilsResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x0F);

  var address = buffer.readUInt16BE(1, true);
  var quantity = buffer.readUInt16BE(3, true);

  return new WriteMultipleCoilsResponse(address, quantity);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
WriteMultipleCoilsResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x0F;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteMultipleCoilsResponse.prototype.toString = function()
{
  return util.format(
    "0x0F (RES) %d coils starting from address %d were set",
    this.quantity,
    this.address
  );
};

/**
 * @returns {number} A starting address.
 */
WriteMultipleCoilsResponse.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A quantity of outputs written.
 */
WriteMultipleCoilsResponse.prototype.getQuantity = function()
{
  return this.quantity;
};
