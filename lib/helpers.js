// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const inspect = require('util').inspect;

/**
 * @private
 * @type {Array<number>}
 */
const POWER = [1, 2, 4, 8, 16, 32, 64, 128];

function ModbusHelpers() {}

/**
 * Converts a byte array to a bit array.
 *
 * Starts at the specified byte index and stops after the specified number of bits is read or the byte array ends.
 *
 * The result is an array with `bitCount` items representing bit states:
 *
 *   - `true` if the bit is set (1),
 *   - `false` if the bit is not set (0),
 *   - `undefined` if the bit's state wasn't available (i.e. the specified `byteArray` is too short for the specified
 *     combo of `byteIndex` and `bitCount`).
 *
 * The first bit of the first byte (at `byteIndex) will be at index `0` in the resulting array and the last bit
 * of the first byte - at index `7`, the first bit of the second byte - at `8`, the last bit of the second byte
 * - at `15`, etc.
 *
 * @public
 * @param {(Array<number>|Buffer)} byteArray
 * @param {number} byteIndex
 * @param {number} bitCount
 * @returns {Array<(boolean|undefined)>} An array of truthy or falsy values representing bit states.
 * @example
 * const toBitArray = require('h5.modbus').helpers.toBitArray;
 * const byteArray = [
 *   0x55, // DEC=85  BIN=01010101,
 *   0x70, // DEC=112 BIN=01110000,
 *   0xFF, // DEC=255 BIN=11111111
 * ];
 * console.log(toBitArray(byteArray, 0, 8)); // [true, false, true, false, true, false, true, false]
 * console.log(toBitArray(byteArray, 1, 4)); // [false, false, false, false]
 * console.log(toBitArray(byteArray, 1, 10)); // [false, false, false, false, true, true, true, false, true, true]
 * console.log(toBitArray(byteArray, 2, 9)); // [true, true, true, true, true, true, true, true, undefined]
 */
ModbusHelpers.toBitArray = function(byteArray, byteIndex, bitCount)
{
  var bitArray = new Array(bitCount);
  var byteCount = byteArray.length;
  var bitArrayLength = 0;
  var bitIndex;
  var byteValue;

  for (; byteIndex < byteCount; ++byteIndex)
  {
    byteValue = byteArray[byteIndex];

    for (bitIndex = 0; bitIndex < 8; ++bitIndex)
    {
      if (bitArrayLength === bitCount)
      {
        break;
      }

      bitArray[bitArrayLength++] = (byteValue & POWER[bitIndex]) !== 0;
    }
  }

  return bitArray;
};

/**
 * Converts a function code number to an uppercase hexadecimal string prefixed with `0x`.
 *
 * @public
 * @param {(FunctionCode|number)} functionCode A decimal function code number to format.
 * @returns {string} An uppercase hexadecimal string representation of the specified function code.
 * @example
 * const formatFunctionCode = require('h5.modbus').helpers.formatFunctionCode;
 *
 * console.log(helpers.formatFunctionCode(1)); // "0x01"
 * console.log(helpers.formatFunctionCode(0x0D)); // "0x0D"
 */
ModbusHelpers.formatFunctionCode = function(functionCode)
{
  const prefix = functionCode > 0xF ? '' : '0';
  const hex = functionCode.toString(16).toUpperCase();

  return `0x${prefix}${hex}`;
};

/**
 * Converts a {@link Request} to a short summary string for logging purposes.
 *
 * The resulting string contains a function code, a message type identifier (`REQ`) and the specified description.
 *
 * @public
 * @param {Request} request A request to convert to string.
 * @param {string} description A short description of the specified `request`.
 * @returns {string} A short summary string of the specified request.
 * @example
 * const ReadCoilsRequest = require('h5.modbus').ReadCoilsRequest;
 * const formatRequest = require('h5.modbus').helpers.formatRequest;
 *
 * const request = new ReadCoilsRequest(0x0000, 8);
 *
 * console.log(formatRequest(request, 'Read coils')); // 0x01 (REQ) Read coils
 * console.log(request.toString()); // 0x01 (REQ) Read 8 coils starting from address 0
 */
ModbusHelpers.formatRequest = function(request, description)
{
  return formatMessage(request.functionCode, description, false);
};

/**
 * Converts a {@link Response} to a short summary string for logging purposes.
 *
 * The resulting string contains a function code, a message type identifier (`RES`) and the specified description.
 *
 * @public
 * @param {Response} response A response to convert to string.
 * @param {string} description A short description of the specified `response`.
 * @returns {string} A short summary string of the specified response.
 * @example
 * const ReadCoilsResponse = require('h5.modbus').ReadCoilsResponse;
 * const formatResponse = require('h5.modbus').helpers.formatResponse;
 *
 * const response = new ReadCoilsResponse([0, 1, 0, 1, 0, 1, 0, 1]);
 *
 * console.log(formatResponse(response, 'Read coils')); // 0x01 (RES) Read coils
 * console.log(response.toString()); // 0x01 (RES) 8 coils: 0, 1, 0, 1, 0, 1, 0, 1
 */
