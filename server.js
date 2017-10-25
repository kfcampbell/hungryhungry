// @ts-check

// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

var TICK_RATE = 1000 / 60;
var port = process.env.PORT || 5000;
app.set('port', port);
app.use('/static', express.static(__dirname + '/static'));

// routing
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
});

// starts the server
server.listen(port, function () {
    console.log('starting server on port 5000');
});

// add the websocket handlers
var players = {};
io.on('connection', function (socket) {

    socket.on('new player', function (name) {
        players[socket.id] = {
            socketId: socket.id,
            nickname: name,
            x: 300,
            y: 300,
            radius: 10,
            kills: 0,
            deaths: 0,
            color: 'rgb(' + Math.trunc(Math.random() * 255) + ',' + Math.trunc(Math.random() * 255) + ',' + Math.trunc(Math.random() * 255) + ')'
        };
        socket.emit('player_assignment', players[socket.id]);
    });

    socket.on('movement', function (movement) {
        performMovement(players, socket.id, movement);
        checkAllCollisions(players, socket.id);
    });

    socket.on('disconnect', reason => {
        delete players[socket.id];
    });
});


function checkAllCollisions(players, socketId) {
    /*var player = players[socketId] || {};
    for (var key in players) {
        
    }*/
}

function performMovement(players, socketId, movement) {
    var player = players[socketId] || {};
    player.movement = movement;

    const speed = 4.5;

    // calculate angle/positioning here and move player by that much.
    const diffY = movement.towardY - player.y;
    const diffX = movement.towardX - player.x;
    const angle = Math.atan2(diffY, diffX);

    player.y = player.y + (speed * Math.sin(angle));
    player.x = player.x + (speed * Math.cos(angle));

}

setInterval(function () {
    io.sockets.emit('state', players);
}, TICK_RATE);