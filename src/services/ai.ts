import {
  GOOGLE_CLOUD_CONFIG,
  GOOGLE_SPEECH_TO_TEXT_URL,
  GOOGLE_TEXT_TO_SPEECH_URL,
  GROQ_API_KEY,
  GROQ_API_URL,
} from "../config/api";

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

export async function transcribeAudio({
  audio,
  mimeType,
}: {
  audio: string | null;
  mimeType: string;
}): Promise<string> {
  try {
    // Validate input
    if (!audio || !mimeType) {
      throw new Error("Audio and MIME type are required.");
    }

    if (!audio.includes(",")) {
      throw new Error("Invalid audio input: Audio must be a valid base64 string.");
    }

    // Validate audio input
    const validation = validateAudioInput(audio, mimeType);
    if (!validation.isValid) {
      throw validation.error;
    }

    const base64Audio = audio.split(",")[1];
    if (!base64Audio) {
      throw new Error("Invalid audio data format: Base64 content is missing.");
    }

    // ✅ Fixed: Always use local API for now to avoid configuration issues
    const API_BASE = "http://localhost:3001";
    const transcribeUrl = `${API_BASE}/api/transcribe`;
    
    console.log('Transcribing with URL:', transcribeUrl);
    console.log('Audio MIME type:', mimeType);
    console.log('Base64 audio length:', base64Audio.length);

    // ✅ Fixed: Validate URL before making fetch request
    if (!transcribeUrl || transcribeUrl === 'undefined/api/transcribe') {
      throw new Error('Invalid API URL configuration');
    }

    const response = await fetch(transcribeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        audio, 
        mimeType 
      }),
    });

    console.log('Transcription response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Transcription API Error:", errorData);

      if (response.status === 404) {
        throw new Error("Transcription API endpoint not found. Please ensure the server is running on http://localhost:3001");
      }

      if (response.status === 500) {
        throw new Error("Internal server error. Please check the server logs.");
      }

      throw new Error(
        errorData?.error || `Transcription failed with status ${response.status}`
      );
    }

    const result = await response.json();
    console.log('Transcription result:', result);

    const transcript = result.transcript || result.text || "Transcription failed";
    
    if (!transcript || transcript.trim() === '') {
      throw new Error('No transcription received from server');
    }

    return transcript;

  } catch (error) {
    console.error("Transcription error:", error);
    
    // ✅ Fixed: Don't return error messages as transcriptions
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error("Network error: Unable to connect to transcription service. Please check if the server is running.");
      }
      throw error; // Re-throw the original error
    }
    
    throw new Error("Failed to transcribe audio. Please try again.");
  }
}

export async function synthesizeSpeech(text: string): Promise<string> {
  try {
    // Validate input
    if (!text?.trim()) {
      console.warn("Empty text provided for speech synthesis");
      return "";
    }

    if (text.length > 5000) {
      console.warn("Text too long for speech synthesis, truncating");
      text = text.substring(0, 5000) + "...";
    }

    // ✅ Fixed: Always use local API for consistency
    const API_BASE = "http://localhost:3001";
    const ttsUrl = `${API_BASE}/api/tts`;
    
    console.log('Synthesizing speech with URL:', ttsUrl);

    // ✅ Fixed: Validate URL before making fetch request
    if (!ttsUrl || ttsUrl === 'undefined/api/tts') {
      console.warn('Invalid TTS API URL, skipping speech synthesis');
      return "";
    }

    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("TTS API Error:", errorData);
      // Don't throw error for TTS, just return empty string
      return "";
    }

    const { audioContent } = await response.json();
    if (!audioContent) {
      console.warn("No audio content received from TTS API");
      return "";
    }

    return `data:audio/mp3;base64,${audioContent}`;

  } catch (error) {
    console.error("Speech synthesis error:", error);
    // Return empty string instead of error message for TTS failures
    return "";
  }
}

export function createAudioPlayer(audioUrl: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    if (!audioUrl) {
      return reject(new Error("Audio URL is required."));
    }

    const audio = new Audio(audioUrl);

    // Handle specific media errors
    audio.addEventListener("error", () => {
      if (audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        reject(new Error("Audio format not supported."));
      } else if (audio.error?.code === MediaError.MEDIA_ERR_NETWORK) {
        reject(new Error("Network error while loading audio."));
      } else if (audio.error?.code === MediaError.MEDIA_ERR_DECODE) {
        reject(new Error("Audio decoding error."));
      } else {
        reject(new Error("Failed to play audio."));
      }
    });

    // Set a timeout for loading
    const timeout = setTimeout(() => {
      reject(new Error("Audio loading timeout."));
    }, 10000);

    audio.oncanplaythrough = () => {
      clearTimeout(timeout);
      resolve(audio);
    };

    audio.load();
  });
}

