// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const ExceptionCode = require('../ExceptionCode');
const FunctionCode = require('../FunctionCode');
const Response = require('../Response');
const helpers = require('../helpers');

/**
 * @private
 * @type {Object<ExceptionCode, string>}
 */
const CODE_TO_MESSAGE_MAP = {
  [ExceptionCode.IllegalFunctionCode]: 'Illegal Function Code: '
    + 'The function code received in the query is not an allowable action for the server (or slave).',
  [ExceptionCode.IllegalDataAddress]: 'Illegal Data Address: '
    + 'The data address received in the query is not an allowable address for the server (or slave).',
  [ExceptionCode.IllegalDataValue]: 'Illegal Data Value: '
    + 'A value contained in the query data field is not an allowable value for the server (or slave).',
  [ExceptionCode.SlaveDeviceFailure]: 'Slave Device Failure: '
    + 'An unrecoverable error occurred while the server (or slave) was attempting to perform the requested action.',
  [ExceptionCode.Acknowledge]: 'Acknowledge: '
    + 'The server (or slave) has accepted the request and is processing it, '
    + 'but a long duration of time will be required to do so.',
  [ExceptionCode.SlaveDeviceBusy]: 'Slave Device Busy: '
    + 'The server (or slave) is engaged in processing a long–duration program command.',
  [ExceptionCode.NegativeAcknowledge]: 'Negative Acknowledge: '
    + 'The server (or slave) cannot perform the program function received in the query.',
  [ExceptionCode.MemoryParityError]: 'Memory Parity Error: '
    + 'The server (or slave) attempted to read record file, but detected a parity error in the memory.',
  [ExceptionCode.GatewayPathUnavailable]: 'Gateway Path Unavailable: '
    + 'Gateway was unable to allocate an internal communication path from the input port to the output port for '
    + 'processing the request.',
  [ExceptionCode.GatewayTargetDeviceFailedToRespond]: 'Gateway Target Device Failed To Respond: '
    + 'No response was obtained from the target device.'
};

class ExceptionResponse extends Response
{
  /**
   * @param {FunctionCode} functionCode
   * @param {ExceptionCode} exceptionCode
   */
  constructor(functionCode, exceptionCode)
  {
    super(functionCode);

    /**
     * @type {ExceptionCode}
     */
    this.exceptionCode = exceptionCode;
  }

  /**
   * @param {Object} options
   * @param {FunctionCode} options.functionCode
   * @param {ExceptionCode} options.exceptionCode
   * @returns {ExceptionResponse}
   */
  static fromOptions(options)
  {
    return new ExceptionResponse(options.functionCode, options.exceptionCode);
  }

  /**
   * @param {Buffer} buffer
   * @returns {ExceptionResponse}
   * @throws {Error} If the specified `buffer` is not a valid binary representation of this response.
   */
  static fromBuffer(buffer)
  {
    helpers.assertBufferLength(buffer, 2);

    if (buffer[0] <= FunctionCode.Exception)
    {
      throw new Error(
        'Invalid function code. '
        + `Expected an integer greater than ${FunctionCode.Exception}, got [${buffer[0]}].`
      );
    }

    return new ExceptionResponse(buffer[0] - FunctionCode.Exception, buffer[1]);
  }

  /**
   * @returns {Buffer}
   */
  toBuffer()
  {
    return Buffer.from([this.functionCode + FunctionCode.Exception, this.exceptionCode]);
  }

  /**
   * @returns {string}
   */
  toString()
  {
    let message = `Exception (${this.exceptionCode})`;

    if (typeof CODE_TO_MESSAGE_MAP[this.exceptionCode] !== 'undefined')
    {
      message += `: ${CODE_TO_MESSAGE_MAP[this.exceptionCode]}`;
    }

    return `${helpers.formatFunctionCode(this.functionCode)} (RES) ${message}`;
  }

  /**
   * @returns {boolean}
   */
  isException()
  {
    return true;
  }
}

module.exports = ExceptionResponse;
