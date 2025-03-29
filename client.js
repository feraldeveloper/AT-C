const firebaseConfig = {
  apiKey: "AIzaSyB7iEdtr_us1-mJQ1iFhWRCFdy5G5cjals",
  authDomain: "at-c-b27b4.firebaseapp.com",
  databaseURL: "https://at-c-b27b4-default-rtdb.firebaseio.com",
  projectId: "at-c-b27b4",
  storageBucket: "at-c-b27b4.firebasestorage.app",
  messagingSenderId: "501080306491",
  appId: "1:501080306491:web:928a6bcc11b1801787bd1e"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const playerId = Math.random().toString(36).substr(2, 9);
let player_velocity_x = 0;
let player_velocity_y = 0;

let player = {
  x: 100,
  y: 100,
  angle: 0,
  img: 'player.png',
  ping: Date.now()
};

let players = {};

let playerImages = {};
let localAngle = 0;

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;
const playerRef = database.ref('players/' + playerId);
playerRef.set(player);
playerRef.onDisconnect().remove();

setInterval(() => {
  player.ping = Date.now();
  playerRef.update({ ping: player.ping });
}, 1000);

setInterval(() => {
  const now = Date.now();
  for (let id in players) {
    if (now - players[id].ping > 3000) {
      database.ref('players/' + id).remove();
    }
  }
}, 1000);

database.ref('players').on('value', (snapshot) => {
  players = snapshot.val() || {};
});

const keys = {
  up: false,
  down: false,
  left: false,
  right: false
};

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': keys.up = true; break;
    case 'KeyS': keys.down = true; break;
    case 'KeyA': keys.left = true; break;
    case 'KeyD': keys.right = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': keys.up = false; break;
    case 'KeyS': keys.down = false; break;
    case 'KeyA': keys.left = false; break;
    case 'KeyD': keys.right = false; break;
  }
});

function loadPlayerImage(src) {
  if (!playerImages[src]) {
    const img = new Image();
    img.src = src;
    playerImages[src] = img;
  }
}
loadPlayerImage(player.img);

const ACCELERATION = 361;
const MAX_VELOCITY = 300;
const ROTATION_SPEED = 90;

let lastTime = 0;

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (keys.up) {
    player_velocity_x += Math.sin(localAngle * Math.PI / 180) * ACCELERATION * delta;
    player_velocity_y -= Math.cos(localAngle * Math.PI / 180) * ACCELERATION * delta;
  }
  if (keys.left) {
    localAngle -= ROTATION_SPEED * delta;
  }
  if (keys.right) {
    localAngle += ROTATION_SPEED * delta;
  }

  player_velocity_x = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, player_velocity_x));
  player_velocity_y = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, player_velocity_y));

  player.x += player_velocity_x * delta;
  player.y += player_velocity_y * delta;

  player.angle = localAngle;

  playerRef.set(player);

  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let id in players) {
    const p = players[id];
    if (playerImages[p.img] && playerImages[p.img].complete) {
      drawRotatedImage(playerImages[p.img], p.x, p.y, p.angle);
    } else {
      context.fillStyle = 'blue';
      context.fillRect(p.x - 125, p.y - 125, 250, 250);
    }
  }

  requestAnimationFrame(gameLoop);
}

function drawRotatedImage(image, x, y, angle) {
  const rad = angle * Math.PI / 180;
  context.save();
  context.translate(x, y);
  context.rotate(rad);
  context.drawImage(image, -image.width * 2.5, -image.height * 2.5, image.width * 5, image.height * 5);
  context.restore();
}

playerRef.set(player);
requestAnimationFrame(gameLoop);
