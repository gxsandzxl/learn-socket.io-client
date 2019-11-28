

let s = require('socket.io-client');
s = require('../socket.io-client-small/lib/index');
let socket = s('http://localhost:2000/test?param1=123&number=3&str=abc', {upgrade: true});
socket.on('auth', (data) => {
  console.log('auth:', data)
  socket.on('add', (data) => {
    console.log('socket add:', data);
    setInterval(()=>{
      // socket.close()
      
      socket.emit(Math.random().toString())
    }, 11000)
    setTimeout(() => {
      // socket.close();
    }, 11000)
  })
  socket.on('close', (data) => {
    console.log('socket close:', data);
  })
  socket.emit('add');
  setTimeout(()=>{
    socket.emit('add', {})
  }, 30000)
  
  // setTimeout(()=>{
  //   socket.close();
  // }, 120000)
})

// socket.emit('add', '1233')
socket.on('connect', (data) => {
  console.log('connect:::::', data)
})
socket.on('connecting', (data) => {
  console.log('connecting:::::', data)
})
socket.on('data', (data) => {
  console.log('data:::::', data)
})
socket.on('error', (data) => {
  console.log('error:::::', data)
})
socket.on('close', (data) => {
  console.log('close:::::', data)
})
socket.on('disconnect', (data) => {
  console.log('disconnect:::::', data)
})