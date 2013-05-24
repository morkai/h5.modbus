/*jshint maxlen:999*/
/*global describe:false,it:false*/

'use strict';

var should = require('should');
var errors = require((process.env.LIB_FOR_TESTS_DIR || '../lib') + '/errors');

describe("errors", function()
{
  describe("ResponseTimeoutError", function()
  {
    it("should exist", function()
    {
      should.exist(errors.ResponseTimeoutError);
    });

    it("should extend the Error", function()
    {
      should.exist(errors.ResponseTimeoutError.super_);
      errors.ResponseTimeoutError.super_.should.be.equal(Error);
    });

    it("should have proper name", function()
    {
      new errors.ResponseTimeoutError().name.should.be.equal('ResponseTimeoutError');
    });
  });

  describe("InvalidChecksumError", function()
  {
    it("should exist", function()
    {
      should.exist(errors.InvalidChecksumError);
    });

    it("should extend the Error", function()
    {
      should.exist(errors.InvalidChecksumError.super_);
      errors.InvalidChecksumError.super_.should.be.equal(Error);
    });

    it("should have proper name", function()
    {
      new errors.InvalidChecksumError().name.should.be.equal('InvalidChecksumError');
    });
  });

  describe("InvalidResponseDataError", function()
  {
    it("should exist", function()
    {
      should.exist(errors.InvalidResponseDataError);
    });

    it("should extend the Error", function()
    {
      should.exist(errors.InvalidResponseDataError.super_);
      errors.InvalidResponseDataError.super_.should.be.equal(Error);
    });

    it("should have proper name", function()
    {
      new errors.InvalidResponseDataError().name.should.be.equal('InvalidResponseDataError');
    });
  });

  describe("IncompleteResponseFrameError", function()
  {
    it("should exist", function()
    {
      should.exist(errors.IncompleteResponseFrameError);
    });

    it("should extend the Error", function()
    {
      should.exist(errors.IncompleteResponseFrameError.super_);
      errors.IncompleteResponseFrameError.super_.should.be.equal(Error);
    });

    it("should have proper name", function()
    {
      new errors.IncompleteResponseFrameError().name.should.be.equal('IncompleteResponseFrameError');
    });
  });


});
