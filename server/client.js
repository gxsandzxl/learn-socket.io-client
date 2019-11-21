

let s = require('socket.io-client');
s = require('../socket.io-client-small/lib/index');
const Emitter = require('component-emitter');
const inherit = require('component-inherit');

let socket = s('https://node.voibook.com/login?token=07fb1f8b-96b6-4866-9d50-993ac0535475&client=mobile', {skipReconnect: true});
// let socket = s('http://localhost:2000');
socket.on('auth', (data) => {
  console.log('auth:', data)
  socket.on('add', (data) => {
    console.log('socket add:', data);
    setTimeout(()=>{
      // socket.close()
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

// console.log(`\n\n-----------------------------------------------------------------------------------------\n\n`)