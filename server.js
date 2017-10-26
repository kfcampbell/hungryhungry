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
var npcs = [];
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

        for(var i = 0; i < 3; i++){
            npcs.push(generateNpc());
        }
    });

    socket.on('movement', function (movement) {
        performMovement(players, socket.id, movement);
        checkAllCollisions(players, socket.id);
    });

    socket.on('disconnect', reason => {
        delete players[socket.id];
    });
});

function generateNpc() {
    return {
        x: Math.trunc(Math.random() * 800),
        y: Math.trunc(Math.random() * 600),
        radius: 5,
        color: 'rgb(' + Math.trunc(Math.random() * 255) + ',' + Math.trunc(Math.random() * 255) + ',' + Math.trunc(Math.random() * 255) + ')'
    };
}

function checkAllCollisions(players, socketId) {
    var player = players[socketId] || {};
    for (var key in players) {
        if (key == socketId) continue;
        var opposingPlayer = players[key];
        if (determinePlayerCollision(player, opposingPlayer)) {
            if (player.radius > opposingPlayer.radius) {
                players[socketId].radius += 5;
                players[socketId].kills += 1;
                players[key].deaths += 1;
                players[key].radius = 10;
                players[key].x = 300;
                players[key].y = 300;
                npcs.push(generateNpc());
            }
            else if (player.radius < opposingPlayer.radius) {
                players[key].radius += 5;
                players[key].kills += 1;
                players[socketId].deaths += 1;
                players[socketId].radius = 10;
                players[socketId].x = 300;
                players[socketId].y = 300;
                npcs.push(generateNpc());
            }
        }
    }

    for (var i = 0; i < npcs.length; i++) {
        var npc = npcs[i];
        if (determinePlayerCollision(player, npc)) {
            players[socketId].radius += 5;
            npcs.splice(i, 1);
        }
    }
}

function determinePlayerCollision(playerOne, playerTwo) {
    if (!(playerOne && playerTwo)) return;
    if (!(playerOne.x && playerOne.y && playerOne.radius)) return;
    if (!(playerTwo.x && playerTwo.y && playerTwo.radius)) return;

    if (isEntirelyContained(playerOne, playerTwo) || isEntirelyContained(playerTwo, playerOne)) {
        return true;
    }

    var isXCollision = false;
    var isYCollision = false;

    if ((playerOne.x + playerOne.radius >= playerTwo.x - playerTwo.radius)
        && (playerOne.x + playerOne.radius <= playerTwo.x + playerTwo.radius)) {
        isXCollision = true;
    }
    if ((playerOne.y + playerOne.radius >= playerTwo.y - playerTwo.radius)
        && (playerOne.y + playerOne.radius <= playerTwo.y + playerTwo.radius)) {
        isYCollision = true;
    }
    if ((playerOne.x - playerOne.radius <= playerTwo.x + playerTwo.radius)
        && (playerOne.x - playerOne.radius >= playerTwo.x - playerTwo.radius)) {
        isXCollision = true;
    }
    if ((playerOne.y - playerOne.radius <= playerTwo.y + playerTwo.radius)
        && (playerOne.y - playerOne.radius >= playerTwo.y - playerTwo.radius)) {
        isYCollision = true;
    }
    return isXCollision && isYCollision;
}

function isEntirelyContained(playerOne, playerTwo) {
    var isXContained = false;
    var isYContained = false;
    if (Math.abs(playerOne.x - playerTwo.x) <= playerOne.radius) isXContained = true;
    if (Math.abs(playerOne.y - playerTwo.y) <= playerTwo.radius) isYContained = true;
    return isXContained && isYContained;
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
    io.sockets.emit('state', players, npcs);
}, TICK_RATE);