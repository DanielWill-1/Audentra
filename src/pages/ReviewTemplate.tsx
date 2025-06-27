import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Eye,
  Edit,
  Share2,
  Download,
  Copy,
  Play,
  Pause,
  RotateCcw,
  Mic,
  MicOff,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap,
  Building2,
  Star,
  Clock,
  User,
  Calendar,
  X,
  Save,
  Settings
} from 'lucide-react';
import { getTemplateById, Template } from '../lib/templates';
import { useAuth } from '../contexts/AuthContext';

const CATEGORY_ICONS = {
  healthcare: Stethoscope,
  fieldwork: HardHat,
  hr: UserCheck,
  legal: Scale,
  education: GraduationCap,
  realestate: Building2
};

interface FormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface FormData {
  [key: string]: any;
}

function ReviewTemplate() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [activeTab, setActiveTab] = useState('preview');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVoiceDemo, setShowVoiceDemo] = useState(false);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    if (!templateId) return;
    
    try {
      setLoading(true);
      const { data, error } = await getTemplateById(templateId);
      if (error) throw error;
      setTemplate(data);
      
      // Initialize form data with empty values
      if (data?.form_data?.fields) {
        const initialData: FormData = {};
        data.form_data.fields.forEach((field: FormField) => {
          initialData[field.id] = '';
        });
        setFormData(initialData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || FileText;
    return IconComponent;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an option</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) ? value.includes(option) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleFieldChange(field.id, [...currentValues, option]);
                    } else {
                      handleFieldChange(field.id, currentValues.filter(v => v !== option));
                    }
                  }}
                  className="text-blue-600 focus:ring-blue-500 mr-2 rounded"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      
      default:
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  const startVoiceDemo = () => {
    setShowVoiceDemo(true);
    // Simulate voice recording
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setAudioUrl('demo-audio-url');
      // Simulate form filling
      if (template?.form_data?.fields) {
        const demoData: FormData = {};
        template.form_data.fields.forEach((field: FormField, index: number) => {
          if (index < 3) { // Fill first 3 fields for demo
            switch (field.type) {
              case 'text':
                demoData[field.id] = field.label.toLowerCase().includes('name') ? 'John Smith' : 'Sample text';
                break;
              case 'email':
                demoData[field.id] = 'john.smith@example.com';
                break;
              case 'number':
                demoData[field.id] = '123';
                break;
              case 'date':
                demoData[field.id] = '2024-01-15';
                break;
              default:
                demoData[field.id] = 'Demo value';
            }
          }
        });
        setFormData(prev => ({ ...prev, ...demoData }));
      }
    }, 3000);
  };

  const resetForm = () => {
    if (template?.form_data?.fields) {
      const resetData: FormData = {};
      template.form_data.fields.forEach((field: FormField) => {
        resetData[field.id] = '';
      });
      setFormData(resetData);
    }
    setShowVoiceDemo(false);
    setAudioUrl(null);
    setIsPlaying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Template Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The template you\'re looking for doesn\'t exist.'}</p>
          <Link to="/templates" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  const IconComponent = getCategoryIcon(template.category);
  const formFields = template.form_data?.fields || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link to="/templates" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <IconComponent className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                  <p className="text-gray-600">Template preview and testing</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to={`/template/share/${template.id}`}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Link>
              <Link 
                to={`/templates?edit=${template.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Template
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl border border-gray-200 mb-8">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'preview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Eye className="w-4 h-4 mr-2 inline" />
                    Form Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('voice')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'voice'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Mic className="w-4 h-4 mr-2 inline" />
                    Voice Demo
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'analytics'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Star className="w-4 h-4 mr-2 inline" />
                    Reviews
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'preview' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={resetForm}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset
                        </button>
                        <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                          <Save className="w-3 h-3 mr-1" />
                          Save Draft
                        </button>
                      </div>
                    </div>

                    {formFields.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Fields Defined</h4>
                        <p className="text-gray-600 mb-4">This template doesn't have any form fields yet.</p>
                        <Link 
                          to={`/templates?edit=${template.id}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add Fields
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {formFields.map((field: FormField) => (
                          <div key={field.id} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {renderFormField(field)}
                            {field.placeholder && (
                              <p className="text-xs text-gray-500">Placeholder: {field.placeholder}</p>
                            )}
                          </div>
                        ))}
                        
                        <div className="pt-6 border-t border-gray-200">
                          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            Submit Form
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'voice' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Demo</h3>
                      <p className="text-gray-600 mb-6">
                        Experience how voice input would work with this template
                      </p>
                      
                      {!showVoiceDemo ? (
                        <button
                          onClick={startVoiceDemo}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 flex items-center mx-auto"
                        >
                          <Mic className="w-5 h-5 mr-2" />
                          Start Voice Demo
                        </button>
                      ) : (
                        <div className="space-y-4">
                          {isRecording ? (
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center animate-pulse mb-4">
                                <MicOff className="w-10 h-10 text-white" />
                              </div>
                              <p className="text-red-600 font-medium">Recording voice input...</p>
                              <p className="text-sm text-gray-600">Simulating: "My name is John Smith, email john.smith@example.com"</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                                  <div>
                                    <p className="text-green-800 font-medium">Voice input processed successfully!</p>
                                    <p className="text-green-700 text-sm">Form fields have been automatically filled.</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex justify-center space-x-4">
                                <button
                                  onClick={() => setIsPlaying(!isPlaying)}
                                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                  {isPlaying ? 'Pause' : 'Play'} Audio
                                </button>
                                <button
                                  onClick={resetForm}
                                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Try Again
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {showVoiceDemo && !isRecording && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Auto-filled Fields</h4>
                        <div className="space-y-3">
                          {Object.entries(formData).filter(([_, value]) => value).map(([fieldId, value]) => {
                            const field = formFields.find((f: FormField) => f.id === fieldId);
                            return (
                              <div key={fieldId} className="flex items-center justify-between py-2 border-b border-gray-200">
                                <span className="text-sm font-medium text-gray-700">{field?.label}</span>
                                <span className="text-sm text-gray-900 bg-white px-2 py-1 rounded">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Average Rating</p>
                            <div className="flex items-center mt-1">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                                ))}
                              </div>
                              <span className="text-lg font-bold text-blue-900 ml-2">4.8</span>
                            </div>
                          </div>
                          <Star className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-6 border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-emerald-600 font-medium">Total Reviews</p>
                            <p className="text-2xl font-bold text-emerald-900">127</p>
                          </div>
                          <User className="w-8 h-8 text-emerald-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg">
                      <div className="p-4 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900">Recent Reviews</h4>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                                JS
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">John Smith</p>
                                <div className="flex items-center">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star key={star} className="w-3 h-3 text-yellow-400 fill-current" />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">2 days ago</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            "Excellent template! Very comprehensive and easy to use. The voice feature works perfectly."
                          </p>
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                                MJ
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Maria Johnson</p>
                                <div className="flex items-center">
                                  {[1, 2, 3, 4].map(star => (
                                    <Star key={star} className="w-3 h-3 text-yellow-400 fill-current" />
                                  ))}
                                  <Star className="w-3 h-3 text-gray-300" />
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">1 week ago</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            "Good template overall. Could use a few more customization options but works well for our needs."
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <div className="flex items-center mt-1">
                    <IconComponent className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="font-medium text-gray-900 capitalize">{template.category}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Fields</p>
                  <p className="font-medium text-gray-900">{formFields.length} fields</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Required Fields</p>
                  <p className="font-medium text-gray-900">
                    {formFields.filter((f: FormField) => f.required).length} required
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <div className="flex items-center mt-1">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">
                      {new Date(template.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <div className="flex items-center mt-1">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">
                      {new Date(template.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="font-medium text-green-600">94%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg. Time</span>
                  <span className="font-medium text-gray-900">3.2 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Voice Usage</span>
                  <span className="font-medium text-purple-600">78%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="font-medium text-red-600">2.1%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <Link
                  to={`/ai-voice-autofill?template=${template.id}`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Try Voice Fill
                </Link>
                <Link
                  to={`/template/share/${template.id}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Template
                </Link>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4 mr-2" />
                  Export Template
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewTemplate;