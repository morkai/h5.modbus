// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Response = require('../Response');

/**
 * The write multiple registers response (code 0x10).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers written (2 bytes).
 */
class WriteMultipleRegistersResponse extends Response
{
  /**
   * @param {number} startingAddress A starting address of registers written. Must be between 0 and 0xFFFF.
   * @param {number} quantity A quantity of registers written. Must be between 1 and 123.
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `quantity` is not a number between 1 and 123.
   * @throws {Error} If the sum of `startingAddress` and `quantity` is not between 1 and 0x10000.
   */
  constructor(startingAddress, quantity)
  {
    super(FunctionCode.WriteMultipleRegisters);

    /**
     * A quantity of registers written. A number between 0 and 123.
     *
     * @readonly
     * @type {number}
     */
    this.quantity = helpers.prepareQuantity(quantity, 123);

    /**
     * A starting address of registers written. A number between 0 and 0xFFFF.
     *
     * @readonly
     * @type {number}
     */
    this.startingAddress = helpers.prepareAddress(startingAddress, this.quantity);
  }

  /**
   * Creates a new response from the specified `options`.
   *
   * @param {Object} options
   * @param {number} [options.startingAddress=0] A starting address of registers written.
   * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
   * @param {number} [options.quantity=1] A quantity of registers written.
   * If specified, must be a number between 0 and 123. Defaults to 1.
   * @returns {WriteMultipleRegistersResponse}
   * @throws {Error} If any of the specified `options` are invalid.
   */
  static fromOptions(options)
  {
    return new WriteMultipleRegistersResponse(options.startingAddress, options.quantity);
  }

  /**
   * Creates a new response from its binary representation.
   *
   * @param {Buffer} buffer A binary representation of this response.
   * @returns {WriteMultipleRegistersResponse}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this response.
   */
  static fromBuffer(buffer)
  {
    helpers.assertBufferLength(buffer, 5);
    helpers.assertFunctionCode(buffer[0], FunctionCode.WriteMultipleRegisters);

    return new WriteMultipleRegistersResponse(
      buffer.readUInt16BE(1),
      buffer.readUInt16BE(3)
    );
  }

  /**
   * An ending address. A number between 1 and 0x10000.
   *
   * @type {number}
   */
  get endingAddress()
  {
    return this.startingAddress + this.quantity;
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
    buffer.writeUInt16BE(this.startingAddress, 1);
    buffer.writeUInt16BE(this.quantity, 3);

    return buffer;
  }

  /**
   * Returns a string representation of this response.
   *
   * @returns {string}
   */
  toString()
  {
    if (this.quantity === 1)
    {
      return helpers.formatResponse(this, `Set register at address ${this.startingAddress}.`);
    }

    return helpers.formatResponse(this, `Set ${this.quantity} registers starting at address ${this.startingAddress}.`);
  }
}

module.exports = WriteMultipleRegistersResponse;
