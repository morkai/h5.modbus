'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var WriteMultipleCoilsResponse = require('./WriteMultipleCoilsResponse');

module.exports = WriteMultipleCoilsRequest;

/**
 * The write multiple coils request (code 0x0F).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of outputs (2 bytes),
 *   - a byte count (`N`; 1 byte),
 *   - states of the coils (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {number} address A starting address. A number between 0 and 0xFFFF.
 * @param {Array.<boolean>} states States of the coils. An array of 1 and 1968
 * truthy or falsy values.
 * @throws {Error} If the `address` is not a number between 0 and 0xFFFF.
 * @throws {Error} If the `states` is not an array of length between 1 and 1968.
 */
function WriteMultipleCoilsRequest(address, states)
{
  Request.call(this, 0x0F);

  if (states.length < 1 || states.length > 1968)
  {
    throw new Error(util.format(
      "The length of the statuses array must be between 1 and 1968, got: %d",
      states.length
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
   * States of the coils. An array of 1 and 1968 truthy or falsy values.
   *
   * @private
   * @type {Array.<boolean>}
   */
  this.states = states;
}

util.inherits(WriteMultipleCoilsRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `address` (number, required) -
 *     A starting address. Must be a number between 0 and 0xFFFF.
 *
 *   - `states` (array, required) -
 *     States of the coils. Must be an array of 1 to 1968
 *     truthy or falsy values.
 *
 * @param {object} options An options object.
 * @param {number} options.address
 * @param {Array.<boolean>} options.states
 * @returns {WriteMultipleCoilsRequest} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteMultipleCoilsRequest.fromOptions = function(options)
{
  return new WriteMultipleCoilsRequest(options.address, options.states);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteMultipleCoilsRequest} A request created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteMultipleCoilsRequest.fromBuffer = function(buffer)
{
  var reader = new buffers.BufferReader(buffer);

  util.assertFunctionCode(reader.shiftByte(), 0x0F);

  var address = reader.shiftUInt16();
  var quantity = reader.shiftUInt16();

  reader.skip(1);

  var states = reader.shiftBits(quantity);

  return new WriteMultipleCoilsRequest(address, states);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteMultipleCoilsRequest.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x0F)
    .pushUInt16(this.address)
    .pushUInt16(this.states.length)
    .pushByte(Math.ceil(this.states.length / 8))
    .pushBits(this.states)
    .toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteMultipleCoilsRequest.prototype.toString = function()
{
  return util.format(
    "0x0F (REQ) Set %d coils starting from address %d to:",
    this.states.length,
    this.address,
    this.states.map(Number)
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteMultipleCoilsRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteMultipleCoilsResponse
  );
};

/**
 * @returns {number} A starting address.
 */
WriteMultipleCoilsRequest.prototype.getAddress = function()
{
  return this.address;
};

/**
 * @returns {Array.<boolean>} States of the coils.
 */
WriteMultipleCoilsRequest.prototype.getStates = function()
{
  return this.states;
};
