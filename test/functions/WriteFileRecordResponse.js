/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteFileRecordResponse = require(LIB_DIR + '/functions/WriteFileRecordResponse');

describe("WriteFileRecordResponse", function()
{
  it("should throw if the specified fileNumber is invalid", function()
  {
    function testZero()
    {
      new WriteFileRecordResponse([{fileNumber: 0, recordData: new Buffer(2)}]);
    }

    function testLessThanZero()
    {
      new WriteFileRecordResponse([{fileNumber: -1337, recordData: new Buffer(2)}]);
    }

    function testGreaterThanFFFF()
    {
      new WriteFileRecordResponse([{fileNumber: 0xFFFF + 1, recordData: new Buffer(2)}]);
    }

    testZero.should.throw();
    testLessThanZero.should.throw();
    testGreaterThanFFFF.should.throw();
  });

  it("should throw if the specified recordNumber is invalid", function()
  {
    function testNotANumber()
    {
      new WriteFileRecordResponse([{
        fileNumber: 1,
        recordNumber: 'test',
        recordData: new Buffer(2)
      }]);
    }

    function testLessThanZero()
    {
      new WriteFileRecordResponse([{
        fileNumber: 1,
        recordNumber: -1337,
        recordData: new Buffer(2)
      }]);
    }

    function testGreaterThan0x270F()
    {
      new WriteFileRecordResponse([{
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
      new WriteFileRecordResponse([{
        fileNumber: 1,
        recordNumber: 0,
        recordData: null
      }]);
    }

    function testZero()
    {
      new WriteFileRecordResponse([{
        fileNumber: 1,
        recordNumber: 0,
        recordData: new Buffer(0)
      }]);
    }

    function testOdd()
    {
      new WriteFileRecordResponse([{
        fileNumber: 1,
        recordNumber: 0,
        recordData: new Buffer(3)
      }]);
    }

    function testGreaterThan120()
    {
      new WriteFileRecordResponse([{
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
    new WriteFileRecordResponse([{recordData: new Buffer(2)}]).getSubResponses()[0].fileNumber.should.be.equal(0x0001);
  });

  it("should use 0x0000 as a default recordNumber", function()
  {
    new WriteFileRecordResponse([{recordData: new Buffer(2)}]).getSubResponses()[0].recordNumber.should.be.equal(0x0000);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteFileRecordResponse([{recordData: new Buffer(2)}]).getCode().should.be.equal(0x15);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var subResponses = [
        {fileNumber: 1, recordData: new Buffer(2)},
        {fileNumber: 2, recordData: new Buffer(4)}
      ];

      var req = WriteFileRecordResponse.fromOptions({
        subResponses: subResponses
      });

      req.getSubResponses().should.be.eql(subResponses);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 11 bytes long", function()
    {
      function test1()
      {
        WriteFileRecordResponse.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteFileRecordResponse.fromBuffer(new Buffer([
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
        WriteFileRecordResponse.fromBuffer(new Buffer([0x14, 0x09, 0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0xab, 0xcd]));
      }

      test.should.throw();
    });

    it("should throw if the reference type byte is not equal to 6", function()
    {
      function test()
      {
        WriteFileRecordResponse.fromBuffer(new Buffer([0x15, 0x09, 0xFF, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0xab, 0xcd]));
      }

      test.should.throw();
    });

    it("should read a single sub-response", function()
    {
      var buffer = new Buffer([
        0x15, 0x0d,
        0x06, 0x00, 0x04, 0x00, 0x07, 0x00, 0x03, 0x06, 0xaf, 0x04, 0xbe, 0x10, 0x0d
      ]);
      var req = WriteFileRecordResponse.fromBuffer(buffer);

      req.getSubResponses().should.be.eql([{
        fileNumber: 4,
        recordNumber: 7,
        recordData: new Buffer([0x06, 0xaf, 0x04, 0xbe, 0x10, 0x0d])
      }]);
    });

    it("should read multiple sub-responses", function()
    {
      var buffer = new Buffer([
        0x15, 0x16,
        0x06, 0x00, 0x04, 0x00, 0x07, 0x00, 0x03, 0x06, 0xaf, 0x04, 0xbe, 0x10, 0x0d,
        0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0xab, 0xcd
      ]);
      var req = WriteFileRecordResponse.fromBuffer(buffer);

      req.getSubResponses().should.be.eql([
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
    it("should return a 11 byte long Buffer for one 1 record sub-response", function()
    {
      var req = new WriteFileRecordResponse([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0xab, 0xcd])}
      ]);
      var buf = req.toBuffer();

      buf.length.should.be.equal(11);
    });

    it("should return a 13 byte long Buffer for one 2 record sub-response", function()
    {
      var req = new WriteFileRecordResponse([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11, 0x22, 0x22])}
      ]);
      var buf = req.toBuffer();

      buf.length.should.be.equal(13);
    });

    it("should return a 20 byte long Buffer for two 1 record sub-responses", function()
    {
      var req = new WriteFileRecordResponse([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11])},
        {fileNumber: 2, recordNumber: 4, recordData: new Buffer([0x22, 0x22])}
      ]);
      var buf = req.toBuffer();

      buf.length.should.be.equal(20);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteFileRecordResponse([{recordData: new Buffer([0x11, 0x11])}]).toBuffer()[0].should.be.equal(0x15);
    });

    it("should write the remaining byte count as uint8 at 1", function()
    {
      var req = new WriteFileRecordResponse([
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11])},
        {fileNumber: 2, recordNumber: 4, recordData: new Buffer([0x22, 0x22])}
      ]);
      var buf = req.toBuffer();

      buf[1].should.be.equal(18);
    });

    it("should write the sub-responses starting at 2", function()
    {
      var req = new WriteFileRecordResponse([
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
      new WriteFileRecordResponse([{recordData: new Buffer([0x11, 0x11])}]).toString().should.be.a('string');
    });
  });

  describe("getSubResponses", function()
  {
    it("should return the sub-responses specified in the constructor", function()
    {
      var subResponses = [
        {fileNumber: 1, recordNumber: 0, recordData: new Buffer([0x11, 0x11])},
        {fileNumber: 2, recordNumber: 4, recordData: new Buffer([0x22, 0x22])}
      ];

      new WriteFileRecordResponse(subResponses).getSubResponses().should.be.eql(subResponses);
    });
  });
});
