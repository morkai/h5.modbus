'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var ReadFileRecordResponse = require('./ReadFileRecordResponse');

module.exports = ReadFileRecordRequest;

/**
 * The read file record request (code 0x14).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a byte count (1 byte),
 *   - a list of sub-requests, where each sub-request consists of:
 *     - a reference type (1 byte),
 *     - a file number (2 bytes),
 *     - a record number (2 bytes),
 *     - a record length (2 bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {Array.<SubRequest>} subRequests An array of sub-requests.
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function ReadFileRecordRequest(subRequests)
{
  Request.call(this, 0x14);

  /**
   * An array of sub-requests.
   *
   * @private
   * @type {Array.<SubRequest>}
   */
  this.subRequests = subRequests.map(function(subRequest)
  {
    subRequest.fileNumber = util.prepareNumericOption(
      subRequest.fileNumber, 1, 0x0001, 0xFFFF, 'File number'
    );
    subRequest.recordNumber = util.prepareNumericOption(
      subRequest.recordNumber, 0, 0x0000, 0x270F, 'Record number'
    );
    subRequest.recordLength = util.prepareNumericOption(
      subRequest.recordLength, 1, 1, 120, 'Record length'
    );

    return subRequest;
  });
}

util.inherits(ReadFileRecordRequest, Request);

/**
 * Creates a new request from the specified `options`.
 *
 * Available options for this request are:
 *
 *   - `subRequests` (array, required) -
 *     An array of sub-requests. Sub-request is an object with the following
 *     properties:
 *
 *       - `fileNumber` (number, required) - a file to read.
 *         Must be a number between 0x0001 and 0xFFFF.
 *
 *       - `recordNumber` (number, optional) - a starting record number.
 *         If specified, must be a number between 0x0000 and 0x270F.
 *         Defaults to 0.
 *
 *       - `recordLength` (number, optional) - a number of records to read.
 *         If specified must be a number between 1 and 120.
 *         Defaults to 1.
 *
 * @param {object} options An options object.
 * @param {Array.<SubRequest>} options.subRequests
 * @returns {ReadFileRecordRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
ReadFileRecordRequest.fromOptions = function(options)
{
  return new ReadFileRecordRequest(options.subRequests);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {ReadFileRecordRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
ReadFileRecordRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 9);
  util.assertFunctionCode(buffer[0], 0x14);

  var reader = new buffers.BufferReader(buffer);

  reader.skip(2);

  var subRequests = [];

  while (reader.length > 0)
  {
    var referenceType = reader.shiftByte();

    if (referenceType !== 6)
    {
      throw new Error(util.format(
        "Invalid reference type. Expected 6, got: %d", referenceType
      ));
    }

    subRequests.push({
      fileNumber: reader.shiftUInt16(),
      recordNumber: reader.shiftUInt16(),
      recordLength: reader.shiftUInt16()
    });
  }

  return new ReadFileRecordRequest(subRequests);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
ReadFileRecordRequest.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();
  var subRequestCount = this.subRequests.length;

  builder
    .pushByte(0x14)
    .pushByte(7 * subRequestCount);

  for (var i = 0; i < subRequestCount; ++i)
  {
    var subRequest = this.subRequests[i];

    builder
      .pushByte(6)
      .pushUInt16(subRequest.fileNumber)
      .pushUInt16(subRequest.recordNumber)
      .pushUInt16(subRequest.recordLength);
  }

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
ReadFileRecordRequest.prototype.toString = function()
{
  return util.format(
    "0x14 (REQ) Read %d records from %d files",
    this.subRequests.reduce(function(p, c) { return p + c.recordLength; }, 0),
    this.subRequests.length
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
ReadFileRecordRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    ReadFileRecordResponse
  );
};

/**
 * @returns {Array.<SubRequest>} An array of sub-requests.
 */
ReadFileRecordRequest.prototype.getSubRequests = function()
{
  return this.subRequests;
};

/*jshint unused:false*/

/**
 * @typedef {{fileNumber: number, recordNumber: number, recordLength: number}}
 */
var SubRequest;
