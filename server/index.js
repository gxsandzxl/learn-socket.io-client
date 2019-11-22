const express = require('express');
const app  = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

// io.set('heartbeat interval', 5000)
io.of('/test').on('connection', (socket) => {
  console.log('handshake: %o', socket.handshake)
  console.log('socket in:', socket.id);

  socket.emit('auth', {code: 0, data: 'welcome socket.io'});

  socket.on('add', (data) => {
    console.log('add', data);
    socket.emit('add', {code: 0})
  })
})
let port = 2000;
server.listen(port, () => {
  console.log('listening', port);
})
