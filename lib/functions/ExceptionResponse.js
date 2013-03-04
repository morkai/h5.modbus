'use strict';

var util = require('./util');
var Response = require('./Response');

module.exports = ExceptionResponse;

/**
 * @private
 * @const
 * @type {object.<number, string>}
 */
var codeToMessageMap = {
  0x01: 'Illegal Function Code: The function code received in the query is not '
    + 'an allowable action for the server (or slave).',
  0x02: 'Illegal Data Address: The data address received in the query is not '
    + 'an allowable address for the server (or slave).',
  0x03: 'Illegal Data Value: A value contained in the query data field is not '
    + 'an allowable value for server (or slave).',
  0x04: 'Slave Device Failure: An unrecoverable error occurred while the '
    + 'server (or slave) was attempting to perform the requested action.',
  0x05: 'Acknowledge: The server (or slave) has accepted the request and is '
    + 'processing it, but a long duration of time will be required to do so.',
  0x06: 'Slave Device Busy: The server (or slave) is engaged in processing '
    + 'a long–duration program command.',
  0x07: 'Negative Acknowledge: The server (or slave) cannot perform the '
    + 'program function received in the query.',
  0x08: 'Memory Parity Error: The server (or slave) attempted to read record '
    + 'file, but detected a parity error in the memory.',
  0x0A: 'Gateway Path Unavailable: Gateway was unable to allocate an internal '
    + 'communication path from the input port to the output port for '
    + 'processing the request.',
  0x0B: 'Gateway Target Device Failed To Respond: No response was obtained '
    + 'from the target device.'
};

/**
 * The exception response (code above 0x80).
 *
 * A binary representation of this response is 2 bytes long and consists of:
 *
 *   - a function code (1 byte),
 *   - an exception code (1 byte).
 *
 * @name h5.modbus.functions.ExceptionResponse
 * @constructor
 * @extends {h5.modbus.functions.Response}
 * @param {number} functionCode A code of the function that resulted in
 * the exception.
 * @param {number} exceptionCode A code of the exception.
 */
function ExceptionResponse(functionCode, exceptionCode)
{
  Response.call(this, functionCode);

  /**
   * A code of the exception.
   *
   * @private
   * @type {number}
   */
  this.exceptionCode = exceptionCode;
}

util.inherits(ExceptionResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `functionCode` (number, required) -
 *     A code of the function that resulted in an exception.
 *
 *   - `exceptionCode` (number, required) -
 *     A code of the exception.
 *
 * @param {object} options An options object.
 * @param {number} options.functionCode
 * @param {number} options.exceptionCode
 * @returns {h5.modbus.functions.ExceptionResponse} A response created from
 * the specified `options`.
 */
ExceptionResponse.fromOptions = function(options)
{
  return new ExceptionResponse(options.functionCode, options.exceptionCode);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {h5.modbus.functions.ExceptionResponse} A response created from its
 * binary representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
ExceptionResponse.fromBuffer = function(buffer)
{
  if (buffer[0] <= 0x80)
  {
    throw new Error(util.format(
      "Expected the function code to be above 128, got [%d]",
      buffer[0]
    ));
  }

  return new ExceptionResponse(buffer[0] - 0x80, buffer[1]);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ExceptionResponse.prototype.toBuffer = function()
{
  return new Buffer([this.getCode() + 0x80, this.exceptionCode]);
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ExceptionResponse.prototype.toString = function ()
{
  var functionCode = '0x';

  if (this.getCode() < 0xF)
  {
    functionCode += '0';
  }

  functionCode += this.getCode().toString(16);

  var message = 'Exception (' + this.exceptionCode + ')';

  if (this.exceptionCode in codeToMessageMap)
  {
    message += ': ' + codeToMessageMap[this.exceptionCode];
  }

  return functionCode + ' (RES) ' + message;
};

/**
 * @returns {number} A code of the exception.
 */
ExceptionResponse.prototype.getExceptionCode = function()
{
  return this.exceptionCode;
};
