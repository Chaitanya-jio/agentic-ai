const WebSocket = require('ws');
const axios = require('axios');

const port = 8080;
const wss = new WebSocket.Server({ port });

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send a welcome message to the client
  //ws.send('Welcome to the WebSocket server!');

  // Stream messages to the client every 5 seconds
  const interval = setInterval(() => {
   // const message = `Server message at ${new Date().toLocaleTimeString()}`;
    //ws.send(message);
  }, 5000);

  // Handle incoming messages from the client
  ws.on('message', async (message) => {
    console.log(`Received message from client: ${message}`);
    var body = JSON.parse(message);

    // Trigger the HTTP request for each incoming message
    try {
      const response = await axios({
        method: 'post',
        url: 'https://ai-matrix.api.engageapps.jio/cwd_api/chat_with_condensation',
        data: {
          //model: 'llama3.3:70b-instruct-q4_0',
          prompt: body.message,
          user_id: body.user_id,
          guidelines: body.guidelines,
          o_collection_name: body.o_collection_name,
        //   raw: true,
        //   options: {
        //     temperature: 0.1,
        //     num_ctx: 200
        //   },
          session_id: body.session_id,
          stream: true
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic YWltYXRyaXg6QWlNYXRyaXg='
        },
        responseType: 'stream'
      });

      // Stream the response data to the client
      response.data.on('data', (chunk) => {
        console.log(chunk.toString())
        ws.send(chunk.toString());
      });

      response.data.on('end', () => {
        console.log('Streaming complete');
      });

    } catch (error) {
      console.error('Error in HTTP request:', error);
      ws.send('Error processing your request.');
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

console.log(`WebSocket server is running on ws://localhost:${port}`); 