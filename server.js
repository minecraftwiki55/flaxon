const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { createBot } = require('./bot');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize or load state from s.json
let state = {
  bot: null,
  connectionInfo: null
};

// Load saved state if exists
if (fs.existsSync(path.join(__dirname, 's.json'))) {
  try {
    state = JSON.parse(fs.readFileSync(path.join(__dirname, 's.json'), 'utf8'));
    console.log('Loaded previous state from s.json');
  } catch (e) {
    console.error('Error loading state file:', e);
  }
}

// Save state to file
function saveState() {
  fs.writeFileSync(
    path.join(__dirname, 's.json'),
    JSON.stringify(state, null, 2),
    'utf8'
  );
}

io.on('connection', (socket) => {
  console.log('Client connected');

  // Send current bot status to new connection
  if (state.bot) {
    socket.emit('bot_connected', { 
      status: 'Bot is already connected!',
      connectionInfo: state.connectionInfo
    });
  }

  socket.on('connect_bot', async (data) => {
    try {
      if (state.bot) {
        return socket.emit('bot_error', { message: 'Bot is already connected!' });
      }

      console.log('Connecting bot with data:', data);
      
      const botInstance = createBot({
        host: data.ip,
        port: parseInt(data.port),
        version: data.version,
        socket
      });

      // Save connection info
      state.bot = botInstance;
      state.connectionInfo = {
        ip: data.ip,
        port: data.port,
        version: data.version,
        connectedAt: new Date().toISOString()
      };
      saveState();

      socket.emit('bot_connecting');
    } catch (error) {
      console.error('Error connecting bot:', error);
      socket.emit('bot_error', { message: error.message });
    }
  });

  socket.on('disconnect_bot', () => {
    if (state.bot) {
      state.bot.disconnect();
      state.bot = null;
      state.connectionInfo = null;
      saveState();
      
      io.emit('bot_disconnected');
      console.log('Bot disconnected by user');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected (but bot remains active)');
  });
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
  if (state.bot) {
    state.bot.disconnect();
    console.log('Bot disconnected on server shutdown');
  }
  server.close();
  process.exit();
});

const PORT = process.env.PORT || 8100;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Bot will persist across page refreshes');
});
