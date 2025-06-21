// api/transcribe.js
const { SpeechClient } = require('@google-cloud/speech');
const express = require('express');
const router = express.Router();

// Initialize Google Cloud Speech client
const speechClient = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to service account key
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

// Helper function to get audio encoding
function getGoogleAudioEncoding(mimeType) {
  const encodingMap = {
    'audio/wav': 'LINEAR16',
    'audio/x-wav': 'LINEAR16',
    'audio/webm': 'WEBM_OPUS',
    'audio/ogg': 'OGG_OPUS',
    'audio/mp3': 'MP3',
    'audio/mpeg': 'MP3',
    'audio/flac': 'FLAC',
  };
  return encodingMap[mimeType] || 'LINEAR16';
}

// Validate audio input
function validateAudioInput(audio, mimeType) {
  if (!audio) {
    return { isValid: false, error: 'Audio data is required' };
  }

  if (!mimeType) {
    return { isValid: false, error: 'MIME type is required' };
  }

  const validMimeTypes = [
    'audio/wav', 'audio/webm', 'audio/ogg', 
    'audio/mp3', 'audio/mpeg', 'audio/flac'
  ];
  
  if (!validMimeTypes.includes(mimeType)) {
    return { 
      isValid: false, 
      error: `Unsupported audio format: ${mimeType}` 
    };
  }

  // Check if it's a valid base64 data URL
  if (!audio.includes(',')) {
    return { 
      isValid: false, 
      error: 'Invalid audio format: Expected base64 data URL' 
    };
  }

  const base64Data = audio.split(',')[1];
  if (!base64Data || base64Data.length === 0) {
    return { 
      isValid: false, 
      error: 'Invalid audio data: Base64 content is missing' 
    };
  }

  // Check size limit (10MB)
  if (base64Data.length > 10 * 1024 * 1024) {
    return { 
      isValid: false, 
      error: 'Audio file too large (max 10MB)' 
    };
  }

  return { isValid: true };
}

// Main transcription handler
async function transcribeAudio(req, res) {
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

    const { audio, mimeType } = req.body;

    // Validate input
    const validation = validateAudioInput(audio, mimeType);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: validation.error 
      });
    }

    // Check if Google Cloud credentials are available
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_API_KEY) {
      console.warn('No Google Cloud credentials found, using mock response');
      return res.json({ 
        transcript: 'This is a mock transcription for testing purposes.' 
      });
    }

    // Extract base64 audio data
    const base64Audio = audio.split(',')[1];

    // Configure the speech recognition request
    const request = {
      config: {
        encoding: getGoogleAudioEncoding(mimeType),
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        model: 'latest_long',
        useEnhanced: true,
      },
      audio: {
        content: base64Audio,
      },
    };

    console.log('Processing transcription request:', {
      encoding: request.config.encoding,
      sampleRate: request.config.sampleRateHertz,
      audioSize: base64Audio.length,
    });

    // Perform the speech recognition
    const [response] = await speechClient.recognize(request);

    if (!response.results || response.results.length === 0) {
      return res.status(400).json({ 
        error: 'No speech could be recognized in the audio' 
      });
    }

    // Extract transcription from results
    const transcription = response.results
      .map(result => result.alternatives?.[0]?.transcript)
      .filter(transcript => transcript && transcript.trim())
      .join(' ');

    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ 
        error: 'No transcription could be generated from the audio' 
      });
    }

    console.log('Transcription successful:', {
      originalLength: transcription.length,
      confidence: response.results[0]?.alternatives?.[0]?.confidence || 'N/A'
    });

    res.json({ 
      transcript: transcription.trim(),
      confidence: response.results[0]?.alternatives?.[0]?.confidence,
      alternatives: response.results[0]?.alternatives?.slice(1, 3) || []
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Handle specific Google Cloud errors
    if (error.code === 3) {
      return res.status(400).json({ 
        error: 'Invalid audio format or corrupted audio data' 
      });
    } else if (error.code === 11) {
      return res.status(400).json({ 
        error: 'Audio file too large or processing timeout' 
      });
    } else if (error.code === 16) {
      return res.status(401).json({ 
        error: 'Authentication failed. Check Google Cloud credentials.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Define the /api/transcribe route
router.post('/api/transcribe', transcribeAudio);

module.exports = router;