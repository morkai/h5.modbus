/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ExceptionResponse = require(LIB_DIR + '/functions/ExceptionResponse');

describe("ExceptionResponse", function()
{
  describe("getCode", function()
  {
    it("should return the function code specified in the constructor", function()
    {
      new ExceptionResponse(0x01, 2).getCode().should.be.equal(0x01);
    });
  });

  describe("getExceptionCode", function()
  {
    it("should return the exception code specified in the constructor", function()
    {
      new ExceptionResponse(0x01, 2).getExceptionCode().should.be.equal(2);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var res = ExceptionResponse.fromOptions({
        functionCode: 0x01,
        exceptionCode: 2
      });

      res.getCode().should.be.equal(0x01);
      res.getExceptionCode().should.be.equal(2);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 2 bytes long", function()
    {
      function test1()
      {
        ExceptionResponse.fromBuffer(new Buffer([]));
      }

      function test2()
      {
        ExceptionResponse.fromBuffer(new Buffer([0x81]));
      }

      test1.should.throw();
      test2.should.throw();
    });

    it("should throw if the first byte is a number <= 0x80", function()
    {
      function test1()
      {
        ExceptionResponse.fromBuffer(new Buffer([0x05, 0x00, 0x01]));
      }

      function test2()
      {
        ExceptionResponse.fromBuffer(new Buffer([0x79, 0x00, 0x01]));
      }

      function test3()
      {
        ExceptionResponse.fromBuffer(new Buffer([0x80, 0x00, 0x01]));
      }

      test1.should.throw();
      test2.should.throw();
      test3.should.throw();
    });

    it("should use a value of the first byte minus 0x80 as a function code", function()
    {
      ExceptionResponse.fromBuffer(new Buffer([0x81, 2])).getCode().should.be.equal(0x01);
    });

    it("should use a value of the second byte as an exception code", function()
    {
      ExceptionResponse.fromBuffer(new Buffer([0x81, 2])).getExceptionCode().should.be.equal(0x02);
    });
  });

  describe("isException", function()
  {
    it("should return true", function()
    {
      new ExceptionResponse(0x01, 2).isException().should.be.equal(true);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ExceptionResponse(0x01, 2).toString().should.be.a('string');
    });

    it("should include the function code", function()
    {
      new ExceptionResponse(0x01, 2).toString().should.match(/0x01/);
      new ExceptionResponse(0x22, 2).toString().should.match(/0x22/);
    });

    it("should include the exception code", function()
    {
      new ExceptionResponse(0x01, 2).toString().should.match(/2/);
      new ExceptionResponse(0x01, 99).toString().should.match(/99/);
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 2 byte long Buffer", function()
    {
      new ExceptionResponse(0x01, 2).toBuffer().length.should.be.equal(2);
    });

    it("should set the first byte to a function code plus 0x80", function()
    {
      new ExceptionResponse(0x01, 2).toBuffer()[0].should.be.equal(0x81);
    });

    it("should set the second byte to an exception", function()
    {
      new ExceptionResponse(0x01, 2).toBuffer()[1].should.be.equal(0x02);
    });
  });


});
