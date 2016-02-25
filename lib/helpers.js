// Part of <http://miracle.systems/p/h5.modbus> licensed under <MIT>

'use strict';

const inspect = require('util').inspect;

const POW = [1, 2, 4, 8, 16, 32, 64, 128];

/**
 * @param {(Array.<number>|Buffer)} byteArray
 * @param {number} byteIndex
 * @param {number} bitCount
 * @returns {Array.<boolean>}
 */
exports.toBitArray = function(byteArray, byteIndex, bitCount)
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

      bitArray[bitArrayLength++] = (byteValue & POW[bitIndex]) !== 0;
    }
  }

  return bitArray;
};

/**
 * @param {(FunctionCode|number)} functionCode
 * @returns {string}
 */
exports.formatFunctionCode = function(functionCode)
{
  const prefix = functionCode > 0xF ? '' : '0';
  const hex = functionCode.toString(16).toUpperCase();

  return `0x${prefix}${hex}`;
};

/**
 * @param {Message} message
 * @param {string} description
 * @param {boolean} isResponse
 * @returns {string}
 */
exports.formatMessage = function(message, description, isResponse)
{
  return `${exports.formatFunctionCode(message.functionCode)} (${isResponse ? 'RES' : 'REQ'}) ${description}`;
};

/**
 * @param {Request} request
 * @param {string} description
 * @returns {string}
 */
exports.formatRequest = function(request, description)
{
  return exports.formatMessage(request, description, false);
};

/**
 * @param {Response} response
 * @param {string} description
 * @returns {string}
 */
exports.formatResponse = function(response, description)
{
  return exports.formatMessage(response, description, true);
};

/**
 * @param {number} actualCode
 * @param {number} expectedCode
 * @throws {Error} If the `actualCode` is not equal to the `expectedCode`.
 */
exports.assertFunctionCode = function(actualCode, expectedCode)
{
  if (actualCode !== expectedCode)
  {
    throw new Error(`Invalid function code. Expected [${expectedCode}], got [${actualCode}].`);
  }
};

/**
 * @param {Buffer} buffer
 * @param {number} minLength
 * @throws {Error} If the length of the `buffer` is less than `minLength`.
 */
exports.assertBufferLength = function(buffer, minLength)
{
  if (buffer.length < minLength)
  {
    throw new Error(`Invalid buffer. Expected at least [${minLength}] bytes, got [${buffer.length}].`);
  }
};

/**
 * @param {*} address
 * @param {number} quantity
 * @returns {number}
 * @throws {Error} If the specified `address` is not a number between 0 and 65535.
 * @throws {Error} If the sum of `address` and `quantity` is not a number between 1 and 65536.
 */
exports.prepareAddress = function(address, quantity)
{
  const startingAddress = exports.prepareNumericOption(address, 0, 0, 65535, 'A starting address');
  const endingAddress = startingAddress + quantity;

  if (endingAddress > 65536)
  {
    throw new Error(
      `The sum of starting address and quantity must be a number between 1 and 65536, but got [${endingAddress}].`
    );
  }

  return startingAddress;
};

/**
 * @param {*} quantity
 * @param {number} maxQuantity
 * @returns {number}
 */
exports.prepareQuantity = function(quantity, maxQuantity)
{
  return exports.prepareNumericOption(quantity, 1, 1, maxQuantity, 'Quantity');
};

/**
 * @param {*} registerValue
 * @returns {number}
 * @throws {Error} If the specified `registerValue` is not a number between 0 and 65535.
 */
exports.prepareRegisterValue = function(registerValue)
{
  if (Buffer.isBuffer(registerValue))
  {
    if (registerValue.length < 2)
    {
      throw new Error(`Register value must be a 2 byte Buffer, but got: ${inspect(registerValue)}`);
    }

    return registerValue.readUInt16BE(0, true);
  }

  const n = exports.prepareNumericOption(registerValue, 0, -32768, 65535, 'Register value');

  return n >= 0 ? n : (n + 0x10000);
};

/**
 * @param {*} registerValues
 * @returns {Buffer}
 * @throws {Error} If the specified `registerValues` is not a Buffer of even length between 2 and 246 bytes.
 */
exports.prepareRegisterValues = function(registerValues)
{
  let buffer = registerValues;

  if (Array.isArray(registerValues))
  {
    buffer = new Buffer(registerValues.length * 2);

    for (let i = 0; i < registerValues.length; ++i)
    {
      const n = exports.prepareNumericOption(registerValues[i], 0, -32768, 65535, 'Register value');

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
 * @param {*} value
 * @param {number} defaultValue
 * @param {number} min
 * @param {number} max
 * @param {string} label
 * @returns {number}
 * @throws {Error} If the specified `value` is not a number between `min` and `max`.
 */
exports.prepareNumericOption = function(value, defaultValue, min, max, label)
{
  if (value == null)
  {
    return defaultValue;
  }

  const n = +value;

  if (isNaN(n) || n < min || n > max)
  {
    throw new Error(`${label} must be a number between ${min} and ${max}, but got [${value}].`);
  }

  return n;
};
