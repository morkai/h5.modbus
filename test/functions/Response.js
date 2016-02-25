/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

require('should');

var LIB_DIR = process.env.LIB_FOR_TESTS_DIR || '../../lib';

var Response = require(LIB_DIR + '/functions/Response');

describe("Response", function()
{
  describe("getCode", function()
  {
    it("should return the function code specified in the constructor", function()
    {
      new Response(0x01).getCode().should.be.equal(0x01);
    });
  });

  describe("isException", function()
  {
    it("should return false", function()
    {
      new Response(0x01).isException().should.be.equal(false);
    });
  });
});
