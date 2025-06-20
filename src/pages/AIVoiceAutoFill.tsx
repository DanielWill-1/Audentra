import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Mic,
  MicOff,
  Send,
  Bot,
  User,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  MessageSquare,
  Volume2,
  Download,
  Edit,
  Save,
  X,
  Zap,
  Brain,
  Waveform
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserTemplates, Template } from '../lib/templates';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  value?: any;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface FormData {
  [key: string]: any;
}

function AIVoiceAutoFill() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<FormData>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Processing state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'chat' | 'review'>('select');
  const [isFormComplete, setIsFormComplete] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Load templates
  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await getUserTemplates();
      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    if (template.form_data?.fields) {
      const fields = template.form_data.fields.map((field: any) => ({
        ...field,
        value: field.type === 'checkbox' ? [] : ''
      }));
      setFormFields(fields);
      
      // Initialize form data
      const initialData: FormData = {};
      fields.forEach((field: FormField) => {
        initialData[field.id] = field.type === 'checkbox' ? [] : '';
      });
      setFormData(initialData);
    }
    
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: `Hi! I'm here to help you fill out the "${template.name}" form using your voice. You can speak naturally, and I'll understand what information goes where. What would you like to tell me about this form?`,
      timestamp: new Date()
    };
    setChatMessages([welcomeMessage]);
    setStep('chat');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioUrl && audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    try {
      // Simulate ElevenLabs Speech-to-Text API call
      // In a real implementation, you would send the audioBlob to ElevenLabs
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      // Mock transcription for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockTranscription = "I'm John Smith, born March 15th 1985. I'm here for shoulder pain that started last week after playing tennis. My phone number is 555-123-4567 and my email is john.smith@email.com.";
      
      setTranscription(mockTranscription);
      
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: mockTranscription,
        timestamp: new Date(),
        audioUrl: audioUrl || undefined
      };
      setChatMessages(prev => [...prev, userMessage]);
      
      // Process with AI
      await processWithAI(mockTranscription);
      
    } catch (err) {
      setError('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const processWithAI = async (text: string) => {
    setIsProcessingAI(true);
    try {
      // Simulate Groq AI processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock AI response that fills form fields
      const updatedFormData = { ...formData };
      const aiResponse = [];
      
      // Extract information and fill fields
      if (text.toLowerCase().includes('john smith')) {
        const nameField = formFields.find(f => f.label.toLowerCase().includes('name'));
        if (nameField) {
          updatedFormData[nameField.id] = 'John Smith';
          aiResponse.push(`✓ I've filled in your name as "John Smith"`);
        }
      }
      
      if (text.includes('555-123-4567')) {
        const phoneField = formFields.find(f => f.label.toLowerCase().includes('phone'));
        if (phoneField) {
          updatedFormData[phoneField.id] = '555-123-4567';
          aiResponse.push(`✓ I've added your phone number: 555-123-4567`);
        }
      }
      
      if (text.includes('john.smith@email.com')) {
        const emailField = formFields.find(f => f.label.toLowerCase().includes('email'));
        if (emailField) {
          updatedFormData[emailField.id] = 'john.smith@email.com';
          aiResponse.push(`✓ I've added your email: john.smith@email.com`);
        }
      }
      
      if (text.includes('march 15') || text.includes('1985')) {
        const dobField = formFields.find(f => f.label.toLowerCase().includes('birth') || f.label.toLowerCase().includes('dob'));
        if (dobField) {
          updatedFormData[dobField.id] = '1985-03-15';
          aiResponse.push(`✓ I've set your date of birth as March 15, 1985`);
        }
      }
      
      if (text.includes('shoulder pain')) {
        const complaintField = formFields.find(f => f.label.toLowerCase().includes('complaint') || f.label.toLowerCase().includes('reason'));
        if (complaintField) {
          updatedFormData[complaintField.id] = 'Shoulder pain - onset 1 week ago, sports-related';
          aiResponse.push(`✓ I've noted your chief complaint: Shoulder pain from tennis`);
        }
      }
      
      setFormData(updatedFormData);
      
      // Create AI response
      let responseText = aiResponse.join('\n');
      if (aiResponse.length === 0) {
        responseText = "I heard what you said, but I'm not sure which fields to fill. Could you be more specific about what information you'd like to provide?";
      } else {
        responseText += '\n\nIs there anything else you\'d like to add or any information you\'d like to correct?';
      }
      
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: responseText,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Check if form is complete
      checkFormCompletion(updatedFormData);
      
    } catch (err) {
      setError('Failed to process with AI. Please try again.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const checkFormCompletion = (data: FormData) => {
    const requiredFields = formFields.filter(f => f.required);
    const filledRequiredFields = requiredFields.filter(f => {
      const value = data[f.id];
      return value && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
    });
    
    setIsFormComplete(filledRequiredFields.length === requiredFields.length);
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription('');
    setIsPlaying(false);
  };

  const sendTextMessage = (text: string) => {
    if (!text.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    // Process with AI
    processWithAI(text);
  };

  const updateFormField = (fieldId: string, value: any) => {
    const updatedData = { ...formData, [fieldId]: value };
    setFormData(updatedData);
    checkFormCompletion(updatedData);
  };

  const submitForm = async () => {
    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: '✅ Form submitted successfully! Your information has been saved.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, successMessage]);
      
    } catch (err) {
      setError('Failed to submit form. Please try again.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI Voice Auto-Fill...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Brain className="w-6 h-6 mr-3 text-purple-600" />
                  AI Voice Auto-Fill
                </h1>
                <p className="text-gray-600">Speak naturally to fill forms with AI assistance</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-gradient-to-r from-purple-100 to-blue-100 px-3 py-1 rounded-full">
                <Zap className="w-4 h-4 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-purple-700">AI Powered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-800 text-sm">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Template Selection */}
        {step === 'select' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose a Form Template</h2>
              <p className="text-lg text-gray-600">Select a form template to fill using AI voice assistance</p>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600 mb-6">Create a template first to use AI Voice Auto-Fill</p>
                <Link 
                  to="/templates"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Template
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer hover:border-purple-300"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded capitalize">
                          {template.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{template.form_data?.fields?.length || 0} fields</span>
                      <span className="flex items-center text-purple-600">
                        <Brain className="w-4 h-4 mr-1" />
                        AI Ready
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Chat Interface */}
        {step === 'chat' && selectedTemplate && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Chat Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
                      <p className="text-sm text-gray-600">Filling: {selectedTemplate.name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setStep('review')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        Review Form
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 p-6 overflow-y-auto space-y-4"
                >
                  {chatMessages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : message.type === 'system'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="flex items-start space-x-2">
                          {message.type === 'ai' && (
                            <Bot className="w-4 h-4 mt-0.5 text-purple-600" />
                          )}
                          {message.type === 'user' && (
                            <User className="w-4 h-4 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm whitespace-pre-line">{message.content}</p>
                            {message.audioUrl && (
                              <button
                                onClick={() => {
                                  const audio = new Audio(message.audioUrl);
                                  audio.play();
                                }}
                                className="mt-2 flex items-center text-xs opacity-75 hover:opacity-100"
                              >
                                <Volume2 className="w-3 h-3 mr-1" />
                                Play Audio
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(isTranscribing || isProcessingAI) && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                          <span className="text-sm">
                            {isTranscribing ? 'Transcribing audio...' : 'AI is thinking...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Input */}
                <div className="p-6 border-t border-gray-200">
                  <div className="space-y-4">
                    {/* Recording Controls */}
                    <div className="flex items-center justify-center space-x-4">
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
                        >
                          <Mic className="w-8 h-8" />
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-all animate-pulse"
                        >
                          <MicOff className="w-8 h-8" />
                        </button>
                      )}
                    </div>

                    {/* Recording Status */}
                    {isRecording && (
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 text-red-600">
                          <Waveform className="w-4 h-4 animate-pulse" />
                          <span className="text-sm font-medium">Recording...</span>
                        </div>
                      </div>
                    )}

                    {/* Audio Playback */}
                    {audioUrl && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={playAudio}
                              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <span className="text-sm text-gray-600">Your recording</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={transcribeAudio}
                              disabled={isTranscribing}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center"
                            >
                              {isTranscribing ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Send className="w-4 h-4 mr-2" />
                              )}
                              {isTranscribing ? 'Processing...' : 'Send'}
                            </button>
                            <button
                              onClick={resetRecording}
                              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <audio
                          ref={audioPlayerRef}
                          src={audioUrl}
                          onEnded={() => setIsPlaying(false)}
                          className="hidden"
                        />
                      </div>
                    )}

                    {/* Text Input Alternative */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Or type your message here..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            sendTextMessage(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          sendTextMessage(input.value);
                          input.value = '';
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-600 hover:text-purple-700"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Preview */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Form Preview</h3>
                  {isFormComplete && (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">Complete</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {formFields.map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.id] || ''}
                          onChange={(e) => updateFormField(field.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          rows={2}
                          placeholder={field.placeholder}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={formData[field.id] || ''}
                          onChange={(e) => updateFormField(field.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          {field.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.id] || ''}
                          onChange={(e) => updateFormField(field.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder={field.placeholder}
                        />
                      )}
                      
                      {formData[field.id] && (
                        <div className="mt-1 flex items-center text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span className="text-xs">Filled</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isFormComplete && (
                  <button
                    onClick={submitForm}
                    className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Submit Form
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && selectedTemplate && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>
                  <p className="text-gray-600">Review your form before submitting</p>
                </div>
                <button
                  onClick={() => setStep('chat')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Continue Editing
                </button>
              </div>

              <div className="space-y-6">
                {formFields.map(field => (
                  <div key={field.id} className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {formData[field.id] ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : field.required ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : null}
                    </div>
                    <div className="mt-2">
                      {formData[field.id] ? (
                        <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded">
                          {formData[field.id]}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">Not filled</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => setStep('chat')}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Chat
                </button>
                <button
                  onClick={submitForm}
                  disabled={!isFormComplete}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Submit Form
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIVoiceAutoFill;