/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadCoilsRequest = require(LIB_DIR + '/functions/ReadCoilsRequest');
var ReadCoilsResponse = require(LIB_DIR + '/functions/ReadCoilsResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("ReadCoilsRequest", function()
{
  it("should throw if the specified address is invalid", function()
  {
    function testLessThanZero1()
    {
      new ReadCoilsRequest(-1337, 1);
    }

    function testLessThanZero2()
    {
      new ReadCoilsRequest(-1, 1);
    }

    function testGreaterThanFFFF()
    {
      new ReadCoilsRequest(0x10000, 1);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanFFFF.should.throw();
  });

  it("should throw if the specified quantity is invalid", function()
  {
    function testLessThanOne1()
    {
      new ReadCoilsRequest(0x0000, 0);
    }

    function testLessThanOne2()
    {
      new ReadCoilsRequest(0x0000, -1337);
    }

    function testGreaterThan2000()
    {
      new ReadCoilsRequest(0x0000, 2001);
    }

    testLessThanOne1.should.throw();
    testLessThanOne2.should.throw();
    testGreaterThan2000.should.throw();
  });

  it("should use 0x0000 as a default address", function()
  {
    new ReadCoilsRequest().getAddress().should.be.equal(0x0000);
  });

  it("should use 1 as a default quantity", function()
  {
    new ReadCoilsRequest().getQuantity().should.be.equal(1);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadCoilsRequest(0x0000, 2).getCode().should.be.equal(0x01);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = ReadCoilsRequest.fromOptions({
        address: 0x0001,
        quantity: 2
      });

      req.getAddress().should.be.equal(0x0001);
      req.getQuantity().should.be.equal(2);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 5 bytes long", function()
    {
      function test1()
      {
        ReadCoilsRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        ReadCoilsRequest.fromBuffer(new Buffer([0x01, 0x00, 0x01, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadCoilsRequest.fromBuffer(new Buffer([0x00, 0x00, 0x01, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint16 at 1 as an address", function()
    {
      ReadCoilsRequest.fromBuffer(new Buffer([0x01, 0x12, 0x34, 0x00, 0x11])).getAddress().should.be.equal(0x1234);
    });

    it("should read uint16 at 3 as a quantity", function()
    {
      ReadCoilsRequest.fromBuffer(new Buffer([0x01, 0x12, 0x34, 0x00, 0x11])).getQuantity().should.be.equal(0x0011);
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 5 byte Buffer", function()
    {
      new ReadCoilsRequest(0x0001, 2).toBuffer().length.should.be.equal(5);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadCoilsRequest(0x0002, 3).toBuffer()[0].should.be.equal(0x01);
    });

    it("should write the address as uint16 at 1", function()
    {
      new ReadCoilsRequest(0x1234, 3).toBuffer().readUInt16BE(1).should.be.equal(0x1234);
    });

    it("should write the quantity as uint16 at 3", function()
    {
      new ReadCoilsRequest(0x0001, 1000).toBuffer().readUInt16BE(3).should.be.equal(1000);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadCoilsRequest(0x0001, 2).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new ReadCoilsRequest(0x0001, 2);
      var res = req.createResponse(new Buffer([0x81, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x01);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of ReadCoilsResponse if the function code is not an exception", function()
    {
      var req = new ReadCoilsRequest(0x0001, 2);
      var res = req.createResponse(new Buffer([0x01, 0x01, 0x00]));

      res.should.be.an.instanceOf(ReadCoilsResponse);
      res.getCode().should.be.equal(0x01);
      res.getCount().should.be.equal(8);
    });
  });

  describe("getAddress", function()
  {
    it("should return an address specified in the constructor", function()
    {
      new ReadCoilsRequest(0x1234, 10).getAddress().should.be.equal(0x1234);
    });
  });

  describe("getQuantity", function()
  {
    it("should return a quantity specified in the constructor", function()
    {
      new ReadCoilsRequest(0x1234, 10).getQuantity().should.be.equal(10);
    });
  });
});
