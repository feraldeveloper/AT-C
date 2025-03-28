// Replace the firebaseConfig object below with your Firebase project details
  const firebaseConfig = {

    apiKey: "AIzaSyB7iEdtr_us1-mJQ1iFhWRCFdy5G5cjals",

    authDomain: "at-c-b27b4.firebaseapp.com",

    projectId: "at-c-b27b4",

    storageBucket: "at-c-b27b4.firebasestorage.app",

    messagingSenderId: "501080306491",

    appId: "1:501080306491:web:928a6bcc11b1801787bd1e"

  };

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Generate a unique player ID
const playerId = Math.random().toString(36).substr(2, 9);

// Local player state
let player = {
  x: 100,
  y: 100,
  angle: 0,
  img: 'player.png'
};

// Object to hold all players (populated from Firebase)
let players = {};

// Cache for player images
let playerImages = {};
let localAngle = 0;

// Set up the canvas
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

// Write our player data to Firebase
database.ref('players/' + playerId).set(player);
// Remove this player's data on disconnect
database.ref('players/' + playerId).onDisconnect().remove();

// Listen for changes in all players data
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

// Utility: Load an image and cache it
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
 

