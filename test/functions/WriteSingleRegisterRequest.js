/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteSingleRegisterRequest = require(LIB_DIR + '/functions/WriteSingleRegisterRequest');
var WriteSingleRegisterResponse = require(LIB_DIR + '/functions/WriteSingleRegisterResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("WriteSingleRegisterRequest", function()
{
  it("should throw if the specified address is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteSingleRegisterRequest(-1337, 0x1234);
    }

    function testLessThanZero2()
    {
      new WriteSingleRegisterRequest(-1, 0x1234);
    }

    function testGreaterThanFFFF()
    {
      new WriteSingleRegisterRequest(0x10000, 0x1234);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanFFFF.should.throw();
  });

  it("should use 0x0000 as a default address", function()
  {
    new WriteSingleRegisterRequest().getAddress().should.be.equal(0x0000);
  });

  it("should use 0 as a default value", function()
  {
    new WriteSingleRegisterRequest().getValue().should.be.equal(0);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteSingleRegisterRequest(0x0000, 0x1337).getCode().should.be.equal(0x06);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = WriteSingleRegisterRequest.fromOptions({
        address: 0x0001,
        value: 0x1234
      });

      req.getAddress().should.be.equal(0x0001);
      req.getValue().should.be.equal(0x1234);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 5 bytes long", function()
    {
      function test1()
      {
        WriteSingleRegisterRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteSingleRegisterRequest.fromBuffer(new Buffer([0x06, 0x00, 0x01, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteSingleRegisterRequest.fromBuffer(new Buffer([0x03, 0x00, 0x00, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint16 at 1 as an address", function()
    {
      var frame = new Buffer([0x06, 0x12, 0x34, 0x00, 0x01]);
      var req = WriteSingleRegisterRequest.fromBuffer(frame);

      req.getAddress().should.be.equal(0x1234);
    });

    it("should read uint16 at 3 as a value", function()
    {
      var frame = new Buffer([0x06, 0x12, 0x34, 0x13, 0x37]);
      var req = WriteSingleRegisterRequest.fromBuffer(frame);

      req.getValue().should.be.equal(0x1337);
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 5 byte long Buffer", function()
    {
      new WriteSingleRegisterRequest(0x0001, 0x1234).toBuffer().length.should.be.equal(5);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteSingleRegisterRequest(0x0002, 0x1234).toBuffer()[0].should.be.equal(0x06);
    });

    it("should write the address as uint16 at 1", function()
    {
      new WriteSingleRegisterRequest(0x1234, 0x1337).toBuffer().readUInt16BE(1).should.be.equal(0x1234);
    });

    it("should write the value as uint16 at 3", function()
    {
      new WriteSingleRegisterRequest(0x0001, 0x1337).toBuffer().readUInt16BE(3).should.be.equal(0x1337);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteSingleRegisterRequest(0x0001, 0x1337).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new WriteSingleRegisterRequest(0x0001, 0x1337);
      var res = req.createResponse(new Buffer([0x86, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x06);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of WriteSingleRegisterResponse if the function code is not an exception", function()
    {
      var req = new WriteSingleRegisterRequest(0x0001, 0x1337);
      var res = req.createResponse(new Buffer([0x06, 0x00, 0x01, 0x13, 0x37]));

      res.should.be.an.instanceOf(WriteSingleRegisterResponse);
      res.getCode().should.be.equal(0x06);
      res.getAddress().should.be.equal(0x0001);
      res.getValue().should.be.equal(0x1337);
    });
  });

  describe("getAddress", function()
  {
    it("should return an address specified in the constructor", function()
    {
      new WriteSingleRegisterRequest(0x1234, 0x1337).getAddress().should.be.equal(0x1234);
    });
  });

  describe("getValue", function()
  {
    it("should return a value specified in the constructor", function()
    {
      new WriteSingleRegisterRequest(0x1234, 0x1337).getValue().should.be.equal(0x1337);
    });
  });
});
