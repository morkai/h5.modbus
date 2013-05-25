/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var WriteMultipleCoilsResponse = require(LIB_DIR + '/functions/WriteMultipleCoilsResponse');

describe("WriteMultipleCoilsResponse", function()
{
  it("should throw if the specified address is invalid", function()
  {
    function testLessThanZero1()
    {
      new WriteMultipleCoilsResponse(-1337, 1);
    }

    function testLessThanZero2()
    {
      new WriteMultipleCoilsResponse(-1, 1);
    }

    function testGreaterThanFFFF()
    {
      new WriteMultipleCoilsResponse(0x10000, 1);
    }

    testLessThanZero1.should.throw();
    testLessThanZero2.should.throw();
    testGreaterThanFFFF.should.throw();
  });

  it("should throw if the specified quantity is invalid", function()
  {
    function testLessThanOne1()
    {
      new WriteMultipleCoilsResponse(0x0000, 0);
    }

    function testLessThanOne2()
    {
      new WriteMultipleCoilsResponse(0x0000, -1337);
    }

    function testGreaterThan1968()
    {
      new WriteMultipleCoilsResponse(0x0000, 1979);
    }

    testLessThanOne1.should.throw();
    testLessThanOne2.should.throw();
    testGreaterThan1968.should.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new WriteMultipleCoilsResponse(0x0000, 2).getCode().should.be.equal(0x0F);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var res = WriteMultipleCoilsResponse.fromOptions({
        address: 0x1234,
        quantity: 2
      });

      res.getAddress().should.be.equal(0x1234);
      res.getQuantity().should.be.equal(2);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 5 bytes long", function()
    {
      function test1()
      {
        WriteMultipleCoilsResponse.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        WriteMultipleCoilsResponse.fromBuffer(new Buffer([0x0F, 0x12, 0x34, 0x00]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        WriteMultipleCoilsResponse.fromBuffer(new Buffer([0x03, 0x12, 0x34, 0x00, 0x01]));
      }

      test.should.throw();
    });

    it("should read uint16 at 1 as an address", function()
    {
      WriteMultipleCoilsResponse.fromBuffer(new Buffer([0x0F, 0x12, 0x34, 0x00, 0x11])).getAddress().should.be.equal(0x1234);
    });

    it("should read uint16 at 3 as a quantity", function()
    {
      WriteMultipleCoilsResponse.fromBuffer(new Buffer([0x0F, 0x12, 0x34, 0x00, 0x11])).getQuantity().should.be.equal(0x0011);
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 5 byte Buffer", function()
    {
      new WriteMultipleCoilsResponse(0x0001, 2).toBuffer().length.should.be.equal(5);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new WriteMultipleCoilsResponse(0x0002, 3).toBuffer()[0].should.be.equal(0x0F);
    });

    it("should write the address as uint16 at 1", function()
    {
      new WriteMultipleCoilsResponse(0x1234, 3).toBuffer().readUInt16BE(1).should.be.equal(0x1234);
    });

    it("should write the quantity as uint16 at 3", function()
    {
      new WriteMultipleCoilsResponse(0x0001, 1000).toBuffer().readUInt16BE(3).should.be.equal(1000);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new WriteMultipleCoilsResponse(0x0001, 2).toString().should.be.a('string');
    });
  });

  describe("getAddress", function()
  {
    it("should return an address specified in the constructor", function()
    {
      new WriteMultipleCoilsResponse(0x1234, 10).getAddress().should.be.equal(0x1234);
    });
  });

  describe("getQuantity", function()
  {
    it("should return a quantity specified in the constructor", function()
    {
      new WriteMultipleCoilsResponse(0x1234, 10).getQuantity().should.be.equal(10);
    });
  });
});
