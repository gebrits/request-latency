
# request-latency

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

Measure GET request latency (supports only gets for now, maybe other things in the future)

*Note: This library uses generators natively. So it requires node v4 or above*

## Installation

    $ npm install request-latency

## Usage

    $ latency https://api.github.com
      Url: https://api.github.com
      Request count: 50
      Average: 292.96
      Standard deviation: 180.9469491315065
      95th percentile: 590.6177313213282
      99th percentile: 713.8426036798842

## Command line

`latency <url> <?count>`

`count` defaults to 50, and is optional.

## API

```javascript
var latency = require('latency')
var url = 'https://api.github.com'
var count = 50

latency(url, count).then(function (results) {
  console.log('Url:', results.url)
  console.log('Request count:', results.count)
  console.log('Average:', results.mean)
  console.log('Standard deviation:', results.sd)
  console.log('95th percentile:', results.p95)
  console.log('99th percentile:', results.p99)
})
```

## License

MIT
