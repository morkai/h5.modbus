var util = require('./util');
var Request = require('./Request');
var ReadDiscreteInputsResponse = require('./ReadDiscreteInputsResponse');

module.exports = ReadDiscreteInputsRequest;

/**
 * The read discrete inputs request (code 0x02).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of inputs (2 bytes).
 *
 * @name h5.modbus.functions.ReadDiscreteInputsRequest
 * @constructor
 * @extends {h5.modbus.functions.Request}
 * @param {number} address A starting address. Must be between 0 and 0xFFFF.
 * @param {number} quantity A quantity of inputs. Must be between 1 and 2000.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `quantity` is not a number between 1 and 2000.
 */
function ReadDiscreteInputsRequest(address, quantity)
{
  Request.call(this, 0x02);

  /**
   * A starting address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A quantity of inputs. A number between 1 and 2000.
   *
   * @private
   * @type {number}
   */
  this.quantity = util.prepareQuantity(quantity, 2000);
}

util.inherits(ReadDiscreteInputsRequest, Request);

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
 *     A quantity of inputs. If specified, must be a number between 1 and 2000.
 *     Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {number=} options.address
 * @param {number=} options.quantity
 * @return {h5.modbus.functions.ReadDiscreteInputsRequest} A response created from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadDiscreteInputsRequest.fromOptions = function(options)
{
  return new ReadDiscreteInputsRequest(options.address, options.quantity);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @return {h5.modbus.functions.ReadDiscreteInputsRequest} A request created from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation of this request.
 */
ReadDiscreteInputsRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 5);
  util.assertFunctionCode(buffer[0], 0x02);

  return new ReadDiscreteInputsRequest(
    buffer.readUInt16BE(1, true),
    buffer.readUInt16BE(3, true)
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @return {Buffer} A binary representation of this request.
 */
ReadDiscreteInputsRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x02;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.quantity, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @return {string} A string representation of this request.
 */
ReadDiscreteInputsRequest.prototype.toString = function()
{
  return util.format(
    "0x02 (REQ) Read %d inputs starting from address %d",
    this.quantity,
    this.address
  );
};

/**
 * @param {Buffer} responseBuffer
 * @return {h5.modbus.functions.Response}
 * @throws {Error}
 */
ReadDiscreteInputsRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadDiscreteInputsResponse
  );
};

/**
 * @return {number} A starting address.
 */
ReadDiscreteInputsRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @return {number} A quantity of inputs.
 */
ReadDiscreteInputsRequest.prototype.getQuantity = function()
{
  return this.quantity;
};
