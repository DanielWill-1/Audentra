const express = require('express');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Validate service account before starting server
const serviceAccountPath = path.join(__dirname, "../service-account.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Error: service-account.json not found at ${serviceAccountPath}`);
  process.exit(1);
}

const client = new TextToSpeechClient({
  keyFilename: serviceAccountPath,
});

app.post("/api/tts", async (req, res) => {
  const { text } = req.body;

  try {
    // Validate input
    if (!text?.trim()) {
      return res.status(400).json({ 
        error: "INVALID_INPUT",
        details: "Missing or empty text field" 
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: "INVALID_INPUT", 
        details: "Text exceeds maximum length of 5000 characters" 
      });
    }

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: { 
        languageCode: "en-US",
        ssmlGender: "NEUTRAL",
        name: "en-US-Standard-D"
      },
      audioConfig: { 
        audioEncoding: "MP3",
        pitch: 0,
        speakingRate: 1
      },
    }).catch(error => {
      console.error('TTS API Error:', error);
      throw new Error(error.details || 'TTS service error');
    });

    if (!response?.audioContent) {
      throw new Error('No audio content generated');
    }

    const base64Audio = Buffer.from(response.audioContent).toString("base64");
    res.json({ audioContent: base64Audio });

  } catch (error) {
    console.error("TTS Error:", error);
    
    // Handle specific error types
    if (error.code === 'ENOENT') {
      return res.status(500).json({ 
        error: 'ENOENT',
        details: 'TTS service configuration missing' 
      });
    }

    res.status(500).json({ 
      error: "TTS_ERROR", 
      details: error.message || 'Failed to generate speech' 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`TTS Server running on port ${PORT}`));
