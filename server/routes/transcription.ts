import express from "express";
import { SpeechClient } from "@google-cloud/speech";

const router = express.Router();

// Initialize Google Cloud Speech-to-Text client
const client = new SpeechClient({
  keyFilename: "service-account.json", // Ensure this file is in the backend
});

router.post("/transcribe", async (req, res) => {
  const { audio, mimeType } = req.body;

  if (!audio || !mimeType) {
    return res.status(400).json({ error: "Missing audio or mimeType in request body" });
  }

  try {
    const audioContent = audio.split(",")[1]; // Extract base64 content
    if (!audioContent) {
      throw new Error("Invalid audio data format: Base64 content is missing.");
    }

    const request = {
      audio: { content: audioContent },
      config: {
        encoding: getGoogleAudioEncoding(mimeType),
        sampleRateHertz: 16000,
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
      },
    };

    const [response] = await client.recognize(request);
    const transcript = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript)
      .join("\n");

    res.json({ transcript: transcript || "Transcription failed" });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "Failed to transcribe audio", details: error.message });
  }
});

// Helper function to map MIME types to Google Cloud audio encodings
function getGoogleAudioEncoding(mimeType: string): string {
  const encodingMap: { [key: string]: string } = {
    "audio/wav": "LINEAR16",
    "audio/x-wav": "LINEAR16",
    "audio/webm": "WEBM_OPUS",
    "audio/ogg": "OGG_OPUS",
    "audio/mp3": "MP3",
    "audio/mpeg": "MP3",
    "audio/flac": "FLAC",
  };

  return encodingMap[mimeType] || "LINEAR16";
}

export default router;