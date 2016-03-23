// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Request = require('../Request');

/**
 * The write single coil request (code 0x05).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an output address (2 bytes),
 *   - an output value (2 bytes).
 *
 * To turn the output ON, the output value must be equal to `0xFF00`.
 * To turn the output OFF, the output value must be equal to `0x0000`.
 */
class WriteSingleCoilRequest extends Request
{
  /**
   * @param {number} address An address of the output to set. Must be between 0 and 0xFFFF.
   * @param {boolean} state A state of the output to set.
   * @throws {Error} If the specified `address` is not a number between 0 and 0xFFFF.
   */
  constructor(address, state)
  {
    super(FunctionCode.WriteSingleCoil);

    /**
     * An address of the output to set. A number between 0 and 0xFFFF.
     *
     * @readonly
     * @type {number}
     */
    this.address = helpers.prepareAddress(address, 1);

    /**
     * A state of the output to set.
     *
     * @readonly
     * @type {boolean}
     */
    this.state = !!state;
  }

  /**
   * Creates a new request from the specified `options`.
   *
   * @param {Object} options
   * @param {number} [options.address=0] An address of the output to set.
   * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
   * @param {boolean} [options.state=false] A state of the output to set. Defaults to `false`.
   * @returns {WriteSingleCoilRequest}
   * @throws {Error} If any of the specified `options` are invalid.
   */
  static fromOptions(options)
  {
    return new WriteSingleCoilRequest(options.address, options.state);
  }

  /**
   * Creates a new request from its binary representation.
   *
   * @param {Buffer} buffer A binary representation of this request.
   * @returns {WriteSingleCoilRequest}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this request.
   */
  static fromBuffer(buffer)
  {
    helpers.assertBufferLength(buffer, 5);
    helpers.assertFunctionCode(buffer[0], FunctionCode.WriteSingleCoil);

    return new WriteSingleCoilRequest(
      buffer.readUInt16BE(1, true),
      buffer.readUInt16BE(3, true) === 0xFF00
    );
  }

  /**
   * Returns a binary representation of this request.
   *
   * @returns {Buffer}
   */
  toBuffer()
  {
    const buffer = new Buffer(5);

    buffer[0] = this.functionCode;
    buffer.writeUInt16BE(this.address, 1, true);
    buffer.writeUInt16BE(this.state ? 0xFF00 : 0x0000, 3, true);

    return buffer;
  }

  /**
   * Returns a string representation of this request.
   *
   * @returns {string}
   */
  toString()
  {
    return helpers.formatRequest(this, `Set coil at address ${this.address} to ${this.state ? 'ON' : 'OFF'}.`);
  }
}

module.exports = WriteSingleCoilRequest;
