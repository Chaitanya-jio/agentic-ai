require('dotenv').config();
const express = require("express");
const { Configuration, OpenAIApi } = require("openai");
const cors = require("cors"); 
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const _ = require('lodash');

const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
let sseClients = [];
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200', // Replace with your Angular app's URL
  methods: 'GET,POST',
  allowedHeaders: 'Authorization,Content-Type',
}));

// Function to enhance the prompt
async function enhancePrompt(originalPrompt) {
  try {
    const response = await axios.post('https://ai-matrix.api.engageapps.jio/cwd_api/enhance_prompt', {
      original_prompt: originalPrompt,
      use_delimiters: false,
      use_formatting: false,
      use_decomposition: false,
      use_imperative: false,
      max_new_tokens: 500
    }, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    return response.data; // Return the response data
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    throw new Error('Failed to enhance prompt');
  }
}

// Existing chat route using axios
app.post("/chat", async (req, res) => {
  const { prompt, user_id, session_id, o_collection_name } = req.body;
  console.log(req.body);

  // Define the original prompt based on your requirements
  const originalPrompt = req.body.guidelines || '';

  try {
    const enhancedPromptResponse = await enhancePrompt(originalPrompt);
    const enhancedPrompt = enhancedPromptResponse.enhanced_prompt; // Adjust based on actual response structure

    const updatedBody = {
      prompt: prompt,
      user_id: user_id || "user-1736331955300-kfhqyz1i5g",
      guidelines: enhancedPrompt,
      session_id: session_id || "123db",
      o_collection_name: o_collection_name || "user-1736331955300-kfhqyz1i5g_JioAirFiber_Terms_Conditions_pdf"
    };

    console.log(updatedBody);

    const chatResponse = await axios.post('https://ai-matrix.api.engageapps.jio/cwd_api/chat_with_guidelines', updatedBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    console.log(chatResponse.data.response);
    res.json({ reply: chatResponse.data.response }); // Adjust the response field based on actual API response structure
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get response from API' });
  }
});

// New route for uploading PDF to third-party endpoint
app.post("/upload_pdf", upload.single('file'), async (req, res) => {
  const userId = req.body.user_id;
  const additionalText = req.body.additional_text;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Prepare form data for the third-party API
    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    formData.append('user_id', userId);
    formData.append('additional_text', additionalText);

    // Make a POST request to the third-party API
    const response = await axios.post('https://ai-matrix.api.engageapps.jio/cwd_api/upload_pdf', formData, {
      headers: {
        ...formData.getHeaders(),
        'Accept': 'application/json'
      }
    });

    //Return the response from the third-party API
    res.json(response.data);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file to third-party API' });
  }
});


app.get('/sse', async (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Notify the client that the connection is established
  res.write('data: Connection established\n\n');

  // Store the SSE client
  sseClients.push(res);

  // Handle client disconnect
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
    res.end();
  });
});



app.post('/sse', async (req, res) => {
  // Set headers for SSE
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).send('Prompt is required');
  }

  try {
    // Make the request to the external API with stream set to true
    const response = await axios.post('https://ai-matrix.api.engageapps.jio/LLM8b/api/generate', {
      model: 'llama3.1:8b-instruct-fp16',
      prompt: prompt,
      raw: true,
      options: {
        temperature: 0.1,
        num_ctx: 200
      },
      stream: true
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic YWltYXRyaXg6QWlNYXRyaXg='
      },
      responseType: 'stream' // Ensure the response is streamed
    });

    // Stream the external API's response to all SSE clients
    response.data.on('data', (chunk) => {
      // Send each chunk of data to all connected SSE clients
      sseClients.forEach(client => {
        client.write(`data: ${chunk.toString()}\n\n`);
      });
    });

    response.data.on('end', () => {
      // Close the SSE connection when the external API finishes
      sseClients.forEach(client => {
        client.write('data: Stream completed\n\n');
      });
      res.status(200).send('Streaming completed');
    });

    response.data.on('error', (error) => {
      // Handle errors from the external API
      sseClients.forEach(client => {
        client.write(`data: Error: ${error.message}\n\n`);
      });
      res.status(500).send('Error occurred while streaming');
    });

  } catch (error) {
    // Handle any error from the API request
    res.status(500).send('Error occurred during the POST request');
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
