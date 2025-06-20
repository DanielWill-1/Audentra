import { googleCredentials } from './credentials';

// Google Cloud Config
export const GOOGLE_CLOUD_CONFIG = {
  projectId: googleCredentials.project_id,
  credentials: {
    private_key: googleCredentials.private_key,
    client_email: googleCredentials.client_email
  }
};

export const GOOGLE_SPEECH_TO_TEXT_URL = "https://speech.googleapis.com/v1/speech:recognize";
export const GOOGLE_TEXT_TO_SPEECH_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

export const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const LLAMA_API_KEY = import.meta.env.VITE_LLAMA_API_KEY;
export const LLAMA_API_URL = import.meta.env.VITE_LLAMA_API_URL;
