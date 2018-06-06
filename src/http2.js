/**
 * Imports
 */

require('http').globalAgent.maxSockets = Infinity;
require('https').globalAgent.maxSockets = Infinity;

const http2 = require('http2');
const sd = require('stdev')
const request = require('request');
const _ = require("lodash");
const argv = require("yargs").argv;
const URL = require("url");

const url = URL.parse(argv.url || "");

if (!url.host) {
  throw new Error("--url is required and should be a valid Url")
}

latency(url, +argv.n || 50, +argv.sleep || 50, argv.keepAlive == "true");

function latency(url, n, sleepMs, keepAlive) {

  console.log(`url = ${url} / n = ${n} / sleep = ${sleepMs} / keepAlive = ${keepAlive}`);

  const client = http2.connect(`${url.protocol}//${url.host}`, {
    settings: {
      maxConcurrentStreams: 1024
    }
  });
  client.on('error', (err) => console.error(err));

  const times = []

  let nrErrors = 0;
  new Promise((resolve, reject) => {

      let counterDone = 0;

      for (var i = 0; i < n; i++) {

        setTimeout(() => {

          const start = process.hrtime();

          const req = client.request({ ':path': url.path });
          req.on('response', (headers, flags) => {

            let data = '';
            req.on('data', chunk => { data += chunk; })
              .on('end', () => {

                const endHR = process.hrtime(start);

                const tookMS = ((endHR[0] * 10 ^ 9) + endHR[1]) / 1000000; //from nano to milli 
                console.log("took (ms)", tookMS);
                times.push(tookMS);

                if (++counterDone === n) {
                  client.destroy(); // try remove this line see what changed?

                  const sigma = sd(times)
                  const mu = mean(times)

                  resolve({
                    url,
                    count: n,
                    times,
                    mean: mu,
                    sd: sigma,
                    p10: p10(mu, sigma),
                    p50: p50(mu, sigma),
                    p95: p95(mu, sigma),
                    p99: p99(mu, sigma)
                  });
                }
              });
          });

        }, i * sleepMs);

      }
    })
    .then(results => {

      const sortedTimes = times.sort();
      const median = sortedTimes[Math.ceil(sortedTimes.length / 2)];

      console.log("#########################");
      console.log('Url:', results.url)
      console.log('Request count:', results.count)
      console.log('Average:', results.mean)
      console.log("Median", median)
      console.log('Standard deviation:', results.sd)
      console.log('10th percentile:', results.p10)
      console.log('95th percentile:', results.p95)
      console.log('99th percentile:', results.p99)
      console.log("errors", nrErrors)
    })
}

/**
 * Helpers
 */

function mean(list) {
  return list.reduce((acc, item) => acc + item, 0) / list.length
}

function p50(mu, sigma) {
  const z = 0
  return percentile(z, mu, sigma)
}

function p10(mu, sigma) {
  const z = -1.28155
  return percentile(z, mu, sigma)
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
