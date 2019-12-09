const express = require('express');
const app  = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

// io.set('heartbeat interval', 5000)
io.on('connection', (socket) => {
  console.log('handshake: %o', socket.handshake)
  console.log('socket in:', socket.id);

  socket.emit('auth', {code: 0, data: 'welcome socket.io'}, 'bye', 'hhey', 'ha');
  socket.emit('auth', 'bye');

  socket.on('add', (data) => {
    console.log('add', data);
    socket.emit('add', data)
    socket.emit('add', "add failed")
  })
})
let port = 2000;
server.listen(port, () => {
  console.log('listening', port);
})
