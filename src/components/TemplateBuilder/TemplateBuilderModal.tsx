import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Upload, 
  Edit, 
  Mic, 
  Save, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  GripVertical
} from 'lucide-react';
import { createTemplate, uploadTemplateFile } from '../../lib/templates';
import { useAuth } from '../../contexts/AuthContext';

interface TemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

const CATEGORIES = [
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'fieldwork', name: 'Field Work' },
  { id: 'hr', name: 'Human Resources' },
  { id: 'legal', name: 'Legal' },
  { id: 'education', name: 'Education' },
  { id: 'realestate', name: 'Real Estate' }
];

const FIELD_TYPES = [
  { id: 'text', name: 'Text Input', icon: FileText },
  { id: 'email', name: 'Email', icon: FileText },
  { id: 'number', name: 'Number', icon: FileText },
  { id: 'date', name: 'Date', icon: FileText },
  { id: 'textarea', name: 'Text Area', icon: FileText },
  { id: 'select', name: 'Dropdown', icon: FileText },
  { id: 'radio', name: 'Radio Buttons', icon: FileText },
  { id: 'checkbox', name: 'Checkboxes', icon: FileText }
];

export default function TemplateBuilderModal({ isOpen, onClose, onSuccess }: TemplateBuilderModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Step 1: Basic Info
  const [templateInfo, setTemplateInfo] = useState({
    name: '',
    category: '',
    description: '',
    visibility: 'visible' as 'visible' | 'hidden'
  });

  // Step 2: Creation Method
  const [creationMethod, setCreationMethod] = useState<'manual' | 'upload' | null>(null);

  // Step 3: Manual Form Builder
  const [formFields, setFormFields] = useState<FormField[]>([]);

  // Step 3: File Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const resetModal = () => {
    setStep(1);
    setTemplateInfo({ name: '', category: '', description: '', visibility: 'visible' });
    setCreationMethod(null);
    setFormFields([]);
    setUploadedFile(null);
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && (!templateInfo.name || !templateInfo.category)) {
      setError('Please fill in all required fields');
      return;
    }
    if (step === 2 && !creationMethod) {
      setError('Please select a creation method');
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const addFormField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
      options: []
    };
    setFormFields([...formFields, newField]);
  };

  const updateFormField = (id: string, updates: Partial<FormField>) => {
    setFormFields(formFields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeFormField = (id: string) => {
    setFormFields(formFields.filter(field => field.id !== id));
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = formFields.findIndex(field => field.id === id);
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === formFields.length - 1)
    ) {
      return;
    }

    const newFields = [...formFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFormFields(newFields);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/json',
        'text/csv',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid file (JSON, CSV, PDF, or Excel)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }

      setUploadedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setError('You must be logged in to create a template');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let templateData: any = {
        name: templateInfo.name,
        category: templateInfo.category,
        description: templateInfo.description,
        visibility: templateInfo.visibility,
        created_by: user.id
      };

      if (creationMethod === 'manual') {
        if (formFields.length === 0) {
          setError('Please add at least one form field');
          setLoading(false);
          return;
        }
        templateData.form_data = { fields: formFields };
      } else if (creationMethod === 'upload') {
        if (!uploadedFile) {
          setError('Please upload a file');
          setLoading(false);
          return;
        }
      }

      // Create the template first
      const { data: template, error: createError } = await createTemplate(templateData);
      
      if (createError) {
        throw createError;
      }

      // If there's a file to upload, handle it
      if (uploadedFile && template) {
        const { data: fileData, error: uploadError } = await uploadTemplateFile(uploadedFile, template.id);
        
        if (uploadError) {
          throw uploadError;
        }

        // Update template with file path
        templateData.uploaded_file = fileData?.path;
      }

      setSuccess('Template created successfully!');
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Template</h2>
              <p className="text-gray-600 mt-1">Step {step} of 3</p>
            </div>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center">
              {[1, 2, 3].map((stepNumber) => (
                <React.Fragment key={stepNumber}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNumber <= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      stepNumber < step ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Basic Info</span>
              <span>Creation Method</span>
              <span>Build Template</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-green-800 text-sm">{success}</span>
            </div>
          )}

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateInfo.name}
                    onChange={(e) => setTemplateInfo({ ...templateInfo, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select 
                    value={templateInfo.category}
                    onChange={(e) => setTemplateInfo({ ...templateInfo, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={templateInfo.description}
                  onChange={(e) => setTemplateInfo({ ...templateInfo, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what this template is used for"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Visibility</label>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="visible"
                      name="visibility"
                      value="visible"
                      checked={templateInfo.visibility === 'visible'}
                      onChange={(e) => setTemplateInfo({ ...templateInfo, visibility: e.target.value as 'visible' | 'hidden' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="visible" className="ml-3">
                      <span className="font-medium text-gray-900">Visible</span>
                      <p className="text-sm text-gray-600">Other team members can see and use this template</p>
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="hidden"
                      name="visibility"
                      value="hidden"
                      checked={templateInfo.visibility === 'hidden'}
                      onChange={(e) => setTemplateInfo({ ...templateInfo, visibility: e.target.value as 'visible' | 'hidden' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="hidden" className="ml-3">
                      <span className="font-medium text-gray-900">Hidden</span>
                      <p className="text-sm text-gray-600">Only you can access this template</p>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Creation Method */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  How would you like to create this template?
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div 
                    onClick={() => setCreationMethod('manual')}
                    className={`bg-white p-6 rounded-lg border-2 cursor-pointer transition-all ${
                      creationMethod === 'manual' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <Edit className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Manual Form Builder</h4>
                    <p className="text-sm text-gray-600">
                      Build your form step by step using our visual form builder. 
                      Add fields, configure validation, and customize the layout.
                    </p>
                  </div>

                  <div 
                    onClick={() => setCreationMethod('upload')}
                    className={`bg-white p-6 rounded-lg border-2 cursor-pointer transition-all ${
                      creationMethod === 'upload' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Upload Existing Form</h4>
                    <p className="text-sm text-gray-600">
                      Upload an existing form from Google Forms, PDF, Excel, or other formats. 
                      We'll convert it to a voice-enabled template.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Manual Form Builder */}
          {step === 3 && creationMethod === 'manual' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Build Your Form</h3>
                <button
                  onClick={addFormField}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </button>
              </div>

              {formFields.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No fields added yet</h4>
                  <p className="text-gray-600 mb-4">Start building your form by adding your first field</p>
                  <button
                    onClick={addFormField}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add First Field
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formFields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">Field {index + 1}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => moveField(field.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveField(field.id, 'down')}
                            disabled={index === formFields.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeFormField(field.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => updateFormField(field.id, { type: e.target.value as any })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          >
                            {FIELD_TYPES.map(type => (
                              <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateFormField(field.id, { label: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="Field label"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => updateFormField(field.id, { placeholder: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="Placeholder text"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center">
                        <input
                          type="checkbox"
                          id={`required-${field.id}`}
                          checked={field.required}
                          onChange={(e) => updateFormField(field.id, { required: e.target.checked })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`required-${field.id}`} className="ml-2 text-sm text-gray-700">
                          Required field
                        </label>
                      </div>

                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                          <textarea
                            value={field.options?.join('\n') || ''}
                            onChange={(e) => updateFormField(field.id, { 
                              options: e.target.value.split('\n').filter(opt => opt.trim()) 
                            })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            rows={3}
                            placeholder="Enter each option on a new line"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: File Upload */}
          {step === 3 && creationMethod === 'upload' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Your Form</h3>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    {uploadedFile ? uploadedFile.name : 'Choose a file to upload'}
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Supported formats: JSON, CSV, PDF, Excel (.xlsx, .xls)
                  </p>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".json,.csv,.pdf,.xlsx,.xls"
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-block"
                  >
                    {uploadedFile ? 'Change File' : 'Select File'}
                  </label>
                </div>

                {uploadedFile && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      <div>
                        <p className="text-green-800 font-medium">File uploaded successfully</p>
                        <p className="text-green-700 text-sm">
                          {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <div>
            {step > 1 && (
              <button 
                onClick={handleBack}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {step < 3 ? (
              <button 
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Creating...' : 'Create Template'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}