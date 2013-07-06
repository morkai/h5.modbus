/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadFileRecordRequest = require(LIB_DIR + '/functions/ReadFileRecordRequest');
var ReadFileRecordResponse = require(LIB_DIR + '/functions/ReadFileRecordResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("ReadFileRecordRequest", function()
{
  it("should throw if the specified fileNumber is invalid", function()
  {
    function testZero()
    {
      new ReadFileRecordRequest([{fileNumber: 0}]);
    }

    function testLessThanZero()
    {
      new ReadFileRecordRequest([{fileNumber: -1337}]);
    }

    function testGreaterThanFFFF()
    {
      new ReadFileRecordRequest([{fileNumber: 0xFFFF + 1}]);
    }

    testZero.should.throw();
    testLessThanZero.should.throw();
    testGreaterThanFFFF.should.throw();
  });

  it("should throw if the specified recordNumber is invalid", function()
  {
    function testNotANumber()
    {
      new ReadFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 'test'
      }]);
    }

    function testLessThanZero()
    {
      new ReadFileRecordRequest([{
        fileNumber: 1,
        recordNumber: -1337
      }]);
    }

    function testGreaterThan0x270F()
    {
      new ReadFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0x270F + 1
      }]);
    }

    testNotANumber.should.throw();
    testLessThanZero.should.throw();
    testGreaterThan0x270F.should.throw();
  });

  it("should throw if the specified recordLength is invalid", function()
  {
    function testNotANumber()
    {
      new ReadFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0,
        recordLength: 'test'
      }]);
    }

    function testZero()
    {
      new ReadFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0,
        recordLength: 0
      }]);
    }

    function testLessThanZero()
    {
      new ReadFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0,
        recordLength: -1337
      }]);
    }

    function testGreaterThan120()
    {
      new ReadFileRecordRequest([{
        fileNumber: 1,
        recordNumber: 0,
        recordLength: 120 + 1
      }]);
    }

    testNotANumber.should.throw();
    testZero.should.throw();
    testLessThanZero.should.throw();
    testGreaterThan120.should.throw();
  });

  it("should use 0x0001 as a default fileNumber", function()
  {
    new ReadFileRecordRequest([{}]).getSubRequests()[0].fileNumber.should.be.equal(0x0001);
  });

  it("should use 0x0000 as a default recordNumber", function()
  {
    new ReadFileRecordRequest([{}]).getSubRequests()[0].recordNumber.should.be.equal(0x0000);
  });

  it("should use 1 as a default recordLength", function()
  {
    new ReadFileRecordRequest([{}]).getSubRequests()[0].recordLength.should.be.equal(1);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadFileRecordRequest([{}]).getCode().should.be.equal(0x14);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var subRequests = [
        {fileNumber: 1, recordLength: 2},
        {fileNumber: 2, recordLength: 4}
      ];

      var req = ReadFileRecordRequest.fromOptions({
        subRequests: subRequests
      });

      req.getSubRequests().should.be.eql(subRequests);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 9 bytes long", function()
    {
      function test1()
      {
        ReadFileRecordRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        ReadFileRecordRequest.fromBuffer(new Buffer([0x14, 0x02, 0x06, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadFileRecordRequest.fromBuffer(new Buffer([0x02, 0x07, 0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should throw if the reference type byte is not equal to 6", function()
    {
      function test()
      {
        ReadFileRecordRequest.fromBuffer(new Buffer([0x14, 0x07, 0xFF, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read 7 bytes starting at 3 as a sub-request", function()
    {
      var buffer = new Buffer([0x14, 0x07, 0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01]);
      var req = ReadFileRecordRequest.fromBuffer(buffer);

      req.getSubRequests().should.be.eql([{fileNumber: 1, recordNumber: 0, recordLength: 1}]);
    });

    it("should read multiple sub-requests", function()
    {
      var buffer = new Buffer([
        0x14, 0x0E,
        0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x06, 0x00, 0x02, 0x00, 0x04, 0x00, 0x02
      ]);
      var req = ReadFileRecordRequest.fromBuffer(buffer);

      req.getSubRequests().should.be.eql([
        {fileNumber: 1, recordNumber: 0, recordLength: 1},
        {fileNumber: 2, recordNumber: 4, recordLength: 2}
      ]);
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 9 byte Buffer for a single sub-request", function()
    {
      var req = new ReadFileRecordRequest([{fileNumber: 1, recordNumber: 0, recordLength: 1}]);
      var buf = req.toBuffer();

      buf.length.should.be.equal(9);
    });

    it("should return a 16 byte Buffer for two sub-requests", function()
    {
      var req = new ReadFileRecordRequest([
        {fileNumber: 1, recordNumber: 0, recordLength: 1},
        {fileNumber: 2, recordNumber: 4, recordLength: 2}
      ]);
      var buf = req.toBuffer();

      buf.length.should.be.equal(16);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadFileRecordRequest([{}]).toBuffer()[0].should.be.equal(0x14);
    });

    it("should write the remaining byte count as uint8 at 1", function()
    {
      var req = new ReadFileRecordRequest([
        {fileNumber: 1, recordNumber: 0, recordLength: 1},
        {fileNumber: 2, recordNumber: 4, recordLength: 2}
      ]);
      var buf = req.toBuffer();

      buf[1].should.be.equal(14);
    });

    it("should write 7 byte sub-requests starting at 2", function()
    {
      var req = new ReadFileRecordRequest([
        {fileNumber: 1, recordNumber: 0, recordLength: 1},
        {fileNumber: 2, recordNumber: 4, recordLength: 2}
      ]);
      var buf = req.toBuffer();

      buf.should.be.eql(new Buffer([
        0x14, 0x0E,
        0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x06, 0x00, 0x02, 0x00, 0x04, 0x00, 0x02
      ]));
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadFileRecordRequest([{}]).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new ReadFileRecordRequest([{}]);
      var res = req.createResponse(new Buffer([0x94, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x14);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of ReadFileRecordResponse if the function code is not an exception", function()
    {
      var req = new ReadFileRecordRequest([
        {fileNumber: 4, recordNumber: 1, recordLength: 2},
        {fileNumber: 3, recordNumber: 9, recordLength: 2}
      ]);
      var res = req.createResponse(new Buffer([0x14, 0x0C, 0x05, 0x06, 0x0D, 0xFE, 0x00, 0x20, 0x05, 0x06, 0x33, 0xCD, 0x00, 0x40]));

      res.should.be.an.instanceOf(ReadFileRecordResponse);
      res.getCode().should.be.equal(0x14);
    });
  });

  describe("getSubRequests", function()
  {
    it("should return the sub-requests specified in the constructor", function()
    {
      var subRequests = [
        {fileNumber: 1, recordNumber: 0, recordLength: 1},
        {fileNumber: 2, recordNumber: 4, recordLength: 2}
      ];

      new ReadFileRecordRequest(subRequests).getSubRequests().should.be.eql(subRequests);
    });
  });
});
