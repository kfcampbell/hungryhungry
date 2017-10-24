var socket = io();
var localPlayer;
var TICK_RATE = 1000 / 60;
var canvas = document.getElementById('canvas');
canvas.width = 800;
canvas.height = 600;
var context = canvas.getContext('2d');

var movement = {
  up: false,
  down: false,
  left: false,
  right: false,
  shooting: false
}
document.addEventListener('keydown', function (event) {
  switch (event.keyCode) {
    case 65: // A
      movement.left = true;
      break;
    case 87: // W
      movement.up = true;
      break;
    case 68: // D
      movement.right = true;
      break;
    case 83: // S
      movement.down = true;
      break;
    case 32: // spacebar
      movement.shooting = true;
      break;
  }
});
document.addEventListener('keyup', function (event) {
  switch (event.keyCode) {
    case 65: // A
      movement.left = false;
      break;
    case 87: // W
      movement.up = false;
      break;
    case 68: // D
      movement.right = false;
      break;
    case 83: // S
      movement.down = false;
      break;
    case 32: // spacebar
      movement.shooting = false;
      break;
  }
});

canvas.addEventListener('mousedown', function(event){
  if(event.button == 0){
    alert('you left clicked! ' + event.clientX + ', ' + event.clientY);
  }
});

window.onload = function () {
  var nickname = prompt("What should I call you?", "Elon Musk");
  if (nickname == null || nickname == "") {
    nickname = "Elon Musk";
  }

  socket.emit('new player', nickname);
}

socket.on('player_assignment', function (player) {
  localPlayer = player;
  movement = {
    up: false,
    down: false,
    left: false,
    right: false,
    shooting: false
  };
});

// give the server the current state of movement 60 times a second
setInterval(function () {
  if (!localPlayer) return;
  socket.emit('movement', movement);

  if (movement.left && !(localPlayer.x - 15 < 0)) {
    localPlayer.x -= 5;
  }
  if (movement.right && !(localPlayer.x + 15 > 800)) {
    localPlayer.x += 5;
  }
  if (movement.up && !(localPlayer.y - 15 < 0)) {
    localPlayer.y -= 5;
  }
  if (movement.down && !(localPlayer.y + 15 > 600)) {
    localPlayer.y += 5;
  }

  renderLocalPlayerPosition(localPlayer);
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
  context.arc(localPlayer.x, localPlayer.y, 10, 0, (2 * Math.PI));
  context.fill();
}

function renderLocalPlayerMisslePosition() {
  if (!localPlayer.missle) return;
  if (localPlayer.missle.x < 0 || localPlayer.missle.y < 0) return;
  context.fillStyle = localPlayer.color;
  context.beginPath();
  context.arc(localPlayer.missle.x, localPlayer.missle.y, 5, 0, (2 * Math.PI));
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

socket.on('state', function (players) {
  context.clearRect(0, 0, 800, 600);
  for (var id in players) {

    if (localPlayer && localPlayer.socketId === id) {
      var serverLocalPlayer = players[id];
      
      // for some reason getting rid of this line causes missles to not fire
      // but it also ruins the rubber-banding fix...
      localPlayer = serverLocalPlayer;

      renderLocalPlayerPosition(serverLocalPlayer);
      renderLocalPlayerMisslePosition();
      continue;
    }

    var player = players[id];
    var color = player.color;
    context.fillStyle = color;
    context.beginPath();
    context.arc(player.x, player.y, 10, 0, (2 * Math.PI));
    context.fill();

    // render player's missle.
    var missle = player.missle;
    if (!missle) continue;
    if (missle.x < 0 || missle.y < 0) continue;
    context.fillStyle = color;
    context.beginPath();
    context.arc(missle.x, missle.y, 5, 0, (2 * Math.PI));
    context.fill();
  }

  renderScoreboard(players);
});