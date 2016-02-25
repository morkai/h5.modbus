/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteMultipleCoilsRequest = require(LIB_DIR + '/functions/WriteMultipleCoilsRequest');
var WriteMultipleCoilsResponse = require(LIB_DIR + '/functions/WriteMultipleCoilsResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("WriteMultipleCoilsRequest", function()
{
  it("should throw if the specified address is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteMultipleCoilsRequest(-1337, 1);
    }

    function testLessThanZero2()
    {
      new WriteMultipleCoilsRequest(-1, 1);
    }

    function testGreaterThanFFFF()
    {
      new WriteMultipleCoilsRequest(0x10000, 1);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanFFFF.should.throw();
  });

  it("should throw if the specified states array is invalid", function()
  {
    function testEmpty()
    {
      new WriteMultipleCoilsRequest(0x0000, []);
    }

    function testGreaterThan1968()
    {
      new WriteMultipleCoilsRequest(0x0000, new Array(1969));
    }

    testEmpty.should.throw();
    testGreaterThan1968.should.throw();
  });

  it("should use 0x0000 as a default address", function()
  {
    new WriteMultipleCoilsRequest(undefined, [0, 1, 0]).getAddress().should.be.equal(0x0000);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteMultipleCoilsRequest(0x0000, [0, 1, 0]).getCode().should.be.equal(0x0F);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = WriteMultipleCoilsRequest.fromOptions({
        address: 0x0001,
        states: [0, 1, 0]
      });

      req.getAddress().should.be.equal(0x0001);
      req.getStates().should.be.eql([0, 1, 0]);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 7 bytes long", function()
    {
      function test1()
      {
        WriteMultipleCoilsRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteMultipleCoilsRequest.fromBuffer(new Buffer([0x0F, 0x00, 0x00, 0x00, 0x01, 0x01]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteMultipleCoilsRequest.fromBuffer(new Buffer([0x03, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint16 at 1 as an address", function()
    {
      var frame = new Buffer([0x0F, 0x12, 0x34, 0x00, 0x01, 0x01, 0x01]);
      var req = WriteMultipleCoilsRequest.fromBuffer(frame);

      req.getAddress().should.be.equal(0x1234);
    });

    it("should read bytes starting at 6 as an array of states of length specified as uint16 at 3", function()
    {
      var frame = new Buffer([0x0F, 0x12, 0x34, 0x00, 0x06, 0x01, 0x3F]);
      var req = WriteMultipleCoilsRequest.fromBuffer(frame);

      req.getStates().should.be.eql([1, 1, 1, 1, 1, 1].map(Boolean)); // 0x3F
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 7 byte Buffer for 2 states", function()
    {
      new WriteMultipleCoilsRequest(0x0001, [0, 1]).toBuffer().length.should.be.equal(7);
    });

    it("should return a 7 byte Buffer for 8 states", function()
    {
      new WriteMultipleCoilsRequest(0x0001, [1, 1, 1, 1, 0, 0, 0, 0]).toBuffer().length.should.be.equal(7);
    });

    it("should return a 8 byte Buffer for 9 states", function()
    {
      new WriteMultipleCoilsRequest(0x0001, [1, 1, 1, 1, 0, 0, 0, 0, 1]).toBuffer().length.should.be.equal(8);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteMultipleCoilsRequest(0x0002, [0, 1]).toBuffer()[0].should.be.equal(0x0F);
    });

    it("should write the address as uint16 at 1", function()
    {
      new WriteMultipleCoilsRequest(0x1234, [0, 1]).toBuffer().readUInt16BE(1).should.be.equal(0x1234);
    });

    it("should write the quantity as uint16 at 3", function()
    {
      new WriteMultipleCoilsRequest(0x0001, [0, 1, 0]).toBuffer().readUInt16BE(3).should.be.equal(3);
    });

    it("should write the following byte count as uint8 at 5", function()
    {
      new WriteMultipleCoilsRequest(0x0001, [0, 1, 0]).toBuffer()[5].should.be.equal(1);
    });

    it("should write the states array as bits starting at 6", function()
    {
      new WriteMultipleCoilsRequest(0x0001, [1, 1, 1]).toBuffer()[6].should.be.eql(0x07); // 0 0 0 0 0 1 1 1
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteMultipleCoilsRequest(0x0001, [0, 1]).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new WriteMultipleCoilsRequest(0x0001, [0, 1]);
      var res = req.createResponse(new Buffer([0x8F, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x0F);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of WriteMultipleCoilsResponse if the function code is not an exception", function()
    {
      var req = new WriteMultipleCoilsRequest(0x0001, [0, 1, 0]);
      var res = req.createResponse(new Buffer([0x0F, 0x00, 0x01, 0x00, 0x03]));

      res.should.be.an.instanceOf(WriteMultipleCoilsResponse);
      res.getCode().should.be.equal(0x0F);
      res.getAddress().should.be.equal(0x0001);
      res.getQuantity().should.be.equal(3);
    });
  });

  describe("getAddress", function()
  {
    it("should return an address specified in the constructor", function()
    {
      new WriteMultipleCoilsRequest(0x1234, [0, 1]).getAddress().should.be.equal(0x1234);
    });
  });

  describe("getStates", function()
  {
    it("should return an array of states specified in the constructor", function()
    {
      new WriteMultipleCoilsRequest(0x1234, [0, 1, 1]).getStates().should.be.eql([0, 1, 1]);
    });
  });
});
