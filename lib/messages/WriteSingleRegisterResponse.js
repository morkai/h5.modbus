// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Response = require('../Response');

/**
 * The write single register response (code 0x06).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an output address (2 bytes),
 *   - a register value (2 bytes).
 */
class WriteSingleRegisterResponse extends Response
{
  /**
   * @param {number} address An address of the register written to. Must be between 0 and 0xFFFF.
   * @param {number} value A value of the register written to. Must be between 0 and 65535.
   * @throws {Error} If the specified `address` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `value` is not a number between 0 and 65535.
   */
  constructor(address, value)
  {
    super(FunctionCode.WriteSingleRegister);

    /**
     * An address of the register written to. A number between 0 and 0xFFFF.
     *
     * @readonly
     * @type {number}
     */
    this.address = helpers.prepareAddress(address, 1);

    /**
     * A value written to the register. A number between 0 and 65535.
     *
     * @readonly
     * @type {number}
     */
    this.value = helpers.prepareRegisterValue(value);
  }

  /**
   * Creates a new response from the specified `options`.
   *
   * @param {Object} options
   * @param {number} [options.address=0] An address of the register written to.
   * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
   * @param {number} [options.value=0] A value written to the register.
   * If specified, must be a number between 0 and 65535. Defaults to 0.
   * @returns {WriteSingleRegisterResponse}
   * @throws {Error} If any of the specified `options` are invalid.
   */
  static fromOptions(options)
  {
    return new WriteSingleRegisterResponse(options.address, options.value);
  }

  /**
   * Creates a new response from its binary representation.
   *
   * @param {Buffer} buffer A binary representation of this response.
   * @returns {WriteSingleRegisterResponse}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this response.
   */
  static fromBuffer(buffer)
  {
    helpers.assertBufferLength(buffer, 5);
    helpers.assertFunctionCode(buffer[0], FunctionCode.WriteSingleRegister);

    return new WriteSingleRegisterResponse(
      buffer.readUInt16BE(1),
      buffer.readUInt16BE(3)
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
    buffer.writeUInt16BE(this.value, 3);

    return buffer;
  }

  /**
   * Returns a string representation of this response.
   *
   * @returns {string}
   */
  toString()
  {
    return helpers.formatResponse(this, `Register at address ${this.address} was set to: ${this.value}`);
  }
}

module.exports = WriteSingleRegisterResponse;
