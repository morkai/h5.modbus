// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const inspect = require('util').inspect;
const helpers = require('../helpers');
const FunctionCode = require('../FunctionCode');
const Response = require('../Response');

/**
 * The read holding registers response (code 0x03).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count `n` (1 byte),
 *   - register data (`n` bytes).
 */
class ReadWriteMultipleRegistersResponse extends Response
{
  /**
   * @param {Buffer} data Register data. A buffer of even length between 2 and 250 bytes.
   * @throws {Error} If the length of the `data` buffer is not between 2 and 250.
   */
  constructor(data)
  {
    super(FunctionCode.ReadWriteMultipleRegisters);

    if (data.length % 2 !== 0 || data.length < 2 || data.length > 250)
    {
      throw new Error(
        `The length of the data buffer must be an even number between 2 and 250, but got [${data.length}].`
      );
    }

    /**
     * Register data. A buffer of even length between 2 and 250 bytes.
     *
     * @readonly
     * @type {Buffer}
     */
    this.data = data;

    /**
     * A number of registers.
     *
     * @readonly
     * @type {number}
     */
    this.quantity = data.length / 2;
  }

  /**
   * Creates a new response from the specified `options`.
   *
   * @param {Object} options
   * @param {Buffer} options.data Register data. Must be a buffer of even length between 2 and 250 bytes.
   * @returns {ReadWriteMultipleRegistersResponse}
   * @throws {Error} If any of the specified `options` are invalid.
   */
  static fromOptions(options)
  {
    return new ReadWriteMultipleRegistersResponse(options.data);
  }

  /**
   * Creates a new response from its binary representation.
   *
   * **WARNING**: The register data is not copied from the specified `buffer` but sliced. Modifying
   * the `buffer` will modify the memory in the register data slice because the allocated memory
   * of the two objects overlap.
   *
   * @param {Buffer} buffer A binary representation of this response.
   * @returns {ReadWriteMultipleRegistersResponse}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this response.
   */
  static fromBuffer(buffer)
  {
    helpers.assertBufferLength(buffer, 4);
    helpers.assertFunctionCode(buffer[0], FunctionCode.ReadWriteMultipleRegisters);

    const byteCount = buffer[1];
    const data = buffer.slice(2, byteCount + 2);

    return new ReadWriteMultipleRegistersResponse(data);
  }

  /**
   * Returns a binary representation of this response.
   *
   * @returns {Buffer}
   */
  toBuffer()
  {
    const buffer = new Buffer(2 + this.data.length);

    buffer[0] = this.functionCode;
    buffer[1] = this.data.length;

    this.data.copy(buffer, 2);

    return buffer;
  }

  /**
   * Returns a string representation of this response.
   *
   * @returns {string}
   */
  toString()
  {
    return helpers.formatResponse(this, `${this.quantity} holding registers: ${inspect(this.data)}`);
  }
}

module.exports = ReadWriteMultipleRegistersResponse;
