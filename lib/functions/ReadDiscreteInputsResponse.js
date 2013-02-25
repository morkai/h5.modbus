'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadDiscreteInputsResponse;

/**
 * The read discrete inputs response (code 0x02).
 *
 * A binary representation of the this response varies in length
 * and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `N` (1 byte),
 *   - input statuses (`N` bytes).
 *
 * @name h5.modbus.functions.ReadDiscreteInputsResponse
 * @constructor
 * @extends {h5.modbus.functions.Response}
 * @param {Array.<boolean>} states States of the inputs.
 * An array of 1 to 2000 truthy or falsy elements.
 * @throws {Error} If the length of the `statuses` array is not
 * between 1 and 2000.
 */
function ReadDiscreteInputsResponse(states)
{
  Response.call(this, 0x02);

  if (states.length < 1 || states.length > 2000)
  {
    throw new Error(util.format(
      "The length of the `statuses` array must be between 1 and 2000, got %d.",
      states.length
    ));
  }

  /**
   * States of the inputs. An array of 1 to 2000 truthy or falsy elements.
   *
   * @private
   * @type {Array.<boolean>}
   */
  this.states = states;
}

util.inherits(ReadDiscreteInputsResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `states` (array, required) -
 *     An array of input states. Must have between 1 and 2000 elements.
 *
 * @param {object} options An options object.
 * @param {Array.<boolean>} options.states
 * @return {h5.modbus.functions.ReadDiscreteInputsResponse} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadDiscreteInputsResponse.fromOptions = function(options)
{
  return new ReadDiscreteInputsResponse(options.states);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @return {h5.modbus.functions.ReadDiscreteInputsResponse} A response created
 * from its binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
ReadDiscreteInputsResponse.fromBuffer = function(buffer)
{
  util.assertFunctionCode(buffer[0], 0x02);

  return new ReadDiscreteInputsResponse(
    new buffers.BufferReader(buffer).readBits(2, buffer[1] * 8)
  );
};

/**
 * Returns a binary representation of this response.
 *
 * @return {Buffer} A binary representation of this response.
 */
ReadDiscreteInputsResponse.prototype.toBuffer = function()
{
  return new buffers.BufferBuilder()
    .pushByte(0x02)
    .pushByte(Math.ceil(this.states.length / 8))
    .pushBits(this.states)
    .toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @return {string} A string representation of this response.
 */
ReadDiscreteInputsResponse.prototype.toString = function()
{
  return util.format(
    "0x02 (RES) %d discrete inputs:",
    this.states.length,
    this.states.map(Number)
  );
};

/**
 * @return {Array.<boolean>} States of the inputs.
 */
ReadDiscreteInputsResponse.prototype.getStates = function()
{
  return this.states;
};

/**
 * @return {number}
 */
ReadDiscreteInputsResponse.prototype.getCount = function()
{
  return this.states.length;
};

/**
 * @param {number} offset
 * @return {boolean}
 * @throws {Error} If the specified offset is out of bounds.
 */
ReadDiscreteInputsResponse.prototype.isOn = function(offset)
{
  if (offset >= this.states.length || offset < 0)
  {
    throw new Error("Offset out of bounds: " + offset);
  }

  return this.states[offset];
};

/**
 * @param {number} offset
 * @return {boolean}
 * @throws {Error} If the specified offset is out of bounds.
 */
ReadDiscreteInputsResponse.prototype.isOff = function(offset)
{
  if (offset >= this.states.length || offset < 0)
  {
    throw new Error("Offset out of bounds: " + offset);
  }

  return this.states[offset] === false;
};
