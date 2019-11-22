const debug = require('debug')('engine.io-client-small:socket');
const transports = require('./transports')
const parser = require('../engine.io-parser-small/index');
const Emitter = require('component-emitter');
const parseuri = require('parseuri');
const parseqs = require('parseqs');
var index = require('indexof');

module.exports = Socket;

function Socket (uri, opts) {
  if (!(this instanceof Socket)) return new Socket(uri, opts);

  if (uri && 'object' === typeof uri) {
    opts = uri;
    uri = null;
  }

  opts = opts || {};

  // 将uri字符串转成对象
  if (uri) {
    uri = parseuri(uri);
    opts.hostname = uri.host;
    opts.secure = uri.protocol === 'https' || uri.protocol === 'wss';
    opts.port = uri.port;
    if (uri.query) opts.query = uri.query;
  } else if (opts.host) {
    opts.hostname = parseuri(opts.host).host;
  }
  // 判断该协议是否安全
  this.secure = null != opts.secure ? opts.secure
    : (typeof location !== 'undefined' && location.protocol === 'https:');
  
  if (opts.hostname && !opts.port) {
    opts.port = this.secure ? '443' : '80';
  }

  // 一大堆东西，先注释，根据需要在开放
  // this.agent = opts.agent || false;
  this.hostname = opts.hostname ||
    (typeof location !== 'undefined' ? location.hostname : 'localhost');
  this.port = opts.port || (typeof location !== 'undefined' && location.port
      ? location.port
      : (this.secure ? 443 : 80));
  this.query = opts.query || {};
  if ('string' === typeof this.query) this.query = parseqs.decode(this.query);
  this.upgrade = false !== opts.upgrade;
  this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
  // this.forceBase64 = !!opts.forceBase64;
  // this.withCredentials = false !== opts.withCredentials;
  this.timestampParam = opts.timestampParam || 't';
  this.timestampRequests = opts.timestampRequests;
  this.transports = opts.transports || ['polling', 'websocket'];
  this.transportOptions = opts.transportOptions || {};
  this.readyState = '';
  this.writeBuffer = [];
  this.prevBufferLen = 0;
  // this.policyPort = opts.policyPort || 843;
  this.rememberUpgrade = opts.rememberUpgrade || false;
  this.binaryType = null;
  // this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
  // this.perMessageDeflate = false !== opts.perMessageDeflate ? (opts.perMessageDeflate || {}) : false;

  // if (true === this.perMessageDeflate) this.perMessageDeflate = {};
  // if (this.perMessageDeflate && null == this.perMessageDeflate.threshold) {
  //   this.perMessageDeflate.threshold = 1024;
  // }
  
  // SSL options for Node.js client
  // Node.js一些参数，暂时先注释  
  // this.pfx = opts.pfx || null;
  // this.key = opts.key || null;
  // this.passphrase = opts.passphrase || null;
  // this.cert = opts.cert || null;
  // this.ca = opts.ca || null;
  // this.ciphers = opts.ciphers || null;
  // this.rejectUnauthorized = opts.rejectUnauthorized === undefined ? true : opts.rejectUnauthorized;
  // this.forceNode = !!opts.forceNode;

  // set on handshake
  // 初始化心跳检测相关变量
  this.id = null;
  this.upgrades = null;
  this.pingInterval = null;
  this.pingTimeout = null;
  
  // set on heartbeat
  // 初始化心跳检测定时器
  this.pingIntervalTimer = null;
  this.pingTimeoutTimer = null;

  this.open();
}

Socket.priorWebsocketSuccess = false;

Emitter(Socket.prototype);

// Socket.protocol = parser.protocol;

Socket.prototype.open = function () {
  var transport;
  // 这里判断传输方式使用polling还是websocket
  if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') !== -1) {
    transport = 'websocket';
  } else if (0 === this.transports.length) {
    // Emit error on next tick so it can be listened to
    var self = this;
    setTimeout(function () {
      self.emit('error', 'No transports available');
    }, 0);
    return;
  } else {
    transport = this.transports[0];
  }
  this.readyState = 'opening';

  // Retry with the next transport if the transport is disabled (jsonp: false)
  try {
    transport = this.createTransport(transport);
  } catch (e) {
    throw e
    this.transports.shift();
    this.open();
    return;
  }

  transport.open();
  this.setTransport(transport);
};

