// @ts-check

var socket = io();
var localPlayer;
var TICK_RATE = 1000 / 60;
var canvas = document.getElementById('canvas');
canvas.width = 800;
canvas.height = 600;
var context = canvas.getContext('2d');
const boundingRect = canvas.getBoundingClientRect();

var movement = {
  towardX: 0,
  towardY: 0
}

canvas.addEventListener('mousemove', function(event){
  movement.towardX = event.clientX - boundingRect.left;
  movement.towardY = event.clientY - boundingRect.top;
});

window.onload = function () {
  var nickname = prompt("What should I call you?", "Voldemort");
  if (nickname == null || nickname == "") {
    nickname = "Voldemort";
  }

  socket.emit('new player', nickname);
}

socket.on('player_assignment', function (player) {
  localPlayer = player;
  movement = {
    towardX: 0,
    towardY: 0
  };
});

// give the server the current state of movement 60 times a second
setInterval(function () {
  if (!localPlayer) return;
  socket.emit('movement', movement);
}, TICK_RATE);

function renderLocalPlayerPosition(serverPlayer) {
  if (!localPlayer) return;
  if (localPlayer.x < 0 || localPlayer.y < 0) return;
  const toleratedMarginOfError = 7;

  // check to see if we're within the tolerated margin of error
  if(Math.abs(localPlayer.x - serverPlayer.x) > toleratedMarginOfError){
    localPlayer.x = serverPlayer.x;
  }
  if(Math.abs(localPlayer.y - serverPlayer.y) > toleratedMarginOfError){
    localPlayer.y = serverPlayer.y;
  }

  var color = localPlayer.color;
  context.fillStyle = color;
  context.beginPath();
  context.arc(serverPlayer.x, serverPlayer.y, serverPlayer.radius, 0, (2 * Math.PI));
  context.fill();
}

function renderScoreboard(players) {
  var table = document.getElementById('scoreTable');
  while(table.rows.length > 1){
    table.deleteRow(table.rows.length - 1);
  }
  
  var i = 1;
  for(var key in players){
    var currPlayer = players[key];
    var row = table.insertRow(i);
    var nameCell = row.insertCell(0);
    var killsCell = row.insertCell(1);
    var deathsCell = row.insertCell(2);

    nameCell.innerHTML = currPlayer.nickname;
    killsCell.innerHTML = currPlayer.kills;
    deathsCell.innerHTML = currPlayer.deaths;
    i++;
  }
}

socket.on('state', function (players, npcs) {
  context.clearRect(0, 0, 800, 600);
  for (var id in players) {

    if (localPlayer && localPlayer.socketId === id) {
      var serverLocalPlayer = players[id];
      
      renderLocalPlayerPosition(serverLocalPlayer);
      continue;
    }

    var player = players[id];
    var color = player.color;
    context.fillStyle = color;
    context.beginPath();
    context.arc(player.x, player.y, player.radius, 0, (2 * Math.PI));
    context.fill();
  }

  for(var i = 0; i < npcs.length; i++){
    var npc = npcs[i];
    var color = npc.color;
    var radius = npc.radius;

    context.fillStyle = color;
    context.beginPath();
    context.arc(npc.x, npc.y, radius, 0, (2 * Math.PI));
    context.fill();
  }

  renderScoreboard(players);
});