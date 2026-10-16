import express from "express";
import { SpeechClient, protos } from "@google-cloud/speech";

const router = express.Router();

// Initialize Google Cloud Speech-to-Text client
const client = new SpeechClient({
  keyFilename: "service-account.json", // Ensure this file is in the backend
});

// Helper function to map MIME types to Google Cloud audio encodings
function getGoogleAudioEncoding(mimeType: string): protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding {
  const encodingMap: { [key: string]: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding } = {
    "audio/wav": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
    "audio/x-wav": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
    "audio/webm": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
    "audio/ogg": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.OGG_OPUS,
    "audio/mp3": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3,
    "audio/mpeg": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3,
    "audio/flac": protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.FLAC,
  };

  return encodingMap[mimeType] || protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED;
}

// Helper function to get sample rate based on MIME type
function getSampleRateHertz(mimeType: string): number | undefined {
  if (mimeType === "audio/webm" || mimeType === "audio/ogg") {
    return 48000;
  }
  if (mimeType === "audio/wav" || mimeType === "audio/x-wav") {
    return 16000;
  }
  // Return undefined for formats where sample rate should be omitted
  return undefined;
}

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

    const sampleRateHertz = getSampleRateHertz(mimeType);
    const request = {
      audio: { content: audioContent },
      config: {
        encoding: getGoogleAudioEncoding(mimeType),
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
        ...(sampleRateHertz ? { sampleRateHertz } : {}),
      },
    };

    const response = await client.recognize(request);
    const transcript = response[0].results
      ?.map((result) => result.alternatives?.[0]?.transcript)
      .join("\n");

    res.json({ transcript: transcript || "Transcription failed" });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "Failed to transcribe audio", details: error.message });
  }
});

export default router;