Socket.prototype.createTransport = function (name) {
  debug('creating transport "%s"', name);
  var query = clone(this.query);

  // append engine.io protocol identifier
  query.EIO = parser.protocol;

  // transport name
  query.transport = name;

  // per-transport options
  var options = this.transportOptions[name] || {};
  // session id if we already have one
  if (this.id) query.sid = this.id;

  var transport = new transports[name]({
    query: query,
    socket: this,
    agent: options.agent || this.agent,
    hostname: options.hostname || this.hostname,
    port: options.port || this.port,
    secure: options.secure || this.secure,
    path: options.path || this.path,
    // forceBase64: options.forceBase64 || this.forceBase64,
    // withCredentials: options.withCredentials || this.withCredentials,
    timestampRequests: options.timestampRequests || this.timestampRequests,
    timestampParam: options.timestampParam || this.timestampParam,
    // policyPort: options.policyPort || this.policyPort,
    // pfx: options.pfx || this.pfx,
    // key: options.key || this.key,
    // passphrase: options.passphrase || this.passphrase,
    // cert: options.cert || this.cert,
    // ca: options.ca || this.ca,
    // ciphers: options.ciphers || this.ciphers,
    // rejectUnauthorized: options.rejectUnauthorized || this.rejectUnauthorized,
    // perMessageDeflate: options.perMessageDeflate || this.perMessageDeflate,
    // extraHeaders: options.extraHeaders || this.extraHeaders,
    // forceNode: options.forceNode || this.forceNode,
    // localAddress: options.localAddress || this.localAddress,
    // requestTimeout: options.requestTimeout || this.requestTimeout,
    // protocols: options.protocols || void (0),
    // isReactNative: this.isReactNative
  });

  return transport;
};

Socket.prototype.setTransport = function (transport) {
  debug('setting transport %s', transport.name);
  var self = this;

  if (this.transport) {
    debug('clearing existing transport %s', this.transport.name);
    this.transport.removeAllListeners();
  }

  // set up transport
  this.transport = transport;

  // set up transport listeners
  transport
  .on('drain', function () {
    self.onDrain();
  })
  .on('packet', function (packet) {
    self.onPacket(packet);
  })
  .on('error', function (e) {
    self.onError(e);
  })
  .on('close', function () {
    self.onClose('transport close');
  });
};

