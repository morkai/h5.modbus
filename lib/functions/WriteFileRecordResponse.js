'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Response = require('./Response');

module.exports = WriteFileRecordResponse;

/**
 * The write file record response (code 0x15).
 *
 * A binary representation of this response varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a response data length (1 byte),
 *   - a list of sub-responses, where each sub-response consists of:
 *     - a reference type (1 byte),
 *     - a file number (2 bytes),
 *     - a record number (2 bytes),
 *     - a record length (`N`; 2 bytes),
 *     - a record data (`N` bytes).
 *
 * @constructor
 * @extends {Response}
 * @param {Array.<WriteFileSubResponse>} subResponses An array of sub-responses.
 * @throws {Error} If any of the specified sub-responses are invalid.
 */
function WriteFileRecordResponse(subResponses)
{
  Response.call(this, 0x15);

  /**
   * An array of sub-responses.
   *
   * @private
   * @type {Array.<WriteFileSubResponse>}
   */
  this.subResponses = subResponses.map(function(subResponse)
  {
    subResponse.fileNumber = util.prepareNumericOption(
      subResponse.fileNumber, 1, 0x0001, 0xFFFF, 'File number'
    );
    subResponse.recordNumber = util.prepareNumericOption(
      subResponse.recordNumber, 0, 0x0000, 0x270F, 'Record number'
    );

    var recordDataLength = subResponse.recordData.length;

    if (recordDataLength === 0
      || recordDataLength > 240
      || recordDataLength % 2 !== 0)
    {
      throw new Error(util.format(
        "Invalid record data length. "
          + "Expected an even number of bytes between 2 and 240, got: %d",
        recordDataLength
      ));
    }

    return subResponse;
  });
}

util.inherits(WriteFileRecordResponse, Response);

/**
 * Creates a new response from the specified `options`.
 *
 * Available options for this response are:
 *
 *   - `subResponses` (array, required) -
 *     An array of sub-responses. Sub-response is an object with the following
 *     properties:
 *
 *       - `fileNumber` (number, required) - a file to read.
 *         Must be a number between 0x0001 and 0xFFFF.
 *
 *       - `recordNumber` (number, optional) - a starting record number.
 *         If specified, must be a number between 0x0000 and 0x270F.
 *         Defaults to 0.
 *
 *       - `recordData` (Buffer, required) - a written record data.
 *         Must be of an even length between 2 and 240 bytes.
 *
 * @param {object} options An options object.
 * @param {Array.<WriteFileSubResponse>} options.subResponses
 * @returns {WriteFileRecordResponse} A response created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteFileRecordResponse.fromOptions = function(options)
{
  return new WriteFileRecordResponse(options.subResponses);
};

/**
 * Creates a new response from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this response.
 * @returns {WriteFileRecordResponse} A response created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this response.
 */
WriteFileRecordResponse.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 11);
  util.assertFunctionCode(buffer[0], 0x15);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  var subResponses = [];

  while (reader.length > 0)
  {
    var referenceType = reader.shiftByte();

    if (referenceType !== 6)
    {
      throw new Error(util.format(
        "Invalid reference type. Expected 6, got: %d", referenceType
      ));
    }

    subResponses.push({
      fileNumber: reader.shiftUInt16(),
      recordNumber: reader.shiftUInt16(),
      recordData: reader.shiftBuffer(reader.shiftUInt16() * 2)
    });
  }

  return new WriteFileRecordResponse(subResponses);
};

/**
 * Returns a binary representation of this response.
 *
 * @returns {Buffer} A binary representation of this response.
 */
WriteFileRecordResponse.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();
  var subResponseCount = this.subResponses.length;

  builder
    .pushByte(0x15)
    .pushByte(7 * subResponseCount + this.getTotalRecordDataLength());

  for (var i = 0; i < subResponseCount; ++i)
  {
    var subResponse = this.subResponses[i];

    builder
      .pushByte(6)
      .pushUInt16(subResponse.fileNumber)
      .pushUInt16(subResponse.recordNumber)
      .pushUInt16(subResponse.recordData.length / 2)
      .pushBuffer(subResponse.recordData);
  }

  return builder.toBuffer();
};

/**
 * Returns a string representation of this response.
 *
 * @returns {string} A string representation of this response.
 */
WriteFileRecordResponse.prototype.toString = function()
{
  return util.format(
    "0x15 (RES) %d records were written to %d files",
    this.getTotalRecordDataLength() / 2,
    this.subResponses.length
  );
};

/**
 * @returns {Array.<WriteFileSubResponse>} An array of sub-responses.
 */
WriteFileRecordResponse.prototype.getSubResponses = function()
{
  return this.subResponses;
};

/**
 * @returns {number} A total record data byte length of the all sub-responses.
 */
WriteFileRecordResponse.prototype.getTotalRecordDataLength = function()
{
  return this.subResponses.reduce(
    function(p, c) { return p + c.recordData.length; },
    0
  );
};

/*jshint unused:false*/

/**
 * @typedef {{fileNumber: number, recordNumber: number, recordData: Buffer}}
 */
var WriteFileSubResponse;
