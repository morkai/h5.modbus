/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteFileRecordRequest = require(LIB_DIR + '/functions/WriteFileRecordRequest');
var WriteFileRecordResponse = require(LIB_DIR + '/functions/WriteFileRecordResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("WriteFileRecordRequest", function()
{
  it("should throw if the specified fileNumber is invalid", function()
  {
    function testZero()
    {
      new WriteFileRecordRequest([{fileNumber: 0, recordData: new Buffer(2)}]);
    }

    function testLessThanZero()
    {
      new WriteFileRecordRequest([{fileNumber: -1337, recordData: new Buffer(2)}]);
    }

    function testGreaterThanFFFF()
    {
      new WriteFileRecordRequest([{fileNumber: 0xFFFF + 1, recordData: new Buffer(2)}]);
    }

    testZero.should.throw();
    testLessThanZero.should.throw();
    testGreaterThanFFFF.should.throw();
  });

  it("should throw if the specified recordNumber is invalid", function()
  {
    function testNotANumber()
    {
      new WriteFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 'test',
        recordData: new Buffer(2)
      }]);
    }

    function testLessThanZero()
    {
      new WriteFileRecordRequest([{
        fileNumber: 1,
        recordNumber: -1337,
        recordData: new Buffer(2)
      }]);
    }

    function testGreaterThan0x270F()
    {
      new WriteFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0x270F + 1,
        recordData: new Buffer(2)
      }]);
    }

    testNotANumber.should.throw();
    testLessThanZero.should.throw();
    testGreaterThan0x270F.should.throw();
  });

  it("should throw if the specified recordData is invalid", function()
  {
    function testNotABuffer()
    {
      new WriteFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0,
        recordData: null
      }]);
    }

    function testZero()
    {
      new WriteFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0,
        recordData: new Buffer(0)
      }]);
    }

    function testOdd()
    {
      new WriteFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0,
        recordData: new Buffer(3)
      }]);
    }

    function testGreaterThan120()
    {
      new WriteFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0,
        recordData: new Buffer(120 + 1)
      }]);
    }

    testNotABuffer.should.throw();
    testZero.should.throw();
    testOdd.should.throw();
    testGreaterThan120.should.throw();
  });

  it("should use 0x0001 as a default fileNumber", function()
  {
    new WriteFileRecordRequest([{recordData: new Buffer(2)}]).getSubRequests()[0].fileNumber.should.be.equal(0x0001);
  });

  it("should use 0x0000 as a default recordNumber", function()
  {
    new WriteFileRecordRequest([{recordData: new Buffer(2)}]).getSubRequests()[0].recordNumber.should.be.equal(0x0000);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteFileRecordRequest([{recordData: new Buffer(2)}]).getCode().should.be.equal(0x15);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var subRequests = [
        {fileNumber: 1, recordData: new Buffer(2)},
        {fileNumber: 2, recordData: new Buffer(4)}
      ];

      var req = WriteFileRecordRequest.fromOptions({
        subRequests: subRequests
      });

      req.getSubRequests().should.be.eql(subRequests);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 11 bytes long", function()
    {
      function test1()
      {
        WriteFileRecordRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteFileRecordRequest.fromBuffer(new Buffer([
          0x15, 0x0d,
          0x06, 0x00, 0x04, 0x00, 0x07, 0x00, 0x03, 0x06
        ]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteFileRecordRequest.fromBuffer(new Buffer([0x14, 0x09, 0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0xab, 0xcd]));
      }

      test.should.throw();
    });

    it("should throw if the reference type byte is not equal to 6", function()
    {
      function test()
      {
        WriteFileRecordRequest.fromBuffer(new Buffer([0x15, 0x09, 0xFF, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0xab, 0xcd]));
      }

      test.should.throw();
    });

    it("should read a single sub-request", function()
    {
      var buffer = new Buffer([
        0x15, 0x0d,
        0x06, 0x00, 0x04, 0x00, 0x07, 0x00, 0x03, 0x06, 0xaf, 0x04, 0xbe, 0x10, 0x0d
      ]);
      var req = WriteFileRecordRequest.fromBuffer(buffer);

      req.getSubRequests().should.be.eql([{
        fileNumber: 4,
        recordNumber: 7,
        recordData: new Buffer([0x06, 0xaf, 0x04, 0xbe, 0x10, 0x0d])
      }]);
    });

    it("should read multiple sub-requests", function()
    {
      var buffer = new Buffer([
        0x15, 0x16,
        0x06, 0x00, 0x04, 0x00, 0x07, 0x00, 0x03, 0x06, 0xaf, 0x04, 0xbe, 0x10, 0x0d,
        0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0xab, 0xcd
      ]);
      var req = WriteFileRecordRequest.fromBuffer(buffer);

      req.getSubRequests().should.be.eql([
        {
          fileNumber: 4,
          recordNumber: 7,
          recordData: new Buffer([0x06, 0xaf, 0x04, 0xbe, 0x10, 0x0d])
        },
        {
          fileNumber: 1,
          recordNumber: 0,
          recordData: new Buffer([0xab, 0xcd])
        }
      ]);
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 11 byte long Buffer for one 1 record sub-request", function()
    {
      var req = new WriteFileRecordRequest([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0xab, 0xcd])}
      ]);
      var buf = req.toBuffer();

      buf.length.should.be.equal(11);
    });

    it("should return a 13 byte long Buffer for one 2 record sub-request", function()
    {
      var req = new WriteFileRecordRequest([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11, 0x22, 0x22])}
      ]);
      var buf = req.toBuffer();

      buf.length.should.be.equal(13);
    });

    it("should return a 20 byte long Buffer for two 1 record sub-requests", function()
    {
      var req = new WriteFileRecordRequest([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11])},
        {fileNumber: 2, recordNumber: 4, recordData: new Buffer([0x22, 0x22])}
      ]);
      var buf = req.toBuffer();

      buf.length.should.be.equal(20);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteFileRecordRequest([{recordData: new Buffer([0x11, 0x11])}]).toBuffer()[0].should.be.equal(0x15);
    });

    it("should write the remaining byte count as uint8 at 1", function()
    {
      var req = new WriteFileRecordRequest([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11])},
        {fileNumber: 2, recordNumber: 4, recordData: new Buffer([0x22, 0x22])}
      ]);
      var buf = req.toBuffer();

      buf[1].should.be.equal(18);
    });

    it("should write the sub-requests starting at 2", function()
    {
      var req = new WriteFileRecordRequest([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11])},
        {fileNumber: 2, recordNumber: 4, recordData: new Buffer([0x22, 0x22])}
      ]);
      var buf = req.toBuffer();

      buf.should.be.eql(new Buffer([
        0x15, 0x12,
        0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x11, 0x11,
        0x06, 0x00, 0x02, 0x00, 0x04, 0x00, 0x01, 0x22, 0x22
      ]));
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteFileRecordRequest([{recordData: new Buffer([0x11, 0x11])}]).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new WriteFileRecordRequest([{recordData: new Buffer([0x11, 0x11])}]);
      var res = req.createResponse(new Buffer([0x95, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x15);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of WriteFileRecordResponse if the function code is not an exception", function()
    {
      var req = new WriteFileRecordRequest([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11])},
        {fileNumber: 2, recordNumber: 4, recordData: new Buffer([0x22, 0x22])}
      ]);
      var res = req.createResponse(new Buffer([
        0x15, 0x12,
        0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x11, 0x11,
        0x06, 0x00, 0x02, 0x00, 0x04, 0x00, 0x01, 0x22, 0x22
      ]));

      res.should.be.an.instanceOf(WriteFileRecordResponse);
      res.getCode().should.be.equal(0x15);
    });
  });

  describe("getSubRequests", function()
  {
    it("should return the sub-requests specified in the constructor", function()
    {
      var subRequests = [
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11])},
        {fileNumber: 2, recordNumber: 4, recordData: new Buffer([0x22, 0x22])}
      ];

      new WriteFileRecordRequest(subRequests).getSubRequests().should.be.eql(subRequests);
    });
  });
});
