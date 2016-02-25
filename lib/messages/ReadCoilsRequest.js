// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Request = require('../Request');

/**
 * The read coils request (code 0x01).
 *
 * A binary representation of this request is 5 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of coils (2 bytes).
 */
class ReadCoilsRequest extends Request
{
  /**
   * @param {number} startingAddress A starting address. Must be between 0 and 0xFFFF.
   * @param {number} quantity A quantity of coils to read. Must be between 1 and 2000.
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `quantity` is not a number between 1 and 2000.
   * @throws {Error} If the sum of `startingAddress` and `quantity` is greater than 0x10000.
   */
  constructor(startingAddress, quantity)
  {
    super(FunctionCode.ReadCoils);

    /**
     * A quantity of coils to read. A number between 1 and 2000.
     *
     * @readonly
     * @type {number}
     */
    this.quantity = helpers.prepareQuantity(quantity, 2000);

    /**
     * A starting address. A number between 0 and 0xFFFF.
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
   * @param {number} [options.startingAddress=0] A starting address.
   * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
   * @param {number} [options.quantity=1] A quantity of coils.
   * If specified, must be a number between 1 and 2000. Defaults to 1.
   * @returns {ReadCoilsRequest}
   * @throws {Error} If any of the specified `options` are invalid.
   */
  static fromOptions(options)
  {
    return new ReadCoilsRequest(options.startingAddress, options.quantity);
  }

  /**
   * Creates a new request from its binary representation.
   *
   * @param {Buffer} buffer A binary representation of this request.
   * @returns {ReadCoilsRequest}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this request.
   */
  static fromBuffer(buffer)
  {
    helpers.assertBufferLength(buffer, 5);
    helpers.assertFunctionCode(buffer[0], FunctionCode.ReadCoils);

    return new ReadCoilsRequest(
      buffer.readUInt16BE(1, true),
      buffer.readUInt16BE(3, true)
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
   * Returns a binary representation of this request.
   *
   * @returns {Buffer}
   */
  toBuffer()
  {
    const buffer = new Buffer(5);

    buffer[0] = this.functionCode;
    buffer.writeUInt16BE(this.startingAddress, 1, true);
    buffer.writeUInt16BE(this.quantity, 3, true);

    return buffer;
  }

  /**
   * Returns a string representation of this request.
   *
   * @returns {string}
   */
  toString()
  {
    return helpers.formatRequest(this, `Read ${this.quantity} coils starting from address ${this.startingAddress}`);
  }
}

module.exports = ReadCoilsRequest;
