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
  width: 80,       // hitbox width for collision
  height: 80,      // hitbox height for collision
  vel_x: 0,
  vel_y: 0,
  maxhealth: 30,
  health: 30,
  name: 'Player ' + playerId,
  angle: 0,
  img: 'ship1.png',   
  ping: Date.now(),    
  playing: false
};

let Bullet = {
  x: 100,
  y: 100,
  vel_x: 0,
  vel_y: 0,
  owner: player.name,
  angle: 0,
  speed: 1000,
  damage: 1  // Bullet damage value
};

let ship = 1;
let players = {};   // raw firebase data for players
let bullets = {};   // raw firebase data for remote bullets

// These buffers will hold the last two states and timestamps for interpolation.
let playerBuffer = {};
let bulletBuffer = {};

// NEW: Local bullet management for bullets fired by the local player.
let localBullets = {};

let playerImages = {};
let localAngle = 0;

// Preload player image
function loadPlayerImage(src) {
  if (!playerImages[src]) {
    const img = new Image();
    img.src = src;
    playerImages[src] = img;
  }
}
loadPlayerImage(player.img);

// Preload bullet image
const bulletImage = new Image();
bulletImage.src = 'bullet.png';

// Setup canvas
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;

// Firebase references for our local player
const playerRef = database.ref('players/' + playerId);
playerRef.set(player);
playerRef.onDisconnect().remove();

// Update player's ping every second
setInterval(() => {
  player.ping = Date.now();
  playerRef.update({ ping: player.ping });
}, 1000);

// Remove inactive players
setInterval(() => {
  const now = Date.now();
  for (let id in players) {
    if (now - players[id].ping > 3000) {
      database.ref('players/' + id).remove();
    }
  }
}, 1000);

// Listen for players updates and update our interpolation buffer
database.ref('players').on('value', (snapshot) => {
  const data = snapshot.val() || {};
  const now = Date.now();
  players = data; // update raw data

  for (let id in data) {
    if (id === playerId) continue; // Skip local player
    if (!playerBuffer[id]) {
      // Initialize the buffer for a new remote player
      playerBuffer[id] = {
        last: data[id],
        current: data[id],
        lastUpdate: now,
        currentUpdate: now
      };
    } else {
      // Shift current state to last and store the new state
      playerBuffer[id].last = playerBuffer[id].current;
      playerBuffer[id].lastUpdate = playerBuffer[id].currentUpdate;
      playerBuffer[id].current = data[id];
      playerBuffer[id].currentUpdate = now;
    }
  }
  // Remove players that no longer exist
  for (let id in playerBuffer) {
    if (!data[id]) {
      delete playerBuffer[id];
    }
  }
});

// Helper function for collision detection
function isColliding(bullet, player) {
  // Assumes player's x and y are the center of the hitbox.
  const halfWidth = player.width / 2;
  const halfHeight = player.height / 2;
  return bullet.x > (player.x - halfWidth) &&
         bullet.x < (player.x + halfWidth) &&
         bullet.y > (player.y - halfHeight) &&
         bullet.y < (player.y + halfHeight);
}

// Listen for bullet updates and update our interpolation buffer
database.ref('bullets').on('value', (snapshot) => {
  // Filter out local player's bullets so that we only process remote bullets.
  const data = snapshot.val() || {};
  const remoteData = {};
  for (let id in data) {
    if (data[id].owner !== player.name) {
      remoteData[id] = data[id];
    }
  }
  const now = Date.now();
  bullets = remoteData; // update raw data for remote bullets
  
  for (let id in remoteData) {
    if (!bulletBuffer[id]) {
      bulletBuffer[id] = {
        last: remoteData[id],
        current: remoteData[id],
        lastUpdate: now,
        currentUpdate: now
      };
    } else {
      bulletBuffer[id].last = bulletBuffer[id].current;
      bulletBuffer[id].lastUpdate = bulletBuffer[id].currentUpdate;
      bulletBuffer[id].current = remoteData[id];
      bulletBuffer[id].currentUpdate = now;
    }
  }
  for (let id in bulletBuffer) {
    if (!remoteData[id]) {
      delete bulletBuffer[id];
    }
  }
  // Collision detection for remote bullets happens in the game loop.
});

// Key tracking
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
    case 'KeyR': {
      ship++;
      if (ship > 4) ship = 1;
      player.img = 'ship' + ship + '.png';
      loadPlayerImage(player.img);
      playerRef.update({ img: player.img });
      break;
    }
    case 'Space': {
      // Create a new bullet locally and push it to Firebase.
      const bulletOffset = 25; // Adjust offset as needed
      const newBullet = {
        x: player.x + Math.sin(localAngle * Math.PI / 180) * bulletOffset,
        y: player.y - Math.cos(localAngle * Math.PI / 180) * bulletOffset,
        vel_x: Math.sin(localAngle * Math.PI / 180) * Bullet.speed + player.vel_x,
        vel_y: -Math.cos(localAngle * Math.PI / 180) * Bullet.speed + player.vel_y,
        owner: player.name,
        angle: localAngle,
        speed: Bullet.speed,
        damage: Bullet.damage
      };
      const bulletRef = database.ref('bullets').push(newBullet);
      newBullet.id = bulletRef.key;
      localBullets[newBullet.id] = newBullet;
      break;
    }
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

const ACCELERATION = 361;
const MAX_VELOCITY = 700;
const ROTATION_SPEED = 90;

let lastTime = 0;
const INTERPOLATION_DELAY = 100; // milliseconds delay to smooth out updates

