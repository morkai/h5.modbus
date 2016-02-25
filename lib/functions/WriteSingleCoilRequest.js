'use strict';

var util = require('./util');
var Request = require('./Request');
var WriteSingleCoilResponse = require('./WriteSingleCoilResponse');

module.exports = WriteSingleCoilRequest;

/**
 * The write single coil request (code 0x05).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an output address (2 bytes),
 *   - an output value (2 bytes).
 *
 * An output value of 0xFF00 requests the output to be ON.
 * A value of 0x0000 requests it to be OFF.
 *
 * @constructor
 * @extends {Request}
 * @param {number} address An output address. A number between 0 and 0xFFFF.
 * @param {boolean} state A state of the coil. `TRUE` - coil is ON;
 * `FALSE` - coil is OFF.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 */
function WriteSingleCoilRequest(address, state)
{
  Request.call(this, 0x05);

  /**
   * An output address. A number between 0 and 0xFFFF.
   *
   * @private
   * @type {number}
   */
  this.address = util.prepareAddress(address);

  /**
   * A state of the coil. `TRUE` - coil is ON; `FALSE` - coil is OFF.
   *
   * @private
   * @type {boolean}
   */
  this.state = !!state;
}

util.inherits(WriteSingleCoilRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, optional) -
 *     An output address. If specified, must be a number between 0 and 0xFFFF.
 *     Defaults to 0.
 *
 *   - `state` (boolean, optional) -
 *     A state of the coil. `TRUE` - coil is ON; `FALSE` - coil is OFF.
 *     Defaults to `FALSE`.
 *
 * @param {object} options An options object.
 * @param {number} [options.address]
 * @param {boolean} [options.state]
 * @returns {WriteSingleCoilRequest} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteSingleCoilRequest.fromOptions = function(options)
{
  return new WriteSingleCoilRequest(options.address, options.state);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteSingleCoilRequest} A request created from
 * its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteSingleCoilRequest.fromBuffer = function(buffer)
{
  util.assertFunctionCode(buffer[0], 0x05);

  return new WriteSingleCoilRequest(
    buffer.readUInt16BE(1),
    buffer.readUInt16BE(3) === 0xFF00
  );
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteSingleCoilRequest.prototype.toBuffer = function()
{
  var buffer = new Buffer(5);

  buffer[0] = 0x05;
  buffer.writeUInt16BE(this.address, 1, true);
  buffer.writeUInt16BE(this.state ? 0xFF00 : 0x0000, 3, true);

  return buffer;
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteSingleCoilRequest.prototype.toString = function()
{
  return util.format(
    "0x05 (REQ) Set the coil at address %d to be %s",
    this.address,
    this.state ? 'ON' : 'OFF'
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteSingleCoilRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteSingleCoilResponse
  );
};

/**
 * @returns {number} An output address.
 */
WriteSingleCoilRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {boolean} A state of the coil.
 */
WriteSingleCoilRequest.prototype.getState = function()
{
  return this.state;
};
