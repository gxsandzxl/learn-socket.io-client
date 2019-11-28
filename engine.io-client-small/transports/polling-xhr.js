var XMLHttpRequest = require('xmlhttprequest-ssl');
var Polling = require('./polling');
var Emitter = require('component-emitter');
var inherit = require('component-inherit');
var debug = require('debug')('engine.io-client-small:polling-xhr');

module.exports = XHR;
module.exports.Request = Request;

function empty () {}

function XHR (opts) {
  Polling.call(this, opts);
  // this.requestTimeout = opts.requestTimeout;
  // this.extraHeaders = opts.extraHeaders;

  if (typeof location !== 'undefined') {
    var isSSL = 'https:' === location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    this.xd = (typeof location !== 'undefined' && opts.hostname !== location.hostname) ||
      port !== opts.port;
    this.xs = opts.secure !== isSSL;
  }
}

inherit(XHR, Polling);

XHR.prototype.doPoll = function () {
  debug('xhr poll');
  var req = this.request();
  var self = this;
  req.on('data', function (data) {
    self.onData(data);
  });
  req.on('error', function (err) {
    self.onError('xhr poll error', err);
  });
  this.pollXhr = req;
};

XHR.prototype.request = function (opts) {
  opts = opts || {};
  opts.uri = this.uri();
  // opts.xd = this.xd;
  // opts.xs = this.xs;
  // opts.agent = this.agent || false;
  // opts.supportsBinary = this.supportsBinary;
  // opts.withCredentials = this.withCredentials;

  // SSL options for Node.js client
  // opts.pfx = this.pfx;
  // opts.key = this.key;
  // opts.passphrase = this.passphrase;
  // opts.cert = this.cert;
  // opts.ca = this.ca;
  // opts.ciphers = this.ciphers;
  // opts.rejectUnauthorized = this.rejectUnauthorized;
  // opts.requestTimeout = this.requestTimeout;

  // other options for Node.js client
  // opts.extraHeaders = this.extraHeaders;

  return new Request(opts);
};

XHR.prototype.doWrite = function (data, fn) {
  var isBinary = typeof data !== 'string' && data !== undefined;
  var req = this.request({ method: 'POST', data: data, isBinary: isBinary });
  var self = this;
  req.on('success', fn);
  req.on('error', function (err) {
    self.onError('xhr post error', err);
  });
  this.sendXhr = req;
};

/**
 * Request
 */

function Request (opts) {
  this.method = opts.method || 'GET';
  this.uri = opts.uri;
  this.xd = !!opts.xd;
  this.xs = !!opts.xs;
  this.async = false !== opts.async;
  this.data = undefined !== opts.data ? opts.data : null;
  this.agent = opts.agent;
  this.isBinary = opts.isBinary;
  this.supportsBinary = opts.supportsBinary;
  this.withCredentials = opts.withCredentials;
  this.requestTimeout = opts.requestTimeout;

  // SSL options for Node.js client
  this.pfx = opts.pfx;
  this.key = opts.key;
  this.passphrase = opts.passphrase;
  this.cert = opts.cert;
  this.ca = opts.ca;
  this.ciphers = opts.ciphers;
  this.rejectUnauthorized = opts.rejectUnauthorized;

  // other options for Node.js client
  // this.extraHeaders = opts.extraHeaders;

  this.create();
}

Request.requestsCount = 0;
Request.requests = {};
Emitter(Request.prototype);

Request.prototype.create = function () {
  var opts = { agent: this.agent, xdomain: this.xd, xscheme: this.xs };

  // SSL options for Node.js client
  opts.pfx = this.pfx;
  opts.key = this.key;
  opts.passphrase = this.passphrase;
  opts.cert = this.cert;
  opts.ca = this.ca;
  opts.ciphers = this.ciphers;
  opts.rejectUnauthorized = this.rejectUnauthorized;

  var xhr = this.xhr = new XMLHttpRequest(opts);
  var self = this;

  try {
    debug('xhr open %s: %s', this.method, this.uri);
    xhr.open(this.method, this.uri, this.async);
    // try {
    //   if (this.extraHeaders) {
    //     xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
    //     for (var i in this.extraHeaders) {
    //       if (this.extraHeaders.hasOwnProperty(i)) {
    //         xhr.setRequestHeader(i, this.extraHeaders[i]);
    //       }
    //     }
    //   }
    // } catch (e) {}

    if ('POST' === this.method) {
      try {
        if (this.isBinary) {
          xhr.setRequestHeader('Content-type', 'application/octet-stream');
        } else {
          xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        }
      } catch (e) {}
    }

    try {
      xhr.setRequestHeader('Accept', '*/*');
    } catch (e) {}

    // ie6 check
    if ('withCredentials' in xhr) {
      xhr.withCredentials = this.withCredentials;
    }

    if (this.requestTimeout) {
      xhr.timeout = this.requestTimeout;
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 2) {
        try {
          var contentType = xhr.getResponseHeader('Content-Type');
          if (self.supportsBinary && contentType === 'application/octet-stream' || contentType === 'application/octet-stream; charset=UTF-8') {
            xhr.responseType = 'arraybuffer';
          }
        } catch (e) {}
      }
      if (4 !== xhr.readyState) return;
      if (200 === xhr.status || 1223 === xhr.status) {
        self.onLoad();
      } else {
        // make sure the `error` event handler that's user-set
        // does not throw in the same tick and gets caught here
        setTimeout(function () {
          self.onError(typeof xhr.status === 'number' ? xhr.status : 0);
        }, 0);
      }
    };

    debug('xhr data %s', this.data);
    xhr.send(this.data);
  } catch (e) {
    // Need to defer since .create() is called directly fhrom the constructor
    // and thus the 'error' event can only be only bound *after* this exception
    // occurs.  Therefore, also, we cannot throw here at all.
    setTimeout(function () {
      self.onError(e);
    }, 0);
    return;
  }

  if (typeof document !== 'undefined') {
    this.index = Request.requestsCount++;
    Request.requests[this.index] = this;
  }
};
Request.prototype.onError = function (err) {
  debug('request error: %o', err);
  this.emit('error', err);
  this.cleanup(true);
};
Request.prototype.cleanup = function (fromError) {
  if ('undefined' === typeof this.xhr || null === this.xhr) {
    return;
  }
  
  this.xhr.onreadystatechange = empty;


  if (fromError) {
    try {
      this.xhr.abort();
    } catch (e) {}
  }

  if (typeof document !== 'undefined') {
    delete Request.requests[this.index];
  }

  this.xhr = null;
};
Request.prototype.onLoad = function () {
  var data;
  try {
    var contentType;
    try {
      contentType = this.xhr.getResponseHeader('Content-Type');
    } catch (e) {}
    if (contentType === 'application/octet-stream' || contentType === 'application/octet-stream; charset=UTF-8') {
      data = this.xhr.response || this.xhr.responseText;
    } else {
      data = this.xhr.responseText;
    }
  } catch (e) {
    this.onError(e);
  }
  if (null != data) {
    this.onData(data);
  }
};
Request.prototype.onData = function (data) {
  this.emit('data', data);
  this.onSuccess();
};
Request.prototype.onSuccess = function () {
  this.emit('success');
  this.cleanup();
};