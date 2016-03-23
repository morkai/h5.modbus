// Part of <http://miracle.systems/p/modbus-master> licensed under <MIT>

'use strict';

module.exports = {
  startTime: Date.now(),
  err: 0,
  req: 0,
  reqPrev: 0,
  res: 0,
  resPrev: 0,
  rpsMin: Number.MAX_SAFE_INTEGER,
  rpsMax: Number.MIN_SAFE_INTEGER,
  rssMin: Number.MAX_SAFE_INTEGER,
  rssMax: Number.MIN_SAFE_INTEGER,
  reset: function()
  {
    this.startTime = Date.now();
    this.err = 0;
    this.req = 0;
    this.reqPrev = 0;
    this.res = 0;
    this.resPrev = 0;
    this.rpsMin = Number.MAX_SAFE_INTEGER;
    this.rpsMax = Number.MIN_SAFE_INTEGER;
    this.rssMin = Number.MAX_SAFE_INTEGER;
    this.rssMax = Number.MIN_SAFE_INTEGER;
  },
  show: function()
  {
    const rps = Math.round(this.res / Math.round((Date.now() - this.startTime) / 1000));
    const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const rpsCur = this.res - this.resPrev;

    if (rss < this.rssMin)
    {
      this.rssMin = rss;
    }

    if (rss > this.rssMax)
    {
      this.rssMax = rss;
    }

    if (rps < this.rpsMin)
    {
      this.rpsMin = rps;
    }

    if (rps > this.rpsMax && isFinite(rps))
    {
      this.rpsMax = rps;
    }

    this.reqPrev = this.req;
    this.resPrev = this.res;

    console.log(
      `rps=${rps} (min=${this.rpsMin} max=${this.rpsMax} cur=${rpsCur}) `
      + `req=${this.req} res=${this.req} err=${this.err} `
      + `rss=${rss} (min=${this.rssMin} max=${this.rssMax})`
    );
  }
};
