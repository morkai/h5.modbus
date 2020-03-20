// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const inspect = require('util').inspect;
const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Request = require('../Request');
const {Exception} = require('../FunctionCode');

/**
 * The write multiple registers request (code 0x10).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a starting address (2 bytes),
 *   - a quantity of registers (2 bytes),
 *   - a byte count (`n`; 1 byte),
 *   - new register data (`n` bytes).
 */
class ReadWriteMultipleRegistersRequest extends Request
{
  /**
   * @param {number} readStartingAddress A starting address. Must be between 0 and 0xFFFF.
   * @param {number} readQuantity A quantity of registers to read. Must be between 1 and 125.
   * @param {number} writeStartingAddress A starting address of the registers to write. Must be between 0 and 0xFFFF.
   * @param {Buffer} writeValues Register values to write. Must have an even length of between 2 and 246 bytes.
   * @throws {Error} If the specified `startingAddress` is not a number between 0 and 0xFFFF.
   * @throws {Error} If the specified `values` is not an array of length between 1 and 1968.
   * @throws {Error} If the sum of `startingAddress` and a half of `values.length` is not between 1 and 0x10000.
   */
  constructor(readStartingAddress, readQuantity, writeStartingAddress, writeValues)
  {
    super(FunctionCode.ReadWriteMultipleRegisters);

    /**
     * A quantity of registers to read. A number between 1 and 125.
     *
     * @type {number}
     */
    this.readQuantity = helpers.prepareQuantity(readQuantity, 125);

    /**
     * A starting address. A number between 0 and 0xFFFF.
     *
     * @type {number}
     */
    this.readStartingAddress = helpers.prepareAddress(readStartingAddress, this.readQuantity);

    /**
     * Register values to write. A Buffer of even length between 2 and 246 bytes.
     *
     * @type {Buffer}
     */
    this.writeValues = helpers.prepareRegisterValues(writeValues);

    /**
     * A starting address of the registers to write. A number between 0 and 0xFFFF.
     *
     * @readonly
     * @type {number}
     */
    this.writeStartingAddress = helpers.prepareAddress(writeStartingAddress, this.writeQuantity);
  }

  /**
   * Creates a new request from the specified `options`.
   *
   * @param {Object} options
   * @param {number} [options.readStartingAddress=0] A starting address.
   * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
   * @param {number} [options.readQuantity=1] A quantity of registers.
   * If specified, must be a number between 1 and 125. Defaults to 1.
   * @param {number} [options.writeStartingAddress=0] A starting address of the outputs to set.
   * If specified, must be a number between 0 and 0xFFFF. Defaults to 0.
   * @param {Buffer} options.writeValues Register values to write.
   * Must be a Buffer of even length between 2 and 246 bytes.
   * @returns {ReadWriteMultipleRegistersRequest}
   * @throws {Error} If any of the specified `options` are invalid.
   */
  static fromOptions(options)
  {
    return new ReadWriteMultipleRegistersRequest(options.readStartingAddress, options.readQuantity, options.writeStartingAddress, options.writeValues);
  }

  /**
   * Creates a new request from its binary representation.
   *
   * @param {Buffer} buffer A binary representation of this request.
   * @returns {WriteMultipleRegistersRequest}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this request.
   */
  static fromBuffer(buffer)
  {
    helpers.assertBufferLength(buffer, 10 + (buffer[9] || 2));
    helpers.assertFunctionCode(buffer[0], FunctionCode.ReadWriteMultipleRegisters);

    const readStartingAddress = buffer.readUInt16BE(1, true);
    const readQuantity = buffer.readUInt16BE(3, true);
    const writeStartingAddress = buffer.readUInt16BE(5, true);
    const byteCount = buffer[9]; // 7 & 8 - quantity
    const writeValues = buffer.slice(10, 10 + byteCount);

    return new ReadWriteMultipleRegistersRequest(readStartingAddress, readQuantity, writeStartingAddress, writeValues);
  }

  /**
   * Update of values to write to slave
   *
   * @param {Buffer} values
   */
  updateWriteValues(values)
  {
    if (!values || !values.length || values.length !== this.writeValues.length)
    {
      throw new Exception(`Update values should be a Buffer with a lenght from ${this.writeValues.length}`);
    }
    this.writeValues = values;
  }

  /**
   * An ending address. A number between 1 and 0x10000.
   *
   * @type {number}
   */
  get readEndingAddress()
  {
    return this.readStartingAddress + this.readQuantity;
  }

  /**
   * An ending address. A number between 1 and 0x10000.
   *
   * @type {number}
   */
  get writeEndingAddress()
  {
    return this.writeStartingAddress + this.writeQuantity;
  }

  /**
   * A quantity of registers to write. An even number between 1 to 123.
   *
   * @type {number}
   */
  get writeQuantity()
  {
    return this.writeValues.length / 2;
  }

  /**
   * A starting byte index.
   *
   * The starting index is an index of a first byte in a byte array that contains the requested registers.
   * For example, given the following:
   *
   *   - byte array: `[0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99]`,
   *   - starting address: 2,
   *   - and quantity of registers: 2
   *
   * the starting index is 4 (byte `0x44`), because our register data is at 4, 5, 6 and 7 (bytes `0x44556677`).
   *
   * @type {number}
   */
  get readStartingIndex()
  {
    return this.readStartingAddress * 2;
  }

  /**
   * An ending byte index.
   *
   * The ending index is an index of a byte in a byte array that follows the last byte containing
   * the requested registers. For example, given the following:
   *
   *   - byte array: `[0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99]`,
   *   - starting address: 2,
   *   - and quantity of registers: 2
   *
   * the ending index is 8 (byte `0x88`), because our register data is at 4, 5, 6 and 7 (bytes `0x44556677`).
   *
   * @type {number}
   */
  get readEndingIndex()
  {
    return this.readStartingIndex + this.readQuantity * 2;
  }

  /**
   * Returns a binary representation of this request.
   *
   * @returns {Buffer}
   */
  toBuffer()
  {
    const buffer = new Buffer(10 + this.writeValues.length);

    buffer[0] = this.functionCode;
    buffer.writeUInt16BE(this.readStartingAddress, 1, true);
    buffer.writeUInt16BE(this.readQuantity, 3, true);
    buffer.writeUInt16BE(this.writeStartingAddress, 5, true);
    buffer.writeUInt16BE(this.writeQuantity, 7, true);
    buffer[9] = this.writeValues.length;
    this.writeValues.copy(buffer, 10);

    return buffer;
  }

  /**
   * Returns a string representation of this request.
   *
   * @returns {string}
   */
  toString()
  {
    if (this.quantity === 1)
    {
      return helpers.formatRequest(
        this, `Set register at address ${this.writeStartingAddress} to ${this.writeValues.readUInt16BE(0)} and read ${this.readQuantity} holding registers starting from address ${this.readStartingAddress}`
      );
    }

    return helpers.formatRequest(
      this, `Set ${this.writeQuantity} registers starting at address ${this.writeStartingAddress} to: ${inspect(this.writeValues)} and read ${this.readQuantity} holding registers starting from address ${this.readStartingAddress}`
    );
  }
}

module.exports = ReadWriteMultipleRegistersRequest;