Socket.prototype.onDrain = function () {
  debug('listen drain')
  this.writeBuffer.splice(0, this.prevBufferLen);

  // setting prevBufferLen = 0 is very important
  // for example, when upgrading, upgrade packet is sent over,
  // and a nonzero prevBufferLen could cause problems on `drain`
  this.prevBufferLen = 0;

  if (0 === this.writeBuffer.length) {
    this.emit('drain');
  } else {
    this.flush();
  }
};
Socket.prototype.onError = function (err) {
  debug('socket error %j', err);
  Socket.priorWebsocketSuccess = false;
  this.emit('error', err);
  this.onClose('transport error', err);
};
Socket.prototype.onPacket = function (packet) {
  if ('opening' === this.readyState || 'open' === this.readyState ||
      'closing' === this.readyState) {
    debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

    this.emit('packet', packet);
    debug('socket emit <packet> over')

    // Socket is live - any packet counts
    this.emit('heartbeat');
    debug('socket emit <heartbeat> over')

    switch (packet.type) {
      case 'open':
        this.onHandshake(JSON.parse(packet.data));
        break;

      case 'pong':
        this.setPing();
        this.emit('pong');
        break;

      case 'error':
        var err = new Error('server error');
        err.code = packet.data;
        this.onError(err);
        break;

      case 'message':
        this.emit('data', packet.data);
        this.emit('message', packet.data);
        break;
    }
  } else {
    debug('packet received with socket readyState "%s"', this.readyState);
  }
};
Socket.prototype.onClose = function (reason, desc) {
  if ('opening' === this.readyState || 'open' === this.readyState || 'closing' === this.readyState) {
    debug('socket close with reason: "%s"', reason);
    var self = this;

    // clear timers
    clearTimeout(this.pingIntervalTimer);
    clearTimeout(this.pingTimeoutTimer);

    // stop event from firing again for transport
    this.transport.removeAllListeners('close');

    // ensure transport won't stay open
    this.transport.close();

    // ignore further transport communication
    this.transport.removeAllListeners();

    // set ready state
    this.readyState = 'closed';

    // clear session id
    this.id = null;

    // emit close event
    this.emit('close', reason, desc);

    // clean buffers after, so users can still
    // grab the buffers on `close` event
    self.writeBuffer = [];
    self.prevBufferLen = 0;
  }
};
Socket.prototype.close = function () {
  if ('opening' === this.readyState || 'open' === this.readyState) {
    this.readyState = 'closing';

    var self = this;

    if (this.writeBuffer.length) {
      this.once('drain', function () {
        debug('prototype.close listen drain once')
        if (this.upgrading) {
          waitForUpgrade();
        } else {
          close();
        }
      });
    } else if (this.upgrading) {
      waitForUpgrade();
    } else {
      close();
    }
  }

  function close () {
    self.onClose('forced close');
    debug('socket closing - telling transport to close');
    self.transport.close();
  }

  function cleanupAndClose () {
    self.removeListener('upgrade', cleanupAndClose);
    self.removeListener('upgradeError', cleanupAndClose);
    close();
  }

  function waitForUpgrade () {
    // wait for upgrade to finish since we can't send packets while pausing a transport
    self.once('upgrade', cleanupAndClose);
    self.once('upgradeError', cleanupAndClose);
  }

  return this;
};
Socket.prototype.onHandshake = function (data) {
  this.emit('handshake', data);
  this.id = data.sid;
  this.transport.query.sid = data.sid;
  this.upgrades = this.filterUpgrades(data.upgrades);
  this.pingInterval = data.pingInterval;
  this.pingTimeout = data.pingTimeout;
  this.onOpen();
  // In case open handler closes socket
  if ('closed' === this.readyState) return;
  this.setPing();

  // Prolong liveness of socket on heartbeat
  this.removeListener('heartbeat', this.onHeartbeat);
  this.on('heartbeat', this.onHeartbeat);
};
Socket.prototype.flush = function () {
  if ('closed' !== this.readyState && this.transport.writable &&
    !this.upgrading && this.writeBuffer.length) {
    debug('flushing %d packets in socket', this.writeBuffer.length);
    this.transport.send(this.writeBuffer);
    // keep track of current length of writeBuffer
    // splice writeBuffer and callbackBuffer on `drain`
    this.prevBufferLen = this.writeBuffer.length;
    this.emit('flush');
  }
};
Socket.prototype.setPing = function () {
  var self = this;
  clearTimeout(self.pingIntervalTimer);
  self.pingIntervalTimer = setTimeout(function () {
    debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
    self.ping();
    self.onHeartbeat(self.pingTimeout);
  }, self.pingInterval);
};
Socket.prototype.ping = function () {
  var self = this;
  this.sendPacket('ping', function () {
    self.emit('ping');
  });
};
Socket.prototype.sendPacket = function (type, data, options, fn) {
  if ('function' === typeof data) {
    fn = data;
    data = undefined;
  }

  if ('function' === typeof options) {
    fn = options;
    options = null;
  }

  if ('closing' === this.readyState || 'closed' === this.readyState) {
    return;
  }

  options = options || {};
  options.compress = false !== options.compress;

  var packet = {
    type: type,
    data: data,
    options: options
  };
  this.emit('packetCreate', packet);
  this.writeBuffer.push(packet);
  if (fn) this.once('flush', fn);
  this.flush();
};
Socket.prototype.onOpen = function () {
  debug('socket open');
  this.readyState = 'open';
  Socket.priorWebsocketSuccess = 'websocket' === this.transport.name;
  this.emit('open');
  this.flush();

  // we check for `readyState` in case an `open`
  // listener already closed the socket
  debug('pre-starting-upgrade, readyState: %s, upgrade: %s, pause: %s', this.readyState, this.upgrade, this.transport.pause);
  if ('open' === this.readyState && this.upgrade && this.transport.pause) {
    debug('starting upgrade probes');
    for (var i = 0, l = this.upgrades.length; i < l; i++) {
      this.probe(this.upgrades[i]);
    }
  }
};
Socket.prototype.onHeartbeat = function (timeout) {
  debug('listen heartbeat')
  clearTimeout(this.pingTimeoutTimer);
  var self = this;
  self.pingTimeoutTimer = setTimeout(function () {
    if ('closed' === self.readyState) return;
    self.onClose('ping timeout');
  }, timeout || (self.pingInterval + self.pingTimeout));
};
Socket.prototype.write =
Socket.prototype.send = function (msg, options, fn) {
  this.sendPacket('message', msg, options, fn);
  return this;
};
Socket.prototype.filterUpgrades = function (upgrades) {
  var filteredUpgrades = [];
  for (var i = 0, j = upgrades.length; i < j; i++) {
    if (~index(this.transports, upgrades[i])) filteredUpgrades.push(upgrades[i]);
  }
  return filteredUpgrades;
};

function clone (obj) {
  var o = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      o[i] = obj[i];
    }
  }
  return o;
}