// Helper to extract JSON from a string (even if LLM adds extra text)
function extractJSONFromString(text: string): any | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}

export async function processWithGroq(
  userInput: string,
  formFields: any[],
  currentFormData: any,
  conversation: any[]
): Promise<{ response: string; extractedData: any; audioUrl?: string }> {
  try {
    // Validate inputs
    if (!userInput?.trim()) {
      throw new Error("User input is required");
    }

    if (!GROQ_API_KEY) {
      console.warn("No Groq API key found, using mock response");
      return {
        response: "This is a mock AI response for testing purposes.",
        extractedData: { name: "John Doe", email: "test@example.com" },
      };
    }

    // Create enhanced system prompt for better form field extraction
    const systemPrompt = `You are a helpful AI assistant that processes form data and extracts relevant information from user input.

Your task is to:
1. Understand what the user is saying
2. Extract relevant information that matches the form fields
3. Provide a natural, conversational response
4. Return the extracted data in the specified format

Form Fields Available:
${formFields.map(field => `- ${field.label} (${field.type}${field.required ? ', required' : ''})`).join('\n')}

Current Form Data:
${JSON.stringify(currentFormData, null, 2)}

IMPORTANT: Always respond with a JSON object containing:
- "response": A natural, helpful response to the user
- "extractedData": An object with field IDs as keys and extracted values

Example response format:
{
  "response": "I've captured your name and email. Is there anything else you'd like to add?",
  "extractedData": {
    "name": "John Smith",
    "email": "john@example.com"
  }
}`;

    // ✅ Fixed: Validate GROQ API URL
    if (!GROQ_API_URL || GROQ_API_URL === 'undefined') {
      throw new Error('GROQ API URL is not configured');
    }

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
            content: systemPrompt,
          },
          ...conversation
            .filter(msg => msg.type !== 'system') // Exclude system messages from conversation history
            .map((msg) => ({
              role: msg.type === "user" ? "user" : "assistant",
              content: msg.content,
            })),
          {
            role: "user",
            content: userInput,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 2048,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API Error:", errorText);
      throw new Error(`HTTP error! status: ${response.status}\n${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    let parsedResponse = {
      response: rawContent,
      extractedData: {}
    };

    // Try parsing the response as JSON
    let extracted = null;
    try {
      extracted = JSON.parse(rawContent);
    } catch {
      extracted = extractJSONFromString(rawContent);
    }
    if (extracted && extracted.response && typeof extracted.response === 'string') {
      parsedResponse = extracted;
    }

    // Generate speech for the response
    let audioUrl: string | undefined;
    try {
      audioUrl = await synthesizeSpeech(parsedResponse.response);
    } catch (ttsError) {
      console.warn("Failed to generate speech, continuing without audio:", ttsError);
    }

    return {
      response: parsedResponse.response,
      extractedData: parsedResponse.extractedData || {},
      audioUrl: audioUrl || undefined,
    };
  } catch (error) {
    console.error("AI Processing error:", error);
    return {
      response: "I'm having trouble processing that right now. Could you please try rephrasing your request?",
      extractedData: {},
    };
  }
}

// Fallback function to extract data from text when JSON parsing fails
function extractDataFromText(text: string, formFields: any[], currentFormData: any): any {
  const extractedData: any = {};
  
  // Simple extraction patterns - you can enhance these
  const patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    name: /(?:my name is|i'm|i am|call me)\s+([A-Za-z\s]+)/gi,
  };

  // Extract emails
  const emails = text.match(patterns.email);
  if (emails && emails.length > 0) {
    const emailField = formFields.find(f => f.type === 'email');
    if (emailField) {
      extractedData[emailField.id] = emails[0];
    }
  }

  // Extract phone numbers
  const phones = text.match(patterns.phone);
  if (phones && phones.length > 0) {
    const phoneField = formFields.find(f => f.label.toLowerCase().includes('phone'));
    if (phoneField) {
      extractedData[phoneField.id] = phones[0];
    }
  }

  // Extract names
  const nameMatches = text.match(patterns.name);
  if (nameMatches && nameMatches.length > 0) {
    const nameField = formFields.find(f => f.label.toLowerCase().includes('name'));
    if (nameField) {
      extractedData[nameField.id] = nameMatches[0].replace(/(?:my name is|i'm|i am|call me)\s+/gi, '').trim();
    }
  }

  return extractedData;
} 