/**
 * Imports
 */

require('http').globalAgent.maxSockets = Infinity;
require('https').globalAgent.maxSockets = Infinity;

const sd = require('stdev')
const sleep = require('@f/sleep')
const elapsed = require('@f/elapsed-time')
const request = require('request');
const _ = require("lodash");


/**
 * Request latency
 */

function latency(url, n = 50, sleepMs = 30) {

  console.log(`n = ${n} / sleep = ${sleepMs}`);

  const times = []

  function onDone() {
    const sigma = sd(times)
    const mu = mean(times)

    return {
      url,
      count: n,
      times,
      mean: mu,
      sd: sigma,
      p95: p95(mu, sigma),
      p99: p99(mu, sigma)
    }
  }

  const timingParams = ["timingStart", "timingPhases"]; //"timings" = accumulated timingPhases

  return new Promise((resolve, reject) => {

    let counterDone = 0;

    for (var i = 0; i < n; i++) {

      setTimeout(() => {

        const t = elapsed();

        const start = new Date().getTime();

        request({
          url: url,
          time: true
        }, (err, resp, body) => {

          times.push(t());

          const timingsPartial = _.pick(resp, timingParams);

          const timings = _.extend({
            startClient: start,
            startClientDelta: timingsPartial.timingStart - start
          }, timingsPartial, {
            stopClient: new Date().getTime()
          });

          timings.stopClientDelta = timings.stopClient - timings.timingStart - timings.timingPhases.total

          console.log("##############");
          console.log(timings);

          if (++counterDone === n) {

            const sigma = sd(times)
            const mu = mean(times)

            resolve({
              url,
              count: n,
              times,
              mean: mu,
              sd: sigma,
              p95: p95(mu, sigma),
              p99: p99(mu, sigma)
            });
          }

        })

      }, i * sleepMs);

    }
  })
}


/**
 * Helpers
 */

function mean(list) {
  return list.reduce((acc, item) => acc + item, 0) / list.length
}

function p95(mu, sigma) {
  const z = 1.645
  return percentile(z, mu, sigma)
}

function p99(mu, sigma) {
  const z = 2.326
  return percentile(z, mu, sigma)
}

function percentile(z, mu, sigma) {
  return z * sigma + mu
}

/**
 * Exports
 */

module.exports = latency
