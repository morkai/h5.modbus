// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const buffers = require('h5.buffers');
const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Response = require('../Response');

/**
 * The read coils response (code 0x01).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `n` (1 byte),
 *   - coil states (`n` bytes).
 */
class ReadCoilsResponse extends Response
{
  /**
   * @param {Array<boolean>} states States of the coils. An array of 1 to 2000 truthy or falsy elements.
   * @throws {Error} If the `states` array is empty or has more than 2000 elements.
   */
  constructor(states)
  {
    super(FunctionCode.ReadCoils);

    if (states.length === 0 || states.length > 2000)
    {
      throw new Error(`Invalid states array. Expected length between 1 and 2000, got [${states.length}].`);
    }

    /**
     * States of the coils. An array of 1 to 2000 truthy or falsy elements.
     *
     * @readonly
     * @type {Array<boolean>}
     */
    this.states = states;
  }

  /**
   * Creates a new response from the specified `options`.
   *
   * @param {Object} options
   * @param {Array<boolean>} options.states An array of coil states. Must have between 1 and 2000 elements.
   * @returns {ReadCoilsResponse}
   * @throws {Error} If any of the specified `options` are invalid.
   */
  static fromOptions(options)
  {
    return new ReadCoilsResponse(options.states);
  }

  /**
   * Creates a new response from its binary representation.
   *
   * @param {Buffer} buffer A binary representation of this response.
   * @returns {ReadCoilsResponse}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this response.
   */
  static fromBuffer(buffer)
  {
    helpers.assertFunctionCode(buffer[0], FunctionCode.ReadCoils);

    const states = helpers.toBitArray(buffer, 2, buffer[1] * 8);

    return new ReadCoilsResponse(states);
  }

  /**
   * A number of coils.
   *
   * @type {number}
   */
  get quantity()
  {
    return this.states.length;
  }

  /**
   * Returns a binary representation of this response.
   *
   * @returns {Buffer}
   */
  toBuffer()
  {
    return new buffers.BufferBuilder()
      .pushByte(this.functionCode)
      .pushByte(Math.ceil(this.states.length / 8))
      .pushBits(this.states)
      .toBuffer();
  }

  /**
   * Returns a string representation of this response.
   *
   * @returns {string}
   */
  toString()
  {
    return helpers.formatResponse(this, `${this.quantity} coils: ${this.states.map(Number).join(', ')}`);
  }

  /**
   * Determines whether a coil at the specified `offset` is on (i.e. has a truthy values).
   *
   * @param {number} offset
   * @returns {boolean}
   * @throws {Error} If the specified `offset` is out of bounds.
   */
  isOn(offset)
  {
    if (offset < 0 || offset >= this.states.length)
    {
      throw new RangeError(`Offset out of bounds: ${offset}`);
    }

    return !!this.states[offset];
  }

  /**
   * Determines whether a coil at the specified `offset` is off (i.e. has a falsy values).
   *
   * @param {number} offset
   * @returns {boolean}
   * @throws {Error} If the specified `offset` is out of bounds.
   */
  isOff(offset)
  {
    if (offset < 0 || offset >= this.states.length)
    {
      throw new RangeError(`Offset out of bounds: ${offset}`);
    }

    return !this.states[offset];
  }
}

module.exports = ReadCoilsResponse;
