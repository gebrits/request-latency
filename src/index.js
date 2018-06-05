/**
 * Imports
 */

const sd = require('stdev')
const sleep = require('@f/sleep')
const elapsed = require('@f/elapsed-time')
const rp = require('request-promise');


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

  return new Promise((resolve, reject) => {

    let counterDone = 0;

    for (var i = 0; i < n; i++) {

      setTimeout(() => {

        const t = elapsed();

        rp(url).then(({ serverTime }) => {

          times.push(t());

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

        });

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
