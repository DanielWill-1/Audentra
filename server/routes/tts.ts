// api/transcribe.js
const { TextToSpeechClient } = require('@google-cloud/text-to-speech'); // Correct module
const express = require('express');
const router = express.Router();

// Initialize Google Cloud Text-to-Speech client
const ttsClient = new TextToSpeechClient({
  keyFilename: "service-account.json", // Ensure this file is in the backend
});

// Validate text input
function validateTextInput(text) {
  if (!text) {
    return { isValid: false, error: 'Text is required' };
  }

  if (typeof text !== 'string') {
    return { isValid: false, error: 'Text must be a string' };
  }

  if (text.trim().length === 0) {
    return { isValid: false, error: 'Text cannot be empty' };
  }

  if (text.length > 5000) {
    return { 
      isValid: false, 
      error: 'Text too long (max 5000 characters)' 
    };
  }

  return { isValid: true };
}

// Clean and prepare text for TTS
function prepareTextForTTS(text) {
  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove or replace problematic characters
  text = text.replace(/[^\w\s.,!?;:()\-'"]/g, '');
  
  // Ensure proper sentence endings
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }
  
  return text;
}

// Main TTS handler
async function synthesizeSpeech(req, res) {
  try {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed. Use POST.' 
      });
    }

    const { text, voice, options } = req.body;

    // Validate input
    const validation = validateTextInput(text);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: validation.error 
      });
    }

    console.log("Original text:", text);
    const cleanText = prepareTextForTTS(text);
    console.log("Cleaned text:", cleanText);

    if (!cleanText) {
      return res.status(400).json({ 
        error: 'Input text is invalid or contains only unsupported characters.' 
      });
    }

    // Configure voice settings
    const voiceConfig = {
      languageCode: voice?.languageCode || 'en-US',
      name: voice?.name || 'en-US-Neural2-D',
      ssmlGender: voice?.ssmlGender || 'MALE',
    };
    console.log("Voice configuration:", voiceConfig);

    // Configure audio settings
    const audioConfig = {
      audioEncoding: options?.audioEncoding || 'MP3',
      speakingRate: options?.speakingRate || 1.0,
      pitch: options?.pitch || 0.0,
      volumeGainDb: options?.volumeGainDb || 0.0,
      effectsProfileId: options?.effectsProfileId || [],
    };

    // Configure the TTS request
    const request = {
      input: { text: cleanText },
      voice: voiceConfig,
      audioConfig: audioConfig,
    };
    console.log("TTS request object:", request);

    // Perform the text-to-speech request
    const [response] = await ttsClient.synthesizeSpeech(request);

    if (!response.audioContent) {
      return res.status(500).json({ 
        error: 'No audio content generated' 
      });
    }

    // Convert audio content to base64
    const audioContent = Buffer.from(response.audioContent).toString('base64');

    console.log('TTS successful:', {
      audioSize: audioContent.length,
      encoding: audioConfig.audioEncoding
    });

    res.json({ 
      audioContent,
      metadata: {
        textLength: cleanText.length,
        audioSize: audioContent.length,
        voice: voiceConfig.name,
        encoding: audioConfig.audioEncoding
      }
    });

  } catch (error) {
    console.error('TTS error:', error);
    
    // Handle specific Google Cloud errors
    if (error.code === 3) {
      return res.status(400).json({ 
        error: 'Invalid text input or unsupported characters' 
      });
    } else if (error.code === 8) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    } else if (error.code === 16) {
      return res.status(401).json({ 
        error: 'Authentication failed. Check Google Cloud credentials.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Define the /api/tts route
router.post('/', synthesizeSpeech);

export default router;