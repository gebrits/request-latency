const _ = require("lodash");
const publicIp = require('public-ip');
const deasync = require('deasync');

//Get server IP synchronously and use it to connect to
//servers on local address if possible.
let serverIp;

function getMyIp(cb) {
  console.log("Fetching serverIP");
  publicIp.v4()
    .then(ip => cb(null, ip))
    .catch(err => cb(err));
}

try {
  serverIp = deasync(getMyIp)();
} catch (err) {
  console.log("FETCHING SERVER IP FAILED. Proceeding by assuming we should target all services remotely");
  serverIp = "BOGUS";
}

//mapping between services and their endpoint.
const serviceEndpointMap = {
  redis: "13.113.183.3"
};

function getServiceEndpoint(serviceName) {
  const ip = serviceEndpointMap[serviceName] === serverIp ? "127.0.0.1" : serviceEndpointMap[serviceName];
  console.log(`Service ${serviceName} available at ${ip}`);
  return ip;
}

module.exports = {
  redis: {
    port: 6379,
    host: getServiceEndpoint("redis"), // Redis host
    family: 4,
    password: 'DAskjdaSAd89438S*AD%^D32SAD$#@#!LAKDk)(&$#@!',
    db: 0
  }
}
