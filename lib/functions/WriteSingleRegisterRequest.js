var util = require('./util');
var Request = require('./Request');
var WriteSingleRegisterResponse = require('./WriteSingleRegisterResponse');

module.exports = WriteSingleRegisterRequest;

/**
 * The write single register request (code 0x06).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a register address (2 bytes),
 *   - a register value (2 bytes).
 *
 * @name h5.modbus.functions.WriteSingleRegisterRequest
 * @constructor
 * @extends {h5.modbus.functions.Request}
 * @param {number} address A register address. A number between 0 and 0xFFFF.
 * @param {number} value A value of the register. A number between 0 and 65535.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `value` is not a number between 0 and 65535.
 */
function WriteSingleRegisterRequest(address, value)
{
  Request.call(this, 0x06);

  /**
   * A register address. A number between 0 and 0xFFFF.
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

util.inherits(WriteSingleRegisterRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     A register address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `value` (number, optional) -
 *     A value of the register. If specified, must be a number between 0 and 65535.
 *     Defaults to 0.
 *
 * @param {object} options An options object.
 * @param {number=} options.address
 * @param {number=} options.value
 * @return {h5.modbus.functions.WriteSingleRegisterRequest} A response created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteSingleRegisterRequest.fromOptions = function(options)
{
  return new WriteSingleRegisterRequest(options.address, options.value);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @return {h5.modbus.functions.WriteSingleRegisterRequest} A request created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation of this request.
 */
WriteSingleRegisterRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x06);

  return new WriteSingleRegisterRequest(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @return {Buffer} A binary representation of this request.
 */
WriteSingleRegisterRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x06;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.value, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @return {string} A string representation of this request.
 */
WriteSingleRegisterRequest.prototype.toString = function()
{
  return util.format(
    "0x06 (REQ) Set the register at address %d to: %d",
    this.address,
    this.value
  );
};

/**
 * @param {Buffer} responseBuffer
 * @return {h5.modbus.functions.Response}
 * @throws {Error}
 */
WriteSingleRegisterRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteSingleRegisterResponse
  );
};

/**
 * @return {number} A register address.
 */
WriteSingleRegisterRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @return {number} A value of the register.
 */
WriteSingleRegisterRequest.prototype.getValue = function()
{
  return this.value;
};
