const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const LLT = require('./public/Translation.js')
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const fetch = require('node-fetch');
app.use(express.static("public"));

// Global variables to hold all usernames and rooms created
var usernames = {};
var rooms = [
  { name: "global", creator: "Anonymous" ,language:["en","en"]},
  { name: "CN-KR", creator: "Anonymous" ,language:["zh","kor"]},
  { name: "CN-IT", creator: "Anonymous",language:["zh","it"] },
  { name: "IT-KR", creator: "Anonymous",language:["kor","it"] },
  { name: "IT-RU", creator: "Anonymous",language:["it","ru"] },
];

function getLanguageForRoom(roomName) {
  for (var i = 0; i < rooms.length; i++) {
    if (rooms[i].name === roomName) {
      return rooms[i].language;
    }
  }
  return null;
}
io.on("connection", function (socket) {
  console.log(`User connected to server.`);
  socket.on("createUser", function (username) {
    socket.username = username;
    usernames[username] = username;
    socket.currentRoom = "global";
    socket.join("global");

    console.log(`User ${username} created on server successfully.`);

    socket.emit("updateChat", "INFO", "You have joined global room");
    socket.broadcast
      .to("global")
      .emit("updateChat", "INFO", username + " has joined global room");
    io.sockets.emit("updateUsers", usernames);
    socket.emit("updateRooms", rooms, "global");
  });

  socket.on("changeCard",function (newImageUrl){
    console.log(`Card ${newImageUrl} change demand is ok!`);
    io.sockets.emit('updateCards', newImageUrl);
      }
  )

  socket.on("sendMessage", function (data_original) {
    //data ="good";
    var languages=getLanguageForRoom(socket.currentRoom);
    var apiUrl_1=LLT.translate(data_original,languages[0]);
    var apiUrl_2=LLT.translate(data_original,languages[1]);
    fetch(apiUrl_1).then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
          })
          .then(data_1 => {
            if(data_1.trans_result[0].dst===data_original){
              console.log("Translating...");
              fetch(apiUrl_2) .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
              }).then(data_2 => {
                io.sockets.to(socket.currentRoom).emit("updateChat", socket.username, data_original+"<br>"+data_2.trans_result[0].dst);
            })
          }else{
              console.log("Translating...");
              io.sockets.to(socket.currentRoom).emit("updateChat", socket.username, data_original+"<br>"+data_1.trans_result[0].dst);
            }
              })
    //检测语言
    /*var apiUrl=LLT.translate(data_original,"kor");
    fetch(apiUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          const dstText = data.trans_result[0].dst;
          // Handle JSON data here
          io.sockets.to(socket.currentRoom).emit("updateChat", socket.username, data_original+dstText);
        })
        .catch(error => {
          console.error('Error:', error);
        });//这一段加的
     */
    //io.sockets.to(socket.currentRoom).emit("updateChat", socket.username, data);
  });

  socket.on("createRoom", function (room) {
    if (room != null) {
      rooms.push({ name: room, creator: socket.username });
      io.sockets.emit("updateRooms", rooms, null);
    }
  });

  socket.on("updateRooms", function (room) {
    socket.broadcast
      .to(socket.currentRoom)
      .emit("updateChat", "INFO", socket.username + " left room");
    socket.leave(socket.currentRoom);
    socket.currentRoom = room;
    socket.join(room);
    socket.emit("updateChat", "INFO", "You have joined " + room + " room");
    socket.broadcast
      .to(room)
      .emit(
        "updateChat",
        "INFO",
        socket.username + " has joined " + room + " room"
      );
  });

  socket.on("disconnect", function () {
    console.log(`User ${socket.username} disconnected from server.`);
    delete usernames[socket.username];
    io.sockets.emit("updateUsers", usernames);
    socket.broadcast.emit(
      "updateChat",
      "INFO",
      socket.username + " has disconnected"
    );
  });
});

server.listen(3000, function () {
  console.log("Listening to port 3000.");
});
