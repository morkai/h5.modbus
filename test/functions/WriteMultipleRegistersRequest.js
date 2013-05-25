/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteMultipleRegistersRequest = require(LIB_DIR + '/functions/WriteMultipleRegistersRequest');
var WriteMultipleRegistersResponse = require(LIB_DIR + '/functions/WriteMultipleRegistersResponse');
var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("WriteMultipleRegistersRequest", function()
{
  it("should throw if the specified address is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteMultipleRegistersRequest(-1337, 1);
    }

    function testLessThanZero2()
    {
      new WriteMultipleRegistersRequest(-1, 1);
    }

    function testGreaterThanFFFF()
    {
      new WriteMultipleRegistersRequest(0x10000, 1);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanFFFF.should.throw();
  });

  it("should throw if the specified Buffer is invalid", function()
  {
    function testEmpty()
    {
      new WriteMultipleRegistersRequest(new Buffer(0));
    }

    function testGreaterThan246()
    {
      new WriteMultipleRegistersRequest(new Buffer(247));
    }

    function testOdd()
    {
      new WriteMultipleRegistersRequest(new Buffer(101));
    }

    testEmpty.should.throw();
    testGreaterThan246.should.throw();
    testOdd.should.throw();
  });

  it("should use 0x0000 as a default address", function()
  {
    new WriteMultipleRegistersRequest(undefined, new Buffer([0x00, 0x01])).getAddress().should.be.equal(0x0000);
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteMultipleRegistersRequest(0x0000, [0x00, 0x01]).getCode().should.be.equal(0x10);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var req = WriteMultipleRegistersRequest.fromOptions({
        address: 0x0001,
        values: new Buffer([0x00, 0x10])
      });

      req.getAddress().should.be.equal(0x0001);
      req.getValues().should.be.eql(new Buffer([0x00, 0x10]));
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 8 bytes long", function()
    {
      function test1()
      {
        WriteMultipleRegistersRequest.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteMultipleRegistersRequest.fromBuffer(new Buffer([0x10, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteMultipleRegistersRequest.fromBuffer(new Buffer([0x03, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint16 at 1 as an address", function()
    {
      var frame = new Buffer([0x10, 0x12, 0x34, 0x00, 0x01, 0x02, 0x00, 0x01]);
      var req = WriteMultipleRegistersRequest.fromBuffer(frame);

      req.getAddress().should.be.equal(0x1234);
    });

    it("should read bytes starting at 6 as Buffer of length specified as uint16 at 3", function()
    {
      var frame = new Buffer([0x10, 0x12, 0x34, 0x00, 0x02, 0x04, 0x00, 0x01, 0x00, 0x02]);
      var req = WriteMultipleRegistersRequest.fromBuffer(frame);

      req.getValues().should.be.eql(new Buffer([0x00, 0x01, 0x00, 0x02]));
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 8 byte Buffer for 1 register", function()
    {
      new WriteMultipleRegistersRequest(0x0001, new Buffer([0x00, 0x01])).toBuffer().length.should.be.equal(8);
    });

    it("should return a 10 byte Buffer for 2 registers", function()
    {
      new WriteMultipleRegistersRequest(0x0001, new Buffer([0x00, 0x01, 0x00, 0x02])).toBuffer().length.should.be.equal(10);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteMultipleRegistersRequest(0x0002, new Buffer([0x00, 0x01])).toBuffer()[0].should.be.equal(0x10);
    });

    it("should write the address as uint16 at 1", function()
    {
      new WriteMultipleRegistersRequest(0x1234, new Buffer([0x00, 0x01])).toBuffer().readUInt16BE(1).should.be.equal(0x1234);
    });

    it("should write the quantity as uint16 at 3", function()
    {
      new WriteMultipleRegistersRequest(0x0001, new Buffer([0x00, 0x01])).toBuffer().readUInt16BE(3).should.be.equal(1);
    });

    it("should write the following byte count as uint8 at 5", function()
    {
      new WriteMultipleRegistersRequest(0x0001, new Buffer([0x00, 0x01])).toBuffer()[5].should.be.equal(2);
    });

    it("should write the values Buffer starting at 6", function()
    {
      var req = new WriteMultipleRegistersRequest(0x0001, new Buffer([0x13, 0x37]));
      var buf = req.toBuffer();

      buf[6].should.be.eql(0x13);
      buf[7].should.be.eql(0x37);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteMultipleRegistersRequest(0x0001, new Buffer([0x00, 0x01])).toString().should.be.a('string');
    });
  });

  describe("createResponse", function()
  {
    it("should return an instance of ExceptionResponse if the function code is an exception", function()
    {
      var req = new WriteMultipleRegistersRequest(0x0001, [0, 1]);
      var res = req.createResponse(new Buffer([0x90, 0x02]));

      res.should.be.an.instanceOf(ExceptionResponse);
      res.getCode().should.be.equal(0x10);
      res.getExceptionCode().should.be.equal(2);
    });

    it("should return an instance of WriteMultipleRegistersResponse if the function code is not an exception", function()
    {
      var req = new WriteMultipleRegistersRequest(0x0001, new Buffer([0x00, 0x01]));
      var res = req.createResponse(new Buffer([0x10, 0x00, 0x01, 0x00, 0x01]));

      res.should.be.an.instanceOf(WriteMultipleRegistersResponse);
      res.getCode().should.be.equal(0x10);
      res.getAddress().should.be.equal(0x0001);
      res.getQuantity().should.be.equal(1);
    });
  });

  describe("getAddress", function()
  {
    it("should return an address specified in the constructor", function()
    {
      new WriteMultipleRegistersRequest(0x1234, new Buffer([0x00, 0x01])).getAddress().should.be.equal(0x1234);
    });
  });

  describe("getValues", function()
  {
    it("should return a values Buffer specified in the constructor", function()
    {
      new WriteMultipleRegistersRequest(0x1234, new Buffer([0x00, 0x01])).getValues().should.be.eql(new Buffer([0x00, 0x01]));
    });
  });
});