function gameLoop(timestamp) {
  // Check if any remote bullets are touching the local player
  for (let id in bullets) {
    let b = bullets[id];
    if (isColliding(b, player)) {
      database.ref('bullets/' + id).remove();
      player.health -= b.damage;
      if (player.health <= 0) {
        alert('You died!');
        database.ref('players/' + playerId).remove();
        window.location.reload();
      }
    }
  }
  
  // Wrap local player around screen bounds
  if (player.x < 0) player.x = 1600;
  if (player.x > 1600) player.x = 0;
  if (player.y < 0) player.y = 1200;
  if (player.y > 1200) player.y = 0;

  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Update local player velocity and angle based on input
  if (keys.up) {
    player.vel_x += Math.sin(localAngle * Math.PI / 180) * ACCELERATION * delta;
    player.vel_y -= Math.cos(localAngle * Math.PI / 180) * ACCELERATION * delta;
  }
  if (keys.left) {
    localAngle -= ROTATION_SPEED * delta;
  }
  if (keys.right) {
    localAngle += ROTATION_SPEED * delta;
  }
  player.x += player.vel_x * delta;
  player.y += player.vel_y * delta;
  player.angle = localAngle;

  // Clamp velocity to max value
  const velocity = Math.sqrt(player.vel_x * player.vel_x + player.vel_y * player.vel_y);
  if (velocity > MAX_VELOCITY) {
    player.vel_x = (player.vel_x / velocity) * MAX_VELOCITY;
    player.vel_y = (player.vel_y / velocity) * MAX_VELOCITY;
  }
  // Clear canvas for drawing
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw local player directly
  if (playerImages[player.img] && playerImages[player.img].complete) {
    drawRotatedImage(playerImages[player.img], player.x, player.y, player.angle);
  } else {
    context.fillStyle = 'blue';
    context.fillRect(player.x - 125, player.y - 125, 250, 250);
  }

  // Draw remote players using interpolation
  for (let id in playerBuffer) {
    let buffer = playerBuffer[id];
    let renderTime = Date.now() - INTERPOLATION_DELAY;
    let t = 0;
    if (buffer.currentUpdate - buffer.lastUpdate > 0) {
      t = (renderTime - buffer.lastUpdate) / (buffer.currentUpdate - buffer.lastUpdate);
      t = Math.max(0, Math.min(1, t));
    }
    let interpX = buffer.last.x + (buffer.current.x - buffer.last.x) * t;
    let interpY = buffer.last.y + (buffer.current.y - buffer.last.y) * t;
    let interpAngle = buffer.last.angle + (buffer.current.angle - buffer.last.angle) * t;
    if (playerImages[buffer.current.img] && playerImages[buffer.current.img].complete) {
      drawRotatedImage(playerImages[buffer.current.img], interpX, interpY, interpAngle);
    } else {
      context.fillStyle = 'blue';
      context.fillRect(interpX - 125, interpY - 125, 250, 250);
    }
  }

  // Update and draw local player's bullets directly
  for (let id in localBullets) {
    let b = localBullets[id];
    b.x += b.vel_x * delta;
    b.y += b.vel_y * delta;
    if (b.x < 0 || b.x > 1600 || b.y < 0 || b.y > 1200) {
      database.ref('bullets/' + id).remove();
      delete localBullets[id];
      continue;
    }
    
    if (bulletImage.complete) {
      drawRotatedImage(bulletImage, b.x, b.y, b.angle);
    } else {
      context.fillStyle = 'red';
      context.fillRect(b.x - 5, b.y - 5, 10, 10);
    }
  }

  // Draw remote bullets using interpolation
  for (let id in bulletBuffer) {
    // Skip local player's bullets (they're handled above)
    let buffer = bulletBuffer[id];
    let renderTime = Date.now() - INTERPOLATION_DELAY;
    let t = 0;
    if (buffer.currentUpdate - buffer.lastUpdate > 0) {
      t = (renderTime - buffer.lastUpdate) / (buffer.currentUpdate - buffer.lastUpdate);
      t = Math.max(0, Math.min(1, t));
    }
    let interpX = buffer.last.x + (buffer.current.x - buffer.last.x) * t;
    let interpY = buffer.last.y + (buffer.current.y - buffer.last.y) * t;
    let interpAngle = buffer.last.angle + (buffer.current.angle - buffer.last.angle) * t;
    if (bulletImage.complete) {
      drawRotatedImage(bulletImage, interpX, interpY, interpAngle);
    } else {
      context.fillStyle = 'red';
      context.fillRect(interpX - 5, interpY - 5, 10, 10);
    }
  }
  
  // Display player stats in the bottom left corner
  context.fillStyle = 'white';
  context.font = '20px Arial';
  context.fillText('Health: ' + player.health, 10, 20);
  context.fillText('Name: ' + player.name, 10, 40);
  context.fillText('Velocity: ' + Math.sqrt(player.vel_x * player.vel_x + player.vel_y * player.vel_y).toFixed(2), 10, 60);
  
  requestAnimationFrame(gameLoop);
}

// Schedule Firebase updates every 50ms (20 times per second)
setInterval(() => {
  // Send local player state to Firebase
  playerRef.set(player);

  // Update local bullets in Firebase
  for (let id in localBullets) {
    let b = localBullets[id];
    if (b.x < 0 || b.x > 1600 || b.y < 0 || b.y > 1200) {
      database.ref('bullets/' + id).remove();
      delete localBullets[id];
    } else {
      database.ref('bullets/' + id).update({
        x: b.x,
        y: b.y
      });
    }
  }
}, 50);

requestAnimationFrame(gameLoop);

function drawRotatedImage(image, x, y, angle) {
  const rad = angle * Math.PI / 180;
  context.save();
  context.translate(x, y);
  context.rotate(rad);
  context.drawImage(image, -image.width * 2.5, -image.height * 2.5, image.width * 5, image.height * 5);
  context.restore();
}
