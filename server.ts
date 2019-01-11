'use strict';

// S01. 必要なモジュールを読み込む
const http = require('http');
const socket = require('socket.io');

const socketPORT = 3000;

var server = http.createServer();
server.listen(socketPORT);
var io = socket.listen(server);

// This callback function is called every time a socket
// tries to connect to the server
console.log('node_server');
io.set('heartbeat timeout',5000);
io.set('heartbeat interval',5000);
io.on('connect', (socket) => {
  console.log('---------------------------serverSide', 'connect------------------------------');
  console.log('IPadress', JSON.stringify(socket.handshake.headers['x-forwarded-for']), 'が接続しました');
  // socket.to(socket.id).emit('IP', JSON.stringify(socket.handshake.headers['x-forwarded-for']));
  socket.emit('IP', JSON.stringify(socket.handshake.headers['x-forwarded-for']));
  socket.on('disconnect', () => {
    console.log('----------------disconnect----------------------');
  });
  socket.on('offer', function(e, c) {
    console.log('--------------------offer--------------------------');
    console.log('serverSide', 'offer');
   // io.to(e.id).emit('SDP', e);
    console.log(c.client, 'にSDPを送ります。');
    socket.to(c.client).emit('SDP', e, socket.id);
  });
  socket.on('answer', function(e, h) {
    console.log('---------------------answer---------------------------');
    console.log('serverSide', 'SDP');
    console.log(h.host, 'にSDPを送ります');
    socket.to(h.host).emit('SDP', e);
  });
  socket.on('candidate', function(e) {
    io.emit('candidate', e);
  });
  socket.on('create', (e) => {
    console.log('--------------------create------------------------------');
    console.log(e);
    var ip = socket.handshake.headers['x-forwarded-for'];
    socket.join(ip, function() {
      console.log('pass', e.pass);
      io.sockets.adapter.sids[socket.id][e.pass] = true;
      io.sockets.adapter.sids[socket.id][ip] = true;
      console.log('socketdayo: ', io.sockets.adapter.sids[socket.id]);
      io.sockets.in(e.room).emit('hello', socket.id);
      console.log('ルーム名', Object.keys(io.sockets.adapter.sids[socket.id])[1]);
      console.log(io.sockets.adapter.sids);
      console.log(ip, 'がルームを作成しました。');
    });
  });
  socket.on('rooms', function() {
    var rooms = io.sockets.adapter.sids;
    var room_name = [];
    console.log('--------------------rooms--------------------');
    console.log(Object.keys(rooms));
    console.log(Object.keys(rooms)[0]);
    Object.keys(rooms).forEach(function(value) {
      console.log('value', value);
      var name = Object.keys(io.sockets.adapter.sids[value])[1];
      console.log('name', name);
      if (name !== undefined && name !== null) {
        console.log('ok');
        room_name.push(name);
      }
    });
    // console.log(Object.keys(io.sockets.adapter.sids[Object.keys(rooms)[0]])[1]);
    console.log(room_name);
    socket.emit('rooms', {room: room_name});
  // socket.emit('rooms', 'rooms');
  });
  socket.on('enter', function(ip, pass) {
    console.log('----------------enter-----------------------');
    try {
      var host = Object.keys(io.sockets.adapter.rooms[ip].sockets)[0];
      var room_key = Object.keys(io.sockets.adapter.sids[host])[2];
      console.log('room内の人');
      console.log(io.sockets.adapter.rooms[ip]);
      console.log('ホスト');
      console.log(host);
      console.log(ip);
      console.log('ルームキー: ', room_key);

      if (pass === room_key) {
        console.log('key is ok!!');
        socket.join(ip, function() {
        // var host = Object.keys(io.sockets.adapter.rooms[ip].sockets)[0];
        // io.sockets.in(ip).emit('hello', socket.id);
          socket.emit('hello', ip);
          socket.to(host).emit('enter', socket.id);
          console.log('ルーム名', ip);
        });
      } else if (pass !== room_key) {
        console.log('key is default');
        socket.emit('key_default');
      }
    } catch(error) {
        console.log(error);
    }
  });
  socket.on('test', function() {
    console.log('test');
    socket.emit('test', 'test');
  });
  socket.on('id', function() {
    console.log('-----------------id------------------------------------');
    console.log(socket.id);
    socket.emit('id', socket.id);
  });
  // ---- multi room ----
  /*
  socket.on('enter', function(roomname) {
    socket.join(roomname);
    console.log('id=' + socket.id + ' enter room=' + roomname);
    setRoomname(roomname);
  });
  function setRoomname(room) {
    socket.roomname = room;
  }

  function getRoomname() {
    var room = socket.roomname;
    return room;
  }

  // 送信処理
  function emitMessage(type, message) {
    // ----- multi room ----
    var roomname = getRoomname();

    if (roomname) {
      console.log('===== message broadcast to room -->' + roomname + ' ===> ' + message.date);
      // socket.broadcast.to(roomname).emit(type, message);
      // socket.to(socket.id).emit(type, message);
      io.emit(type, message);
    } else {
      console.log('===== message broadcast all' + ' ===> ' + message.value);
      socket.broadcast.emit(type, message);
    }
  }

  // When a user send a SDP message
  // broadcast to all users in the room
  socket.on('message', function(message) {
    var date = new Date();
    message.from = socket.id;
    console.log(date + 'id=' + socket.id + ' Received Message: ' + JSON.stringify(message));

    // get send target
    var target = message.sendto;
    if (target) {
      console.log('===== message emit to -->' + target);
      socket.to(target).emit('message', message);
      return;
    }
    // broadcast in room
    emitMessage('message', message);
  });


  // チャット

  // 誰かがチャットを送ってきたら他の部屋メンバーに転送する
  socket.on('mess', function(message) {
    var date = new Date();
    message.from = socket.id;
    message.date = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();

    // 個チャ用の処理っぽいけど未実装
    var target = message.sendto;
    if (target) {
      console.log('===== あいつにおくるぜ to -->' + target);
      socket.to(target).emit('message', message);
      return;
    }

    // 送る
    emitMessage('mess', message);
  });


  // When the user hangs up
  // broadcast bye signal to all users in the room
  // 誰かが部屋を抜けたらそのメッセージを送る
  socket.on('disconnect', function() {
    // close user connection
    console.log((new Date()) + ' Peer disconnected. id=' + socket.id);

    // --- emit ----
    emitMessage('user disconnected', {id: socket.id});

    // --- leave room --
    var roomname = getRoomname();
    if (roomname) {
      socket.leave(roomname);
    }
  });
*/
});
