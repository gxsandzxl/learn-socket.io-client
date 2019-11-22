var XMLHttpRequest = require('xmlhttprequest-ssl');
var XHR = require('./polling-xhr');
var websocket = require('./websocket');
const debug = require('debug')('engine.io-client-small:polling-index')

/**
 * Export transports.
 */

exports.polling = polling;
exports.websocket = websocket;

function polling (opts) {
  var xhr;
  var xd = false;
  var xs = false;

  if (typeof location !== 'undefined') {
    var isSSL = 'https:' === location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    xd = opts.hostname !== location.hostname || port !== opts.port;
    xs = opts.secure !== isSSL;
  }

  opts.xdomain = xd;
  opts.xscheme = xs;
  xhr = new XMLHttpRequest(opts);

  if ('open' in xhr ) {
    return new XHR(opts);
  } 
}