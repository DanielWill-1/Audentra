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

    // Check if using local API or Google Cloud directly
    const useLocalAPI = process.env.NODE_ENV === 'development' || !GOOGLE_CLOUD_CONFIG?.credentials?.private_key;

    if (useLocalAPI) {
      // Use local API endpoint
      const response = await fetch("http://localhost:3001/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audio, mimeType }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Transcription API Error:", errorData);
        
        if (response.status === 404) {
          console.error("Transcription API endpoint not found. Please ensure the local API server is running and the endpoint is correct.");
          throw new Error("Transcription API endpoint not found (404). Check server configuration.");
        }

        throw new Error(
          errorData?.error || `Transcription failed with status ${response.status}`
        );
      }

      const { transcript } = await response.json();
      return transcript || "Transcription failed";
    } else {
      // Use Google Cloud Speech-to-Text directly
      if (!GOOGLE_CLOUD_CONFIG.credentials.private_key) {
        console.warn("No Google Cloud credentials found, using mock response");
        return "This is a mock transcription for testing purposes.";
      }

      const requestBody = {
        config: {
          encoding: getGoogleAudioEncoding(mimeType),
          sampleRateHertz: 16000,
          languageCode: "en-US",
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          model: "latest_long",
        },
        audio: {
          content: base64Audio,
        },
      };

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
    }
  } catch (error) {
    console.error("Transcription error:", error);
    
    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('INVALID_AUDIO')) {
        return "Invalid audio data. Please try recording again.";
      } else if (error.message.includes('INVALID_FORMAT')) {
        return "Unsupported audio format. Please use a different recording method.";
      } else if (error.message.includes('TOO_LARGE')) {
        return "Audio file is too large. Please record a shorter message.";
      }
    }
    
    return "Failed to transcribe audio. Please try again.";
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

    // Check if using local API or Google Cloud directly
    const useLocalAPI = process.env.NODE_ENV === 'development' || !GOOGLE_CLOUD_CONFIG?.credentials?.private_key;

    if (useLocalAPI) {
      // Use local API endpoint
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
    } else {
      // Use Google Cloud Text-to-Speech directly
      if (!GOOGLE_CLOUD_CONFIG.credentials.private_key) {
        console.warn("No Google Cloud credentials found, skipping speech synthesis");
        return "";
      }

      const response = await fetch(GOOGLE_TEXT_TO_SPEECH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GOOGLE_CLOUD_CONFIG.credentials.private_key}`,
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: "en-US",
            name: "en-US-Neural2-D",
            ssmlGender: "NEUTRAL",
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("TTS API Error:", errorData);
        throw new Error(
          errorData?.error?.message || `Speech synthesis failed with status ${response.status}`
        );
      }

      const data = await response.json();
      if (!data.audioContent) {
        throw new Error("No audio content received from Google TTS");
      }

      return `data:audio/mp3;base64,${data.audioContent}`;
    }
  } catch (error) {
    console.error("Speech synthesis error:", error);
    // Return empty string instead of error message for TTS failures
    // This allows the app to continue working without audio
    return "";
  }
}

export function createAudioPlayer(audioUrl: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    if (!audioUrl) {
      return reject(new Error("Audio URL is required."));
    }

    const audio = new Audio(audioUrl);

    audio.onerror = () => {
      reject(new Error("Failed to load audio. Please check the URL or format."));
    };

    audio.oncanplaythrough = () => {
      resolve(audio);
    };

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

    if (!rawContent) {
      throw new Error("No response content received from AI");
    }

    // Try parsing the response as JSON
    let parsedResponse = {
      response: rawContent,
      extractedData: {}
    };

    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.response && typeof parsed.response === 'string') {
        parsedResponse = parsed;
      }
    } catch (parseError) {
      console.warn("AI did not return valid JSON, using raw response");
      // Try to extract data using regex as fallback
      const extractedData = extractDataFromText(rawContent, formFields, currentFormData);
      parsedResponse.extractedData = extractedData;
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
    email: /\b[A-Za-z0-9._%+-]+@[A-ZaZ0-9.-]+\.[A-Z|a-z]{2,}\b/g,
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