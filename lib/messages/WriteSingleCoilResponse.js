// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Response = require('../Response');

/**
 * The write single coil response (code 0x05).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an output address (2 bytes),
 *   - an output value (2 bytes).
 *
 * The output value of `0xFF00` means that the output is ON.
 * The output value of `0x0000` means that the output is OFF.
 */
class WriteSingleCoilResponse extends Response
{
  /**
   * @param {number} address An address of the set output. Must be between 0 and 0xFFFF.
   * @param {boolean} state A state of the set output.
   * @throws {Error} If the specified `address` is not a number between 0 and 0xFFFF.
   */
  constructor(address, state)
  {
    super(FunctionCode.WriteSingleCoil);

    /**
     * An address of the set output. A number between 0 and 0xFFFF.
     *
     * @readonly
     * @type {number}
     */
    this.address = helpers.prepareAddress(address, 1);

    /**
     * A state of the set output.
     *
     * @readonly
     * @type {boolean}
     */
    this.state = !!state;
  }

  /**
   * Creates a new response from the specified `options`.
   *
   * @param {Object} options
   * @param {number} [options.address=0] A starting address.
   * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
   * @param {boolean} [options.state=false] A state of the output to set. Defaults to `false`.
   * @returns {WriteSingleCoilResponse}
   * @throws {Error} If any of the specified `options` are invalid.
   */
  static fromOptions(options)
  {
    return new WriteSingleCoilResponse(options.address, options.state);
  }

  /**
   * Creates a new response from its binary representation.
   *
   * @param {Buffer} buffer A binary representation of this response.
   * @returns {WriteSingleCoilResponse}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this response.
   */
  static fromBuffer(buffer)
  {
    helpers.assertBufferLength(buffer, 5);
    helpers.assertFunctionCode(buffer[0], FunctionCode.WriteSingleCoil);

    return new WriteSingleCoilResponse(
      buffer.readUInt16BE(1),
      buffer.readUInt16BE(3) === 0xFF00
    );
  }

  /**
   * Returns a binary representation of this response.
   *
   * @returns {Buffer}
   */
  toBuffer()
  {
    const buffer = Buffer.allocUnsafe(5);

    buffer[0] = this.functionCode;
    buffer.writeUInt16BE(this.address, 1);
    buffer.writeUInt16BE(this.state ? 0xFF00 : 0x0000, 3);

    return buffer;
  }

  /**
   * Returns a string representation of this response.
   *
   * @returns {string}
   */
  toString()
  {
    return helpers.formatResponse(this, `Coil at address ${this.address} was set to ${this.state ? 'ON' : 'OFF'}.`);
  }
}

module.exports = WriteSingleCoilResponse;
