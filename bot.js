const bedrock = require('bedrock-protocol');

function createBot(options) {
  const { host, port, version, socket } = options;
  
  socket.emit('bot_status', { status: 'Initializing bot...' });
  
  try {
    // Create the bot client
    const client = bedrock.createClient({
      host: host,
      port: port, 
      username: `Bot_${Math.floor(Math.random() * 1000)}`,
      version: version, 
      offline: true
    });

    socket.emit('bot_status', { status: 'Connecting to server...' });
    
    // Set up event handlers
    client.on('spawn', () => {
      socket.emit('bot_connected', { status: 'Bot has spawned in the world!' });
    });

    client.on('text', (packet) => {
      if (packet.source !== 'Server') {
        socket.emit('bot_chat', {
          sender: packet.source,
          message: packet.message
        });
      }
    });

    client.on('error', (error) => {
      socket.emit('bot_error', { message: error.message });
      console.error('Bot error:', error);
    });

    client.on('close', () => {
      socket.emit('bot_disconnected');
      console.log('Connection closed');
    });

    return {
      getClient: () => client,
      disconnect: () => {
        if (client) {
          client.close();
        }
      }
    };
  } catch (error) {
    socket.emit('bot_error', { message: error.message });
    console.error('Error creating bot:', error);
    return null;
  }
}

module.exports = { createBot };