ModbusHelpers.formatResponse = function(response, description)
{
  return formatMessage(response.functionCode, description, true);
};

/**
 * Asserts whether the specified actual function code is equal to the expected function code.
 *
 * @public
 * @param {number} actualCode The actual function code to check.
 * @param {number} expectedCode The expected function code.
 * @throws {Error} If the `actualCode` is not equal to the `expectedCode`.
 * @example
 * const FunctionCode = require('./lib').FunctionCode;
 * const assertFunctionCode = require('./lib').helpers.assertFunctionCode;
 *
 * try
 * {
 *   assertFunctionCode(FunctionCode.ReadCoils, FunctionCode.ReadCoils);
 *   console.log('OK!'); // OK!
 * }
 * catch (err)
 * {
 *   console.error(err.stack); // Not executed.
 * }
 *
 * try
 * {
 *   assertFunctionCode(FunctionCode.ReadCoils, FunctionCode.ReadDiscreteInputs);
 *   console.log('OK!'); // Not executed.
 * }
 * catch (err)
 * {
 *   console.error(err.stack); // Error: Invalid function code. Expected [2], got [1].
 * }
 */
ModbusHelpers.assertFunctionCode = function(actualCode, expectedCode)
{
  if (actualCode !== expectedCode)
  {
    throw new Error(`Invalid function code. Expected [${expectedCode}], got [${actualCode}].`);
  }
};

/**
 * Asserts whether a buffer has a specific minimum length.
 *
 * @public
 * @param {Buffer} buffer The buffer to check.
 * @param {number} minLength The expected minimum length of the specified buffer.
 * @throws {Error} If the length of the `buffer` is less than `minLength`.
 * @example
 * const assertBufferLength = require('./lib').helpers.assertBufferLength;
 *
 * try
 * {
 *   assertBufferLength(new Buffer(10), 8);
 *   console.log('OK!'); // OK!
 * }
 * catch (err)
 * {
 *   console.error(err.stack); // Not executed.
 * }
 *
 * try
 * {
 *   assertBufferLength(new Buffer(8), 10);
 *   console.log('OK!'); // Not executed.
 * }
 * catch (err)
 * {
 *   console.error(err.stack); // Error: Invalid buffer. Expected at least [10] bytes, got [8].
 * }
 */
ModbusHelpers.assertBufferLength = function(buffer, minLength)
{
  if (buffer.length < minLength)
  {
    throw new Error(`Invalid buffer. Expected at least [${minLength}] bytes, got [${buffer.length}].`);
  }
};

/**
 * Checks the validity of a starting address and quantity combo.
 *
 * The sum of the starting address and quantity (i.e. the ending address) is valid if it's between 1 and 65536
 * (inclusive).
 *
 * The specified address value will be converted to a number and rounded down.
 *
 * @public
 * @param {*} address A potentially invalid starting address value. If `null` or `undefined`, then `0` is assumed.
 * @param {number} quantity A quantity of coils/inputs/registers that will be read/written starting from the specified
 * `address`.
 * @returns {number} A valid address value, i.e. an integer between 0 and 65535.
 * @throws {Error} If the specified `address` is not a number between 0 and 65535.
 * @throws {Error} If the sum of `address` and `quantity` is not a number between 1 and 65536.
 * @example
 * const prepareAddress = require('./lib').helpers.prepareAddress;
 *
 * try
 * {
 *   console.log(`address=${prepareAddress(0x1234, 100)}`); // "address=4660"
 * }
 * catch (err)
 * {
 *   console.error(err.stack); // Not executed.
 * }
 *
 * try
 * {
 *   console.log(`address=${prepareAddress(0xFFFE, 10)}`);
 * }
 * catch (err)
 * {
 *   // Error: The sum of the starting address and quantity must be an integer between 1 and 65536, but got [65544].
 *   console.error(err.stack);
 * }
 */
ModbusHelpers.prepareAddress = function(address, quantity)
{
  const startingAddress = ModbusHelpers.prepareNumericOption(address, 0, 0, 65535, 'A starting address');
  const endingAddress = startingAddress + quantity;

  if (endingAddress > 0 && endingAddress > 65536)
  {
    throw new Error(
      `The sum of the starting address and quantity must be an integer between 1 and 65536, but got [${endingAddress}].`
    );
  }

  return startingAddress;
};

/**
 * Checks the validity of a quantity value.
 *
 * The quantity value is valid if it's an integer between 1 and `maxQuantity` (inclusive).
 *
 * The specified quantity value will be converted to a number and rounded down.
 *
 * @public
 * @param {*} quantity A potentially invalid quantity value. If `null` or `undefined`, then `1` is assumed.
 * @param {number} maxQuantity The maximum quantity.
 * @returns {number} A valid quantity value, i.e. an integer between 1 and `maxQuantity` (inclusive).
 * @throws {Error} If the specified `quantity` is not a number between 1 and `maxQuantity` (inclusive).
 * @example
 * const prepareQuantity = require('./lib').helpers.prepareQuantity;
 *
 * try
 * {
 *   console.log(`quantity=${prepareQuantity('10', 20)}`); // "quantity=10"
 * }
 * catch (err)
 * {
 *   console.error(err.stack); // Not executed.
 * }
 *
 * try
 * {
 *   console.log(`quantity=${prepareQuantity('twenty', 20)}`);
 * }
 * catch (err)
 * {
 *   console.error(err.stack); // Error: Quantity must be a number between 1 and 20, but got [twenty].
 * }
 */
