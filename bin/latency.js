#!/usr/bin/env node

/**
 * Imports
 */

var latency = require('..')

/**
 * Argument parsing
 */

var args = process.argv.slice(2)
var url = args[0]
var count = 50

if (!url) usage()
if (args[1]) {
  count = parseInt(args[1], 10)
  if (isNaN(count)) usage()
}

/**
 * Execute the requests
 */

latency(url, count).then(print)

/**
 * Helpers
 */

function print (results) {
  console.log('Url:', results.url)
  console.log('Request count:', results.count)
  console.log('Average:', results.mean)
  console.log('Standard deviation:', results.sd)
  console.log('95th percentile:', results.p95)
  console.log('99th percentile:', results.p99)
}

function usage () {
  console.log('Usage: latency <url> <?count>')
  process.exit(-1)
}
