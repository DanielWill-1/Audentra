// AI Voice Service for ElevenLabs and Groq integration
// This file contains the service functions for the AI Voice Auto-Fill feature

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  duration: number;
}

export interface AIResponse {
  message: string;
  formUpdates: Record<string, any>;
  followUpQuestions?: string[];
  confidence: number;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

// ElevenLabs Speech-to-Text Service
export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResponse> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('model', 'whisper-1');

      const response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        text: data.text,
        confidence: data.confidence || 0.9,
        duration: data.duration || 0
      };
    } catch (error) {
      console.error('ElevenLabs transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }
}

// Groq AI Service
export class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processFormInput(
    transcription: string,
    formFields: FormField[],
    currentFormData: Record<string, any>,
    conversationHistory: string[] = []
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(formFields, currentFormData);
      const userPrompt = this.buildUserPrompt(transcription, conversationHistory);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768', // or 'llama3-70b-8192'
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;

      // Parse the AI response to extract form updates
      const formUpdates = this.parseFormUpdates(aiMessage, formFields);
      
      return {
        message: this.extractResponseMessage(aiMessage),
        formUpdates,
        followUpQuestions: this.extractFollowUpQuestions(aiMessage),
        confidence: 0.9
      };
    } catch (error) {
      console.error('Groq AI processing error:', error);
      throw new Error('Failed to process with AI');
    }
  }

  private buildSystemPrompt(formFields: FormField[], currentFormData: Record<string, any>): string {
    const fieldsDescription = formFields.map(field => 
      `- ${field.label} (${field.type}${field.required ? ', required' : ''}): ${field.options ? `Options: ${field.options.join(', ')}` : ''}`
    ).join('\n');

    const currentDataDescription = Object.entries(currentFormData)
      .filter(([_, value]) => value && value !== '')
      .map(([key, value]) => {
        const field = formFields.find(f => f.id === key);
        return `- ${field?.label || key}: ${value}`;
      }).join('\n');

    return `You are an AI assistant helping users fill out forms using voice input. 

FORM FIELDS:
${fieldsDescription}

CURRENT FORM DATA:
${currentDataDescription || 'No data filled yet'}

INSTRUCTIONS:
1. Listen to what the user says and extract relevant information for the form fields
2. Map the information to the appropriate form fields based on context
3. If information is ambiguous, ask clarifying questions
4. Respond in a conversational, helpful manner
5. Confirm what information you've filled in
6. Ask follow-up questions if needed to complete required fields

RESPONSE FORMAT:
Your response should be conversational and include:
- Confirmation of what information you've extracted and filled
- Any clarifying questions if needed
- Encouragement to continue providing information

Be natural, friendly, and efficient. Don't be overly verbose.`;
  }

  private buildUserPrompt(transcription: string, conversationHistory: string[]): string {
    let prompt = `User said: "${transcription}"`;
    
    if (conversationHistory.length > 0) {
      prompt += `\n\nConversation history:\n${conversationHistory.join('\n')}`;
    }

    return prompt;
  }

  private parseFormUpdates(aiResponse: string, formFields: FormField[]): Record<string, any> {
    const updates: Record<string, any> = {};
    
    // This is a simplified parser - in a real implementation, you'd want more sophisticated parsing
    // Look for patterns like "name: John Smith" or "email: john@example.com"
    
    formFields.forEach(field => {
      const fieldName = field.label.toLowerCase();
      
      // Try to extract information based on field type and label
      if (field.type === 'email') {
        const emailMatch = aiResponse.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
          updates[field.id] = emailMatch[0];
        }
      } else if (field.type === 'date') {
        // Look for date patterns
        const datePatterns = [
          /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,
          /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,
        ];
        
        for (const pattern of datePatterns) {
          const match = aiResponse.match(pattern);
          if (match) {
            updates[field.id] = match[0];
            break;
          }
        }
      } else if (fieldName.includes('phone')) {
        const phoneMatch = aiResponse.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
        if (phoneMatch) {
          updates[field.id] = phoneMatch[0];
        }
      }
      // Add more field type parsing as needed
    });

    return updates;
  }

  private extractResponseMessage(aiResponse: string): string {
    // Extract the conversational part of the AI response
    // This is simplified - you might want to use more sophisticated parsing
    return aiResponse;
  }

  private extractFollowUpQuestions(aiResponse: string): string[] {
    // Extract any follow-up questions from the AI response
    const questions: string[] = [];
    const questionPattern = /\?[^?]*$/g;
    const matches = aiResponse.match(questionPattern);
    
    if (matches) {
      questions.push(...matches.map(q => q.trim()));
    }
    
    return questions;
  }
}

