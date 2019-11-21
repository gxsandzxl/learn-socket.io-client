const express = require('express');
const app  = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

// io.of('/test/').on('connection', (socket) => {
//   console.log('socket in:', socket.id);

//   io.emit('auth', 'hello websocket');

//   socket.on('test', (data) => {
//     console.log('test', data);
//     socket.emit('test', {code: 0})
//   })
// })/
// io.set('heartbeat interval', 5000)
io.on('connection', (socket) => {
  console.log('socket in:', socket.id);

  io.emit('auth', {code: 0, data: 'welcome socket.io'});

  socket.on('add', (data) => {
    console.log('add', data);
    socket.emit('add', {code: 0})
  })
})
let port = 2000;
server.listen(port, () => {
  console.log('listening', port);
})
