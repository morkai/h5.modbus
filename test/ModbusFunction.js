/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var ModbusFunction = require((process.env.LIB_FOR_TESTS_DIR || '../lib') + '/ModbusFunction');

describe("ModbusFunction", function()
{
  describe("fromOptions", function()
  {
    it("should throw", function()
    {
      function test()
      {
        ModbusFunction.fromOptions({});
      }

      test.should.throw();
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw", function()
    {
      function test()
      {
        ModbusFunction.fromBuffer(new Buffer(0));
      }

      test.should.throw();
    });
  });

  describe("toBuffer", function()
  {
    it("should throw", function()
    {
      function test()
      {
        new ModbusFunction(1337).toBuffer();
      }

      test.should.throw();
    });
  });

  describe("toString", function()
  {
    it("should throw", function()
    {
      function test()
      {
        new ModbusFunction(1337).toString();
      }

      test.should.throw();
    });
  });

  describe("getCode", function()
  {
    it("should return the code specified in the constructor", function()
    {
      new ModbusFunction(1337).getCode().should.be.equal(1337);
    });
  });
});
