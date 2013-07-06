'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = ReadFileRecordResponse;

/**
 * The read input registers response (code 0x14).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a response data length (1 byte),
 *   - a list of sub-responses, where each sub-response consists of:
 *     - a file response length (1 byte),
 *     - a reference type (1 byte),
 *     - a record data (variable number of bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Array.<Buffer>} subResponses An array of sub-responses.
 */
function ReadFileRecordResponse(subResponses)
{
  Response.call(this, 0x14);

  /**
   * An array of sub-responses.
   *
   * @private
   * @type {Array.<Buffer>}
   */
  this.subResponses = subResponses.map(function(subResponse)
  {
    if (subResponse.length < 2
      || subResponse.length > 240
      || subResponse.length % 2 !== 0)
    {
      throw new Error(util.format(
        "Invalid length of the sub-response. "
          + "Expected an even number between 2 and 240 bytes, got: %d",
        subResponse.length
      ));
    }

    return subResponse;
  });
}

util.inherits(ReadFileRecordResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `subResponses` (array, required) -
 *     An array of record data Buffers.
 *
 * @param {object} options An options object.
 * @param {Array.<Buffer>} options.subResponses
 * @returns {ReadFileRecordResponse} A response created
 * from the specified `options`.
 */
ReadFileRecordResponse.fromOptions = function(options)
{
  return new ReadFileRecordResponse(options.subResponses);
};

/**
 * Creates a response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of the response.
 * @returns {ReadFileRecordResponse} Read input
 * registers response.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of the read input registers response.
 */
ReadFileRecordResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 6);
  util.assertFunctionCode(buffer[0], 0x14);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  var subResponses = [];

  while (reader.length > 0)
  {
    var fileResponseLength = reader.shiftByte();
    var referenceType = reader.shiftByte();

    if (referenceType !== 6)
    {
      throw new Error(util.format(
        "Invalid reference type. Expected 6, got: %d", referenceType
      ));
    }

    subResponses.push(reader.shiftBuffer(fileResponseLength - 1));
  }

  return new ReadFileRecordResponse(subResponses);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
ReadFileRecordResponse.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();

  builder.pushByte(0x14);

  var subResponseCount = this.subResponses.length;
  var subResponsesLength = this.getTotalRecordDataLength();

  builder.pushByte(2 * subResponseCount + subResponsesLength);

  for (var i = 0; i < subResponseCount; ++i)
  {
    var subResponse = this.subResponses[i];

    builder
      .pushByte(subResponse.length + 1)
      .pushByte(6)
      .pushBuffer(subResponse);
  }

  return builder.toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
ReadFileRecordResponse.prototype.toString = function()
{
  return util.format(
    "0x14 (RES) %d records from %d files",
    this.getTotalRecordDataLength() / 2,
    this.subResponses.length
  );
};

/**
 * @returns {Buffer} An array of sub-responses.
 */
ReadFileRecordResponse.prototype.getSubResponses = function()
{
  return this.subResponses;
};

/**
 * @returns {number} A total record data byte length of the all sub-responses.
 */
ReadFileRecordResponse.prototype.getTotalRecordDataLength = function()
{
  return this.subResponses.reduce(function(p, c) { return p + c.length; }, 0);
};
