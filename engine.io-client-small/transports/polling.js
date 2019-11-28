var Transport = require('../transport');
var parseqs = require('parseqs');
var parser = require('../../engine.io-parser-small/index');
var inherit = require('component-inherit');
var yeast = require('yeast');
var debug = require('debug')('engine.io-client-small:polling');

module.exports = Polling;

var hasXHR2 = (function () {
  var XMLHttpRequest = require('xmlhttprequest-ssl');
  var xhr = new XMLHttpRequest({ xdomain: false });
  return null != xhr.responseType;
})();


function Polling (opts) {
  // var forceBase64 = (opts && opts.forceBase64);
  // if (forceBase64) {
  //   this.supportsBinary = false;
  // }
  Transport.call(this, opts);
}

inherit(Polling, Transport);

Polling.prototype.name = 'polling'

Polling.prototype.doOpen = function () {
  debug('this.poll in doOpen')
  this.poll();
};

Polling.prototype.poll = function () {
  debug('polling');
  this.polling = true;
  this.doPoll();
  this.emit('poll');
};

Polling.prototype.uri = function () {
  var query = this.query || {};
  var schema = this.secure ? 'https' : 'http';
  var port = '';

  debug('uri timestampRequests: %s, timestampParam: %s, yeast: %s', this.timestampRequests, this.timestampParam, yeast())
  // cache busting is forced
  if (false !== this.timestampRequests) {
    query[this.timestampParam] = yeast();
  }

  if (!this.supportsBinary && !query.sid) {
    query.b64 = 1;
  }
  query = parseqs.encode(query);

  // avoid port if default for schema
  if (this.port && (('https' === schema && Number(this.port) !== 443) ||
     ('http' === schema && Number(this.port) !== 80))) {
    port = ':' + this.port;
  }

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  var ipv6 = this.hostname.indexOf(':') !== -1;
  return schema + '://' + (ipv6 ? '[' + this.hostname + ']' : this.hostname) + port + this.path + query;
};

Polling.prototype.write = function (packets) {
  var self = this;
  this.writable = false;
  var callbackfn = function () {
    self.writable = true;
    self.emit('drain');
  };
  debug('parser.encodePayload start, packets: %o, supportsBinary: %s', packets, this.supportsBinary)
  parser.encodePayload(packets, this.supportsBinary, function (data) {
    debug('parser.encodePayload over, data: %o', data)
    self.doWrite(data, callbackfn);
  });
};

Polling.prototype.doClose = function () {
  var self = this;

  function close () {
    debug('writing close packet');
    self.write([{ type: 'close' }]);
  }

  if ('open' === this.readyState) {
    debug('transport open - closing');
    close();
  } else {
    // in case we're trying to close while
    // handshaking is in progress (GH-164)
    debug('transport not open - deferring close');
    this.once('open', close);
  }
};
Polling.prototype.onData = function (data) {
  var self = this;
  debug('polling got data %s', data);
  var callback = function (packet, index, total) {
    // if its the first message we consider the transport open
    if ('opening' === self.readyState) {
      self.onOpen();
    }

    // if its a close packet, we close the ongoing requests
    if ('close' === packet.type) {
      self.onClose();
      return false;
    }

    // otherwise bypass onData and handle the message
    self.onPacket(packet);
  };

  // decode payload
  debug('parser.decodePayload, data: %s, binaryType: %s', data, this.socket.binaryType)
  parser.decodePayload(data, this.socket.binaryType, callback);

  // if an event did not trigger closing
  if ('closed' !== this.readyState) {
    // if we got data we're not polling
    this.polling = false;
    this.emit('pollComplete');

    if ('open' === this.readyState) {
      debug('this.poll in onData')
      this.poll();
    } else {
      debug('ignoring poll - transport state "%s"', this.readyState);
    }
  }
};