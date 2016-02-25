/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var ReadDiscreteInputsResponse = require(LIB_DIR + '/functions/ReadDiscreteInputsResponse');

describe("ReadDiscreteInputsResponse", function()
{
  it("should throw if the specified array is invalid", function()
  {
    function testEmpty()
    {
      new ReadDiscreteInputsResponse([]);
    }

    function testGreaterThan2000()
    {
      new ReadDiscreteInputsResponse(new Array(2001));
    }

    testEmpty.should.throw();
    testGreaterThan2000.should.throw();
  });

  describe("getCode", function()
  {
    it("should return a valid function code", function()
    {
      new ReadDiscreteInputsResponse([true, false, true, false]).getCode().should.be.equal(0x02);
    });
  });

  describe("fromOptions", function()
  {
    it("should create an instance from the specified options object", function()
    {
      var res = ReadDiscreteInputsResponse.fromOptions({
        states: [false, true, false, true]
      });

      res.getStates().should.be.eql([false, true, false, true]);
    });
  });

  describe("fromBuffer", function()
  {
    it("should throw if the specified Buffer is not at least 1 byte long", function()
    {
      function test()
      {
        ReadDiscreteInputsResponse.fromBuffer(new Buffer([]));
      }

      test.should.throw();
    });

    it("should throw if the first byte is an invalid function code", function()
    {
      function test()
      {
        ReadDiscreteInputsResponse.fromBuffer(new Buffer([0x01, 0x00]));
      }

      test.should.throw();
    });

    it("should read N bytes starting at 2 where N is a byte at 1 as an array of states", function()
    {
      ReadDiscreteInputsResponse.fromBuffer(new Buffer([0x02, 0x02, 0xCB, 0x01, 0xFF])).getStates().should.be.eql([
        1, 1, 0, 1, 0, 0, 1, 1, // 0xCB
        1, 0, 0, 0, 0, 0, 0, 0  // 0x01
      ].map(Boolean));
    });
  });

  describe("toBuffer", function()
  {
    it("should return a 4 byte long Buffer for an array of 9 states", function()
    {
      new ReadDiscreteInputsResponse([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).toBuffer().length.should.be.equal(4);
    });

    it("should write the function code as uint8 at 0", function()
    {
      new ReadDiscreteInputsResponse([0, 1]).toBuffer()[0].should.be.equal(0x02);
    });

    it("should write the following byte count as uint8 at 1", function()
    {
      new ReadDiscreteInputsResponse([1, 1, 1, 1, 0, 0, 0, 0, 1]).toBuffer()[1].should.be.equal(2);
    });

    it("should write the array of states as bits of the following bytes", function()
    {
      var res = new ReadDiscreteInputsResponse([1, 1, 1, 1, 0, 0, 0, 0, 1]);
      var buf = res.toBuffer();

      buf[2].should.be.equal(0x0F);
      buf[3].should.be.equal(0x01);
    });
  });

  describe("toString", function()
  {
    it("should return a string", function()
    {
      new ReadDiscreteInputsResponse([0, 1, 1, 0]).toString().should.be.a('string');
    });
  });

  describe("getStates", function()
  {
    it("should return an array of states specified in the constructor", function()
    {
      new ReadDiscreteInputsResponse([0, 1, 1, 0]).getStates().should.be.eql([0, 1, 1, 0]);
    });
  });

  describe("getCount", function()
  {
    it("should return a length of the states array specified in the constructor", function()
    {
      new ReadDiscreteInputsResponse([0, 1, 1, 0]).getCount().should.be.eql(4);
    });
  });

  describe("isOn", function()
  {
    it("should throw if the specified offset is out of bounds", function()
    {
      var res = new ReadDiscreteInputsResponse([0, 1, 1, 0]);

      function testLowerBound()
      {
        res.isOn(-1);
      }

      function testUpperBound()
      {
        res.isOn(4);
      }

      testLowerBound.should.throw();
      testUpperBound.should.throw();
    });

    it("should return true if a bit at the specified offset is a truthy value", function()
    {
      new ReadDiscreteInputsResponse([0, 1, 1, 0]).isOn(1).should.be.equal(true);
      new ReadDiscreteInputsResponse([true, false]).isOn(0).should.be.equal(true);
    });

    it("should return false if a bit at the specified offset is a falsy value", function()
    {
      new ReadDiscreteInputsResponse([0, 1, 1, 0]).isOn(3).should.be.equal(false);
      new ReadDiscreteInputsResponse([true, false]).isOn(1).should.be.equal(false);
    });
  });

  describe("isOff", function()
  {
    it("should throw if the specified offset is out of bounds", function()
    {
      var res = new ReadDiscreteInputsResponse([0, 1, 1, 0]);

      function testLowerBound()
      {
        res.isOff(-1);
      }

      function testUpperBound()
      {
        res.isOff(4);
      }

      testLowerBound.should.throw();
      testUpperBound.should.throw();
    });

    it("should return true if a bit at the specified offset is a falsy value", function()
    {
      new ReadDiscreteInputsResponse([0, 1, 1, 0]).isOff(3).should.be.equal(true);
      new ReadDiscreteInputsResponse([true, false]).isOff(1).should.be.equal(true);
    });

    it("should return false if a bit at the specified offset is a truthy value", function()
    {
      new ReadDiscreteInputsResponse([0, 1, 1, 0]).isOff(1).should.be.equal(false);
      new ReadDiscreteInputsResponse([true, false]).isOff(0).should.be.equal(false);
    });
  });
});
