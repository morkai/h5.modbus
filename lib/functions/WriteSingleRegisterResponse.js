'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = WriteSingleRegisterResponse;

/**
 * The write single register response (code 0x06).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an output address (2 bytes),
 *   - a register value (2 bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {number} address An address of the register.
 * Must be between 0x0000 and 0xFFFF.
 * @param {number} value A value of the register. Must be between 0 and 65535.
 * @throws {Error} If the `address` is not a number between 0x0000 and 0xFFFF.
 * @throws {Error} If the `value` is not a number between 0 and 65535.
 */
function WriteSingleRegisterResponse(address, value)
{
  Response.call(this, 0x06);

  /**
   * An address of the register. A number between 0x0000 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A value of the register. A number between 0 and 65535.
   *
   * @private
   * @type {number}
   */
  this.value = util.prepareRegisterValue(value);
}

util.inherits(WriteSingleRegisterResponse, Response);

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {WriteSingleRegisterResponse} A response created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
WriteSingleRegisterResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x06);

  var address = buffer.readUInt16BE(1, true);
  var value = buffer.readUInt16BE(3, true);

  return new WriteSingleRegisterResponse(address, value);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
WriteSingleRegisterResponse.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x06;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.value, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteSingleRegisterResponse.prototype.toString = function()
{
  return util.format(
    "0x06 (RES) Register at address %d was set to: %d",
    this.address,
    this.value
  );
};

/**
 * @returns {number} An address of the register.
 */
WriteSingleRegisterResponse.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {number} A value of the register.
 */
WriteSingleRegisterResponse.prototype.getState = function()
{
  return this.value;
};

