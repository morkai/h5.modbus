// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Response = require('../Response');

/**
 * The write multiple coils response (code 0x0F).
 *
 * A binary representation of this response is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of outputs set (2 bytes).
 */
class WriteMultipleCoilsResponse extends Response
{
  /**
   * @param {number} startingAddress A starting address of the set outputs. Must be between 0 and 0xFFFF.
   * @param {number} quantity A quantity of the set outputs. Must be between 1 and 1968.
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `quantity` is not a number between 1 and 1968.
   * @throws {Error} If the sum of `startingAddress` and `quantity` is not between 1 and 0x10000.
   */
  constructor(startingAddress, quantity)
  {
    super(FunctionCode.WriteMultipleCoils);

    /**
     * A quantity of the set outputs. A number between 0 and 1968.
     *
     * @readonly
     * @type {number}
     */
    this.quantity = helpers.prepareQuantity(quantity, 1968);

    /**
     * A starting address of the set outputs. A number between 0 and 0xFFFF.
     *
     * @readonly
     * @type {number}
     */
    this.startingAddress = helpers.prepareAddress(startingAddress, this.quantity);
  }

  /**
   * Creates a new request from the specified `options`.
   *
   * @param {Object} options
   * @param {number} [options.startingAddress=0] A starting address of the set outputs.
   * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
   * @param {number} [options.quantity=1] A quantity of the set outputs.
   * If specified, must be a number between 0 and 1968. Defaults to 1.
   * @returns {WriteMultipleCoilsResponse}
   * @throws {Error} If any of the specified `options` are invalid.
   */
  static fromOptions(options)
  {
    return new WriteMultipleCoilsResponse(options.startingAddress, options.quantity);
  }

  /**
   * Creates a new response from its binary representation.
   *
   * @param {Buffer} buffer A binary representation of this response.
   * @returns {WriteMultipleCoilsResponse}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this response.
   */
  static fromBuffer(buffer)
  {
    helpers.assertBufferLength(buffer, 5);
    helpers.assertFunctionCode(buffer[0], FunctionCode.WriteMultipleCoils);

    return new WriteMultipleCoilsResponse(
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
      return helpers.formatResponse(this, `Set coil at address ${this.startingAddress}.`);
    }

    return helpers.formatResponse(this, `Set ${this.quantity} coils starting at address ${this.startingAddress}.`);
  }
}

module.exports = WriteMultipleCoilsResponse;
