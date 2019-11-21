const url = require('./url');
const parser = require('../../socket.io-parser-small');
const debug = require('debug')('socket.io-client-small:index');
const Manager = require('./manager');
process.env.NODE_ENV = 'debug';

module.exports = lookup;

function lookup (uri, opts) {
  if (typeof uri === 'object') {
    opts = uri;
    uri = undefined;
  }

  opts = opts || {};
  let parsed = url(uri);
  let source = parsed.source;
  let newConnection = true;

  let io;
  if (newConnection === true) {
    io = Manager(source, opts);
  }

  if (parsed.query && !opts.query) {
    opts.query = parsed.query;
  }
  return io.socket(parsed.path, opts)
}
