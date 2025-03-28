const socket = io();
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

let players = {};
let playerImages = {}; // Cache for loaded images
let localPlayerId = null;
let localAngle = 0;

// Set up key states
const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  rotateLeft: false,
  rotateRight: false
};

// Store our own socket id once connected
socket.on('connect', () => {
  localPlayerId = socket.id;
});

// Receive the current players list
socket.on('currentPlayers', (serverPlayers) => {
  players = serverPlayers;
  // Load all player images
  for (let id in players) {
    loadPlayerImage(players[id].img);
  }
});

// When a new player joins
socket.on('newPlayer', (data) => {
  players[data.id] = data.playerInfo;
  loadPlayerImage(data.playerInfo.img);
});

// When a player moves
socket.on('playerMoved', (data) => {
  players[data.id] = data.playerInfo;
});

// When a player disconnects
socket.on('playerDisconnected', (id) => {
  delete players[id];
});

// Utility: load an image and cache it
function loadPlayerImage(src) {
  if (!playerImages[src]) {
    const img = new Image();
    img.src = src;
    playerImages[src] = img;
  }
}

// Listen for keyboard events
document.addEventListener('keydown', (event) => {
  switch(event.code) {
    case 'ArrowUp': keys.up = true; break;
    case 'ArrowDown': keys.down = true; break;
    case 'ArrowLeft': keys.left = true; break;
    case 'ArrowRight': keys.right = true; break;
    case 'KeyQ': keys.rotateLeft = true; break;
    case 'KeyE': keys.rotateRight = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch(event.code) {
    case 'ArrowUp': keys.up = false; break;
    case 'ArrowDown': keys.down = false; break;
    case 'ArrowLeft': keys.left = false; break;
    case 'ArrowRight': keys.right = false; break;
    case 'KeyQ': keys.rotateLeft = false; break;
    case 'KeyE': keys.rotateRight = false; break;
  }
});

// Main game loop
function gameLoop() {
  // Update local rotation
  if (keys.rotateLeft) localAngle -= 5;
  if (keys.rotateRight) localAngle += 5;

  // Send movement and rotation to server
  socket.emit('playerMovement', { 
    ...keys,
    rotation: localAngle
  });

  // Clear the canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw each player
  for (let id in players) {
    const player = players[id];
    if (playerImages[player.img] && playerImages[player.img].complete) {
      drawRotatedImage(playerImages[player.img], player.x, player.y, player.angle);
    } else {
      // Fallback: draw a simple rectangle
      context.fillStyle = 'blue';
      context.fillRect(player.x - 25, player.y - 25, 50, 50);
    }
  }

  requestAnimationFrame(gameLoop);
}

// Utility: draw an image rotated around its center
function drawRotatedImage(image, x, y, angle) {
  const rad = angle * Math.PI / 180;
  context.save();
  context.translate(x, y);
  context.rotate(rad);
  context.drawImage(image, -image.width / 2, -image.height / 2);
  context.restore();
}

gameLoop();
