// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const InvalidFrameError = require('./InvalidFrameError');
const FunctionCode = require('./FunctionCode');
const messages = require('./messages');

class ApplicationDataUnit
{
  /**
   * @param {?number} id
   * @param {number} unit
   * @param {Buffer} protocolDataUnit
   * @param {?number} checksum
   */
  constructor(id, unit, protocolDataUnit, checksum)
  {
    /**
     * @type {?number}
     */
    this.id = id;

    /**
     * @type {number}
     */
    this.unit = unit;

    /**
     * @type {FunctionCode}
     */
    this.functionCode = protocolDataUnit[0];

    /**
     * @type {Buffer}
     */
    this.protocolDataUnit = protocolDataUnit;

    /**
     * @type {?number}
     */
    this.checksum = checksum;
  }

  /**
   * @returns {boolean}
   */
  isException()
  {
    return this.functionCode > FunctionCode.Exception;
  }

  /**
   * @returns {FunctionCode}
   */
  getRealFunctionCode()
  {
    return this.isException() ? (this.functionCode - FunctionCode.Exception) : this.functionCode;
  }

  /**
   * @returns {Request}
   * @throws {Error} If this is not a valid ADU for a `Request`.
   */
  toRequest()
  {
    if (!messages.requests[this.functionCode])
    {
      throw new InvalidFrameError(`Unsupported request function code: ${this.functionCode}`);
    }

    return messages.requests[this.functionCode].fromBuffer(this.protocolDataUnit);
  }

  /**
   * @returns {Response}
   * @throws {Error} If this is not a valid ADU for a `Response`.
   */
  toResponse()
  {
    const functionCode = this.isException()
      ? FunctionCode.Exception
      : this.functionCode;

    if (!messages.responses[functionCode])
    {
      throw new InvalidFrameError(`Unsupported response function code: ${functionCode}`);
    }

    return messages.responses[functionCode].fromBuffer(this.protocolDataUnit);
  }
}

module.exports = ApplicationDataUnit;
