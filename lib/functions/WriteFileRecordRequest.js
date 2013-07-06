'use strict';

var buffers = require('h5.buffers');
var util = require('./util');
var Request = require('./Request');
var WriteFileRecordResponse = require('./WriteFileRecordResponse');

module.exports = WriteFileRecordRequest;

/**
 * The write file record request (code 0x15).
 *
 * A binary representation of this request varies in length and consists of:
 *
 *   - a function code (1 byte),
 *   - a request data length (1 byte),
 *   - a list of sub-requests, where each sub-request consists of:
 *     - a reference type (1 byte),
 *     - a file number (2 bytes),
 *     - a record number (2 bytes),
 *     - a record length (`N`; 2 bytes),
 *     - a record data (`N` bytes).
 *
 * @constructor
 * @extends {Request}
 * @param {Array.<WriteFileSubRequest>} subRequests An array of sub-requests.
 * @throws {Error} If any of the specified sub-requests are invalid.
 */
function WriteFileRecordRequest(subRequests)
{
  Request.call(this, 0x15);

  /**
   * An array of sub-requests.
   *
   * @private
   * @type {Array.<WriteFileSubRequest>}
   */
  this.subRequests = subRequests.map(function(subRequest)
  {
    subRequest.fileNumber = util.prepareNumericOption(
      subRequest.fileNumber, 1, 0x0001, 0xFFFF, 'File number'
    );
    subRequest.recordNumber = util.prepareNumericOption(
      subRequest.recordNumber, 0, 0x0000, 0x270F, 'Record number'
    );

    var recordDataLength = subRequest.recordData.length;

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

    return subRequest;
  });
}

util.inherits(WriteFileRecordRequest, Request);

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
 *       - `recordData` (Buffer, required) - a record data to write.
 *         Must be of an even length between 2 and 240 bytes.
 *
 * @param {object} options An options object.
 * @param {Array.<WriteFileSubRequest>} options.subRequests
 * @returns {WriteFileRecordRequest} A request created
 * from the specified `options`.
 * @throws {Error} If any of the specified options are not valid.
 */
WriteFileRecordRequest.fromOptions = function(options)
{
  return new WriteFileRecordRequest(options.subRequests);
};

/**
 * Creates a new request from its binary representation.
 *
 * @param {Buffer} buffer A binary representation of this request.
 * @returns {WriteFileRecordRequest} A request created from its binary
 * representation.
 * @throws {Error} If the specified buffer is not a valid binary representation
 * of this request.
 */
WriteFileRecordRequest.fromBuffer = function(buffer)
{
  util.assertBufferLength(buffer, 11);
  util.assertFunctionCode(buffer[0], 0x15);

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
      recordData: reader.shiftBuffer(reader.shiftUInt16() * 2)
    });
  }

  return new WriteFileRecordRequest(subRequests);
};

/**
 * Returns a binary representation of this request.
 *
 * @returns {Buffer} A binary representation of this request.
 */
WriteFileRecordRequest.prototype.toBuffer = function()
{
  var builder = new buffers.BufferBuilder();
  var subRequestCount = this.subRequests.length;

  builder
    .pushByte(0x15)
    .pushByte(7 * subRequestCount + this.getTotalRecordDataLength());

  for (var i = 0; i < subRequestCount; ++i)
  {
    var subRequest = this.subRequests[i];

    builder
      .pushByte(6)
      .pushUInt16(subRequest.fileNumber)
      .pushUInt16(subRequest.recordNumber)
      .pushUInt16(subRequest.recordData.length / 2)
      .pushBuffer(subRequest.recordData);
  }

  return builder.toBuffer();
};

/**
 * Returns a string representation of this request.
 *
 * @returns {string} A string representation of this request.
 */
WriteFileRecordRequest.prototype.toString = function()
{
  return util.format(
    "0x15 (REQ) Write %d records to %d files",
    this.getTotalRecordDataLength() / 2,
    this.subRequests.length
  );
};

/**
 * @param {Buffer} responseBuffer
 * @returns {Response}
 * @throws {Error}
 */
WriteFileRecordRequest.prototype.createResponse = function(responseBuffer)
{
  return this.createExceptionOrResponse(
    responseBuffer,
    WriteFileRecordResponse
  );
};

/**
 * @returns {Array.<WriteFileSubRequest>} An array of sub-requests.
 */
WriteFileRecordRequest.prototype.getSubRequests = function()
{
  return this.subRequests;
};

/**
 * @returns {number} A total record data byte length of the all sub-requests.
 */
WriteFileRecordRequest.prototype.getTotalRecordDataLength = function()
{
  return this.subRequests.reduce(
    function(p, c) { return p + c.recordData.length; },
    0
  );
};

/*jshint unused:false*/

/**
 * @typedef {{fileNumber: number, recordNumber: number, recordData: Buffer}}
 */
var WriteFileSubRequest;