ModbusHelpers.prepareQuantity = function(quantity, maxQuantity)
{
  return ModbusHelpers.prepareNumericOption(quantity, 1, 1, maxQuantity, 'Quantity');
};

/**
 * Checks the validity of a register value.
 *
 * The register value is valid if it's an integer between -32768 (or -0x8000) and 65535 (or 0xFFFF; inclusive).
 *
 * If the specified register value is a `Buffer`, then it must have at least 2 bytes which will be read as an unsigned
 * 16-bit big-endian integer.
 *
 * If the specified register value is a number between -32768 and -1 (inclusive), then it will be converted
 * to an unsigned 16-bit integer.
 *
 * @public
 * @param {*} registerValue A potentially invalid register value. If `null` or `undefined`, then `0` is assumed.
 * @returns {number} A valid register value, i.e. an integer between 0 and 65535 (inclusive).
 * @throws {Error} If the specified `registerValue` is not a number between -32768 and 65535 (inclusive).
 * @throws {Error} If the specified `registerValue` is a `Buffer` with less than 2 bytes.
 * @example
 * const prepareRegisterValue = require('./lib').helpers.prepareRegisterValue;
 *
 * try
 * {
 *   console.log(`register=${prepareRegisterValue(0x1234)}`); // "register=4660"
 *   console.log(`register=${prepareRegisterValue(-0x1234)}`); // "register=60876"
 *   console.log(`register=${prepareRegisterValue(new Buffer([0x12, 0x34]))}`); // "register=4660"
 * }
 * catch (err)
 * {
 *   console.error(err.stack); // Not executed.
 * }
 *
 * try
 * {
 *   console.log(`register=${prepareRegisterValue(0xFFFFFFFF)}`);
 * }
 * catch (err)
 * {
 *   console.error(err.stack); // Error: Register value must be a number between -32768 and 65535, but got [4294967295].
 * }
 */
ModbusHelpers.prepareRegisterValue = function(registerValue)
{
  if (Buffer.isBuffer(registerValue))
  {
    if (registerValue.length < 2)
    {
      throw new Error(`Register value must be a 2 byte Buffer, but got: ${inspect(registerValue)}`);
    }

    return registerValue.readUInt16BE(0, true);
  }

  const n = ModbusHelpers.prepareNumericOption(registerValue, 0, -32768, 65535, 'Register value');

  return n >= 0 ? n : (n + 0x10000);
};

/**
 * @public
 * @param {*} registerValues
 * @returns {Buffer}
 * @throws {Error} If the specified `registerValues` is not a Buffer of even length between 2 and 246 bytes.
 */
ModbusHelpers.prepareRegisterValues = function(registerValues)
{
  let buffer = registerValues;

  if (Array.isArray(registerValues))
  {
    buffer = new Buffer(registerValues.length * 2);

    for (let i = 0; i < registerValues.length; ++i)
    {
      const n = ModbusHelpers.prepareNumericOption(registerValues[i], 0, -32768, 65535, 'Register value');

      buffer.writeUInt16BE(n >= 0 ? n : (n + 0x10000), i * 2, true);
    }
  }

  if (!Buffer.isBuffer(buffer))
  {
    const type = typeof buffer;
    const typeOrObject = type === 'object' ? inspect(buffer) : type;

    throw new Error(`Invalid register values. Expected a Buffer, but got [${typeOrObject}].`);
  }

  if (buffer.length % 2 !== 0 || buffer.length < 2 || buffer.length > 246)
  {
    throw new Error(
      'Invalid register values. '
      + `Expected a Buffer of even length between 2 and 246 bytes, but got [${buffer.length}].`
    );
  }

  return buffer;
};

/**
 * @public
 * @param {*} value
 * @param {number} defaultValue
 * @param {number} min
 * @param {number} max
 * @param {string} label
 * @returns {number}
 * @throws {Error} If the specified `value` is not a number between `min` and `max`.
 */
ModbusHelpers.prepareNumericOption = function(value, defaultValue, min, max, label)
{
  if (value == null)
  {
    return defaultValue;
  }

  const n = Math.floor(value);

  if (isNaN(n) || n < min || n > max)
  {
    throw new Error(`${label} must be a number between ${min} and ${max}, but got [${value}].`);
  }

  return n;
};

/**
 * @private
 * @param {FunctionCode} functionCode
 * @param {string} description
 * @param {boolean} isResponse
 * @returns {string}
 */
function formatMessage(functionCode, description, isResponse)
{
  return `${ModbusHelpers.formatFunctionCode(functionCode)} (${isResponse ? 'RES' : 'REQ'}) ${description}`;
}

module.exports = ModbusHelpers;
