'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadCoilsResponse;

/**
 * The read coils response (code 0x01).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `N` (1 byte),
 *   - states of the coils (`N` bytes).
 *
 * @name h5.modbus.functions.ReadCoilsResponse
 * @constructor
 * @extends {h5.modbus.functions.Response}
 * @param {Array.<boolean>} states States of the coils.
 * An array of 1 to 2000 truthy or falsy elements.
 * @throws {Error} If the length of the `states` array is not
 * between 1 and 2000.
 */
function ReadCoilsResponse(states)
{
  Response.call(this, 0x01);

  if (states.length < 1 || states.length > 2000)
  {
    throw new Error(util.format(
      "The length of the `states` array must be between 1 and 2000, got %d.",
      states.length
    ));
  }

  /**
   * States of the coils. An array of 1 to 2000 truthy or falsy elements.
   *
   * @private
   * @type {Array.<boolean>}
   */
  this.states = states;
}

util.inherits(ReadCoilsResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `states` (array, required) -
 *     An array of coil states. Must have between 1 and 2000 elements.
 *
 * @param {object} options An options object.
 * @param {Array.<boolean>} options.states
 * @returns {h5.modbus.functions.ReadCoilsResponse} A response created from
 * the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadCoilsResponse.fromOptions = function(options)
{
  return new ReadCoilsResponse(options.states);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {h5.modbus.functions.ReadCoilsResponse} A response created from
 * its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
ReadCoilsResponse.fromBuffer = function(buffer)
{
  util.assertFunctionCode(buffer[0], 0x01);

  return new ReadCoilsResponse(
    new buffers.BufferReader(buffer).readBits(2, buffer[1] * 8)
  );
};

/**
 * Returns a binary representation of the read coils response.
 *
 * @returns {Buffer} A binary representation of the response.
 */
ReadCoilsResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x01)
    .pushByte(Math.ceil(this.states.length / 8))
    .pushBits(this.states)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadCoilsResponse.prototype.toString = function()
{
  return util.format(
    "0x01 (RES) %d coils:",
    this.states.length,
    this.states.map(Number)
  );
};

/**
 * @returns {Array.<boolean>} States of the coils.
 */
ReadCoilsResponse.prototype.getStates = function()
{
  return this.states;
};

/**
 * @returns {number}
 */
ReadCoilsResponse.prototype.getCount = function()
{
  return this.states.length;
};

/**
 * @param {number} offset
 * @returns {boolean}
 * @throws {Error} If the specified offset is out of bounds.
 */
ReadCoilsResponse.prototype.isOn = function(offset)
{
  if (offset >= this.states.length || offset < 0)
  {
    throw new Error("Offset out of bounds: " + offset);
  }

  return this.states[offset];
};

/**
 * @param {number} offset
 * @returns {boolean}
 * @throws {Error} If the specified offset is out of bounds.
 */
ReadCoilsResponse.prototype.isOff = function(offset)
{
  if (offset >= this.states.length || offset < 0)
  {
    throw new Error("Offset out of bounds: " + offset);
  }

  return this.states[offset] === false;
};
