var parser = require('../engine.io-parser-small/index');
var Emitter = require('component-emitter');
const debug = require('debug')('engine.io-client-small:transport')


module.exports = Transport;

function Transport (opts) {
  this.path = opts.path;
  this.hostname = opts.hostname;
  this.port = opts.port;
  this.secure = opts.secure;
  this.query = opts.query;
  this.timestampParam = opts.timestampParam;
  this.timestampRequests = opts.timestampRequests;
  this.readyState = '';
  // this.agent = opts.agent || false;
  this.socket = opts.socket;
  // this.enablesXDR = opts.enablesXDR;
  // this.withCredentials = opts.withCredentials;

  // SSL options for Node.js client
  // Node.js配置，先注释
  // this.pfx = opts.pfx;
  // this.key = opts.key;
  // this.passphrase = opts.passphrase;
  // this.cert = opts.cert;
  // this.ca = opts.ca;
  // this.ciphers = opts.ciphers;
  // this.rejectUnauthorized = opts.rejectUnauthorized;
  // this.forceNode = opts.forceNode;

  // results of ReactNative environment detection
  // this.isReactNative = opts.isReactNative;

  // other options for Node.js client
  // Node.js配置，先注释
  // this.extraHeaders = opts.extraHeaders;
  // this.localAddress = opts.localAddress;
}

Emitter(Transport.prototype);

Transport.prototype.open = function () {
  debug('open, readyState: %s', this.readyState);
  if ('closed' === this.readyState || '' === this.readyState) {
    this.readyState = 'opening';
    this.doOpen();
  }

  return this;
};

Transport.prototype.onData = function (data) {
  debug(`req on data: %o`, data)
  var packet = parser.decodePacket(data, this.socket.binaryType);
  this.onPacket(packet);
};

Transport.prototype.onPacket = function (packet) {
  this.emit('packet', packet);
};

Transport.prototype.onError = function (msg, desc) {
  var err = new Error(msg);
  err.type = 'TransportError';
  err.description = desc;
  this.emit('error', err);
  return this;
};
Transport.prototype.onClose = function () {
  this.readyState = 'closed';
  this.emit('close');
};

Transport.prototype.send = function (packets) {
  if ('open' === this.readyState) {
    this.write(packets);
  } else {
    throw new Error('Transport not open');
  }
};

Transport.prototype.close = function () {
  if ('opening' === this.readyState || 'open' === this.readyState) {
    this.doClose();
    this.onClose();
  }

  return this;
};
Transport.prototype.onOpen = function () {
  this.readyState = 'open';
  this.writable = true;
  this.emit('open');
};
