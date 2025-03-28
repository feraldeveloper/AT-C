const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

app.use(express.static('public'));

let players = {};

io.on('connection', (socket) => {
  console.log('New connection: ' + socket.id);
  
  // Initialize the new player with default position, angle, and image
  players[socket.id] = {
    x: 100,
    y: 100,
    angle: 0,
    img: 'player.png'
  };

  // Send the existing players to the new player
  socket.emit('currentPlayers', players);

  // Notify existing players of the new player
  socket.broadcast.emit('newPlayer', { id: socket.id, playerInfo: players[socket.id] });

  // Listen for player movement events from the client
  socket.on('playerMovement', (movementData) => {
    const player = players[socket.id];
    if (!player) return;
    if (movementData.up) player.y -= 5;
    if (movementData.down) player.y += 5;
    if (movementData.left) player.x -= 5;
    if (movementData.right) player.x += 5;
    // Update rotation based on client input (angle in degrees)
    player.angle = movementData.rotation;
    
    // Broadcast the player's movement to all clients
    io.emit('playerMoved', { id: socket.id, playerInfo: player });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected: ' + socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(port, () => {
  console.log('Listening on port ' + port);
});

