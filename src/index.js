/**
 * Imports
 */

require('http').globalAgent.maxSockets = Infinity;
require('https').globalAgent.maxSockets = Infinity;

const sd = require('stdev')
const request = require('request');
const _ = require("lodash");
const argv = require("yargs").argv;

/**
 * Request latency
 */

if (!argv.url) {
  throw new Error("--url not defined")
}


if (argv.single) {
  oneReq(argv.url);
} else {
  latency(argv.url, +argv.n || 50, +argv.sleep || 30, argv.keepAlive == "true");
}

const timingParams = ["timingStart", "timingPhases"]; //"timings" = accumulated timingPhases

function latency(url, n, sleepMs, keepAlive) {

  console.log(`url = ${url} / n = ${n} / sleep = ${sleepMs} / keepAlive = ${keepAlive}`);

  const times = []

  new Promise((resolve, reject) => {

      let counterDone = 0;

      for (var i = 0; i < n; i++) {

        setTimeout(() => {

          const start = new Date().getTime();

          request({
            url: url,
            time: true,
            forever: keepAlive
          }, (err, resp, body) => {

            const stop = new Date().getTime();

            times.push(stop - start);

            const timingsPartial = _.pick(resp, timingParams);

            const timings = _.extend({
              startClient: start,
              startClientDelta: timingsPartial.timingStart - start
            }, timingsPartial, {
              stopClient: stop
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
    .then(results => {
      console.log("#########################");
      console.log('Url:', results.url)
      console.log('Request count:', results.count)
      console.log('Average:', results.mean)
      console.log('Standard deviation:', results.sd)
      console.log('95th percentile:', results.p95)
      console.log('99th percentile:', results.p99)
    })
}

function oneReq(url) {

  const start = new Date().getTime();

  request({
    url: url,
    time: true
  }, (err, resp, body) => {

    const stop = new Date().getTime();

    const timingsPartial = _.pick(resp, timingParams);

    const timings = _.extend({
      startClient: start,
      startClientDelta: timingsPartial.timingStart - start
    }, timingsPartial, {
      stopClient: stop
    });

    timings.stopClientDelta = timings.stopClient - timings.timingStart - timings.timingPhases.total

    console.log("##############");
    console.log(timings);
  });
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
