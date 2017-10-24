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
            kills: 0,
            deaths: 0,
            missle: {
                x: -1,
                y: -1,
                direction: {
                    up: false,
                    down: false,
                    left: false,
                    right: false
                }
            },
            color: 'rgb(' + Math.trunc(Math.random() * 255) + ',' + Math.trunc(Math.random() * 255) + ',' + Math.trunc(Math.random() * 255) + ')'
        };
        socket.emit('player_assignment', players[socket.id]);
    });

    socket.on('movement', function (movement) {
        performMovement(players, socket.id, movement);
        fireMissles(players, socket.id, movement);
        checkAllCollisions(players, socket.id);
    });

    socket.on('disconnect', reason => {
        delete players[socket.id];
    });
});

function fireMissles(players, socketId, movement) {
    var player = players[socketId] || {};

    if (movement.shooting) {
        player.missle = {
            x: player.x,
            y: player.y,
            direction: movement
        }
        return;
    }

    if (!player.missle) return;
    if (player.missle.x < 0 || player.missle.y < 0) return;

    if (player.missle.direction.left && !(player.missle.x - 10 < 0)) {
        player.missle.x -= 10;
    }
    if (player.missle.direction.right && !(player.missle.x + 10 > 800)) {
        player.missle.x += 10;
    }
    if (player.missle.direction.up && !(player.missle.y - 10 < 0)) {
        player.missle.y -= 10;
    }
    if (player.missle.direction.down && !(player.missle.y + 10 > 600)) {
        player.missle.y += 10;
    }
}

function checkAllCollisions(players, socketId) {
    var player = players[socketId] || {};
    for (var key in players) {
        var player = players[key];
        var missle = player.missle;
        if (!missle || missle.x < 0 || missle.y < 0) continue;

        for (var otherKey in players) {
            if (key != otherKey) {
                var otherPlayer = players[otherKey];
                if (missle.x >= otherPlayer.x - 15 && missle.x <= otherPlayer.x + 15) {
                    if (missle.y >= otherPlayer.y - 15 && missle.y <= otherPlayer.y + 15) {
                        players[otherKey].deaths += 1;
                        players[otherKey].x = 300;
                        players[otherKey].y = 300;
                        players[key].kills += 1;
                    }
                }
            }
        }
    }
}

function performMovement(players, socketId, movement) {
    var player = players[socketId] || {};

    if (movement.left && !(player.x - 15 < 0)) {
        player.x -= 5;
    }
    if (movement.right && !(player.x + 15 > 800)) {
        player.x += 5;
    }
    if (movement.up && !(player.y - 15 < 0)) {
        player.y -= 5;
    }
    if (movement.down && !(player.y + 15 > 600)) {
        player.y += 5;
    }
}

setInterval(function () {
    io.sockets.emit('state', players);
}, TICK_RATE);