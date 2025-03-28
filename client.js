const firebaseConfig = {
  apiKey: "AIzaSyB7iEdtr_us1-mJQ1iFhWRCFdy5G5cjals",
  authDomain: "at-c-b27b4.firebaseapp.com",
  databaseURL: "https://at-c-b27b4-default-rtdb.firebaseio.com",  // Your database URL here
  projectId: "at-c-b27b4",
  storageBucket: "at-c-b27b4.firebasestorage.app",
  messagingSenderId: "501080306491",
  appId: "1:501080306491:web:928a6bcc11b1801787bd1e"
};
<button id="flushBtn">Flush Players</button>
<script>
  document.getElementById('flushBtn').addEventListener('click', () => {
    database.ref('players').remove()
      .then(() => console.log("Players flushed."))
      .catch((err) => console.error("Error flushing players:", err));
  });
</script>

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Generate a unique player ID
const playerId = Math.random().toString(36).substr(2, 9);

// Local player state including an initial ping value
let player = {
  x: 100,
  y: 100,
  angle: 0,
  img: 'player.png',
  ping: Date.now()
};

// Object to hold all players (updated from Firebase)
let players = {};

// Cache for player images
let playerImages = {};
let localAngle = 0;

// Set up the canvas
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

// Write our player data to Firebase and remove it on disconnect
const playerRef = database.ref('players/' + playerId);
playerRef.set(player);
playerRef.onDisconnect().remove();

// Ping mechanism: update the local player's ping every second
setInterval(() => {
  player.ping = Date.now();
  playerRef.update({ ping: player.ping });
}, 1000);

// Check for inactive players every second. If a player hasn't pinged in over 3 seconds, remove them.
setInterval(() => {
  const now = Date.now();
  for (let id in players) {
    if (now - players[id].ping > 3000) {
      database.ref('players/' + id).remove();
    }
  }
}, 1000);

// Listen for changes in players data
database.ref('players').on('value', (snapshot) => {
  players = snapshot.val() || {};
});

// Set up key state tracking
const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  rotateLeft: false,
  rotateRight: false
};

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'ArrowUp': keys.up = true; break;
    case 'ArrowDown': keys.down = true; break;
    case 'ArrowLeft': keys.left = true; break;
    case 'ArrowRight': keys.right = true; break;
    case 'KeyQ': keys.rotateLeft = true; break;
    case 'KeyE': keys.rotateRight = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'ArrowUp': keys.up = false; break;
    case 'ArrowDown': keys.down = false; break;
    case 'ArrowLeft': keys.left = false; break;
    case 'ArrowRight': keys.right = false; break;
    case 'KeyQ': keys.rotateLeft = false; break;
    case 'KeyE': keys.rotateRight = false; break;
  }
});

// Utility: load an image and cache it
function loadPlayerImage(src) {
  if (!playerImages[src]) {
    const img = new Image();
    img.src = src;
    playerImages[src] = img;
  }
}
loadPlayerImage(player.img);

// Main game loop
function gameLoop() {
  // Update local player's rotation
  if (keys.rotateLeft) localAngle -= 5;
  if (keys.rotateRight) localAngle += 5;

  // Update local player's position based on key input
  if (keys.up) player.y -= 5;
  if (keys.down) player.y += 5;
  if (keys.left) player.x -= 5;
  if (keys.right) player.x += 5;
  
  // Set the updated angle
  player.angle = localAngle;
  
  // Write updated local player data to Firebase
  playerRef.set(player);

  // Clear the canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw each player
  for (let id in players) {
    const p = players[id];
    if (playerImages[p.img] && playerImages[p.img].complete) {
      drawRotatedImage(playerImages[p.img], p.x, p.y, p.angle);
    } else {
      // Fallback: draw a simple rectangle
      context.fillStyle = 'blue';
      context.fillRect(p.x - 25, p.y - 25, 50, 50);
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