// Mock services for development/demo
export class MockElevenLabsService {
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock transcription
    return {
      text: "I'm John Smith, born March 15th 1985. I'm here for shoulder pain that started last week after playing tennis. My phone number is 555-123-4567 and my email is john.smith@email.com.",
      confidence: 0.95,
      duration: 8.5
    };
  }
}

export class MockGroqService {
  async processFormInput(
    transcription: string,
    formFields: FormField[],
    currentFormData: Record<string, any>
  ): Promise<AIResponse> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const formUpdates: Record<string, any> = {};
    const confirmations: string[] = [];
    
    // Mock AI logic to extract information
    if (transcription.toLowerCase().includes('john smith')) {
      const nameField = formFields.find(f => f.label.toLowerCase().includes('name'));
      if (nameField) {
        formUpdates[nameField.id] = 'John Smith';
        confirmations.push('✓ I\'ve filled in your name as "John Smith"');
      }
    }
    
    if (transcription.includes('555-123-4567')) {
      const phoneField = formFields.find(f => f.label.toLowerCase().includes('phone'));
      if (phoneField) {
        formUpdates[phoneField.id] = '555-123-4567';
        confirmations.push('✓ I\'ve added your phone number: 555-123-4567');
      }
    }
    
    if (transcription.includes('john.smith@email.com')) {
      const emailField = formFields.find(f => f.label.toLowerCase().includes('email'));
      if (emailField) {
        formUpdates[emailField.id] = 'john.smith@email.com';
        confirmations.push('✓ I\'ve added your email: john.smith@email.com');
      }
    }
    
    if (transcription.includes('march 15') || transcription.includes('1985')) {
      const dobField = formFields.find(f => 
        f.label.toLowerCase().includes('birth') || 
        f.label.toLowerCase().includes('dob')
      );
      if (dobField) {
        formUpdates[dobField.id] = '1985-03-15';
        confirmations.push('✓ I\'ve set your date of birth as March 15, 1985');
      }
    }
    
    if (transcription.includes('shoulder pain')) {
      const complaintField = formFields.find(f => 
        f.label.toLowerCase().includes('complaint') || 
        f.label.toLowerCase().includes('reason')
      );
      if (complaintField) {
        formUpdates[complaintField.id] = 'Shoulder pain - onset 1 week ago, sports-related';
        confirmations.push('✓ I\'ve noted your chief complaint: Shoulder pain from tennis');
      }
    }
    
    let message = confirmations.join('\n');
    if (confirmations.length === 0) {
      message = "I heard what you said, but I'm not sure which fields to fill. Could you be more specific about what information you'd like to provide?";
    } else {
      message += '\n\nIs there anything else you\'d like to add or any information you\'d like to correct?';
    }
    
    return {
      message,
      formUpdates,
      followUpQuestions: ['Would you like to add any additional information?'],
      confidence: 0.9
    };
  }
}

// Service factory
export function createAIVoiceServices(useRealAPIs: boolean = false) {
  if (useRealAPIs) {
    // Use real API keys from environment variables
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (!elevenLabsKey || !groqKey) {
      console.warn('API keys not found, falling back to mock services');
      return {
        elevenLabs: new MockElevenLabsService(),
        groq: new MockGroqService()
      };
    }
    
    return {
      elevenLabs: new ElevenLabsService(elevenLabsKey),
      groq: new GroqService(groqKey)
    };
  }
  
  return {
    elevenLabs: new MockElevenLabsService(),
    groq: new MockGroqService()
  };
}