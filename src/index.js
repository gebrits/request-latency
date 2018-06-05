/**
 * Imports
 */

const co = require('co')
const sd = require('stdev')
const axios = require('axios')
const sleep = require('@f/sleep')
const elapsed = require('@f/elapsed-time')

/**
 * Request latency
 */

const latency = co.wrap(function* (url, n = 50, sleepMs = 30) {

  console.log(`n = ${n} / sleep = ${sleepMs}`);

  const times = []

  for (var i = 0; i < n; i++) {
    var t = elapsed()
    yield axios(url)
    times.push(t())
    yield sleep(sleepMs)
  }

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
})

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
