import {
  GOOGLE_CLOUD_CONFIG,
  GOOGLE_SPEECH_TO_TEXT_URL,
  GOOGLE_TEXT_TO_SPEECH_URL,
  GROQ_API_KEY,
  GROQ_API_URL,
} from "../config/api";
import fs from "fs";

interface AudioValidationError extends Error {
  code: 'INVALID_AUDIO' | 'INVALID_FORMAT' | 'TOO_LARGE' | 'CORRUPTED';
}

function validateAudioInput(audio: string, mimeType: string): { isValid: boolean; error?: AudioValidationError } {
  if (!audio) {
    return { 
      isValid: false, 
      error: Object.assign(new Error('Audio data is required'), { 
        code: 'INVALID_AUDIO' 
      }) as AudioValidationError 
    };
  }

  const validMimeTypes = ['audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/flac'];
  if (!validMimeTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: Object.assign(new Error(`Unsupported audio format: ${mimeType}`), {
        code: 'INVALID_FORMAT'
      }) as AudioValidationError
    };
  }

  // Add size limit (10MB)
  const base64Data = audio.split(',')[1];
  if (base64Data && base64Data.length > 10 * 1024 * 1024) {
    return {
      isValid: false,
      error: Object.assign(new Error('Audio file too large (max 10MB)'), {
        code: 'TOO_LARGE'
      }) as AudioValidationError
    };
  }

  return { isValid: true };
}

export async function transcribeAudio({
  audio,
  mimeType,
}: {
  audio: string | null;
  mimeType: string;
}): Promise<string> {
  try {
    // Validate input
    const validation = validateAudioInput(audio || "", mimeType);
    if (!validation.isValid) {
      throw validation.error;
    }

    if (!GOOGLE_CLOUD_CONFIG.credentials.private_key) {
      console.warn("No Google Cloud credentials found, using mock response");
      return "This is a mock transcription for testing purposes.";
    }

    const base64Audio = audio?.split(",")[1];
    if (!base64Audio) {
      throw new Error("Invalid audio data format: Base64 content is missing.");
    }

    const requestBody = {
      config: {
        encoding: getGoogleAudioEncoding(mimeType),
        sampleRateHertz: 16000,
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
      },
      audio: {
        content: base64Audio,
      },
    };

    console.log("Transcribe Request:", {
      url: GOOGLE_SPEECH_TO_TEXT_URL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GOOGLE_CLOUD_CONFIG.credentials.private_key}`,
      },
      body: JSON.stringify(requestBody),
    });

    const response = await fetch(GOOGLE_SPEECH_TO_TEXT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GOOGLE_CLOUD_CONFIG.credentials.private_key}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Transcription API Error:", errorData);
      throw new Error(
        errorData?.error?.message || `Transcription failed with status ${response.status}`
      );
    }

    const data = await response.json();
    const transcript =
      data.results?.[0]?.alternatives?.[0]?.transcript || "Transcription failed";
    return transcript;
  } catch (error) {
    console.error("Transcription error:", error);
    return "Failed to transcribe audio. Please try again.";
  }
}

export async function synthesizeSpeech(text: string): Promise<string> {
  try {
    // Validate input
    if (!text?.trim()) {
      throw new Error("Text input is required.");
    }

    if (text.length > 5000) {
      throw new Error("Text too long (max 5000 characters).");
    }

    // Check if service-account.json exists
    const serviceAccountPath = "../service-account.json";
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`ENOENT: Missing service-account.json at ${serviceAccountPath}`);
    }

    const response = await fetch("http://localhost:3001/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("TTS API Error:", errorData);

      if (response.status === 500) {
        throw new Error("TTS service temporarily unavailable. Please try again later.");
      }

      throw new Error(errorData.error?.details || "Failed to generate speech.");
    }

    const { audioContent } = await response.json();
    if (!audioContent) {
      throw new Error("No audio content received.");
    }

    return `data:audio/mp3;base64,${audioContent}`;
  } catch (error) {
    console.error("Speech synthesis error:", error);
    return "Failed to generate speech. Please try again.";
  }
}

export function createAudioPlayer(audioUrl: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    
    audio.onerror = () => {
      reject(new Error('Failed to load audio'));
    };

    audio.oncanplaythrough = () => {
      resolve(audio);
    };

    // Handle blob range errors
    audio.addEventListener('error', (e) => {
      if (audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        reject(new Error('Audio format not supported'));
      } else if (audio.error?.code === MediaError.MEDIA_ERR_NETWORK) {
        reject(new Error('Network error while loading audio'));
      } else {
        reject(new Error('Failed to play audio'));
      }
    });

    audio.load();
  });
}

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

export async function processWithGroq(
  userInput: string,
  formFields: any[],
  currentFormData: any,
  conversation: any[]
): Promise<{ response: string; extractedData: any; audioUrl?: string }> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that processes form data and extracts relevant information. Format your response as a JSON object with 'response' (string) and 'extractedData' (object) fields.",
          },
          ...conversation.map((msg) => ({
            role: msg.type === "user" ? "user" : "assistant",
            content: msg.content,
          })),
          {
            role: "user",
            content: `Please extract form information from this input:\nForm Fields: ${JSON.stringify(
              formFields
            )}\nCurrent Form Data: ${JSON.stringify(
              currentFormData
            )}\nUser Input: ${userInput}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text(); // helpful for debugging
      throw new Error(`HTTP error! status: ${response.status}\n${errorText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;

    // Try parsing the response content
    let extracted = {};
    let reply = raw;
    try {
      const parsed = JSON.parse(raw || "{}");
      extracted = parsed.extractedData || {};
      reply = parsed.response || raw;
    } catch {
      console.warn("AI did not return JSON, falling back to raw string.");
    }

    const audioUrl = await synthesizeSpeech(reply);

    return {
      response: reply,
      extractedData: extracted,
      audioUrl: audioUrl || undefined,
    };
  } catch (error) {
    console.error("AI Processing error:", error);
    return {
      response: "Error processing with AI. Using mock response for testing.",
      extractedData: {},
    };
  }
}