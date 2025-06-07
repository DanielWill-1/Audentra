import React, { useState } from 'react';
import { 
  Book, 
  Code, 
  Terminal, 
  FileText, 
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Download,
  Search,
  Bookmark,
  GitBranch,
  Zap,
  Shield,
  Settings,
  Users,
  Database,
  Globe
} from 'lucide-react';

function Documentation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('getting-started');
  const [expandedSections, setExpandedSections] = useState(['getting-started', 'api']);

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Zap,
      items: [
        { id: 'quick-start', title: 'Quick Start Guide', type: 'guide' },
        { id: 'installation', title: 'Installation & Setup', type: 'guide' },
        { id: 'first-form', title: 'Creating Your First Form', type: 'tutorial' },
        { id: 'authentication', title: 'Authentication', type: 'guide' }
      ]
    },
    {
      id: 'api',
      title: 'API Reference',
      icon: Code,
      items: [
        { id: 'api-overview', title: 'API Overview', type: 'reference' },
        { id: 'authentication-api', title: 'Authentication', type: 'reference' },
        { id: 'forms-api', title: 'Forms API', type: 'reference' },
        { id: 'voice-api', title: 'Voice Processing API', type: 'reference' },
        { id: 'webhooks', title: 'Webhooks', type: 'reference' }
      ]
    },
    {
      id: 'voice-features',
      title: 'Voice Features',
      icon: FileText,
      items: [
        { id: 'voice-training', title: 'Voice Training & Accuracy', type: 'guide' },
        { id: 'custom-vocabulary', title: 'Custom Vocabulary', type: 'guide' },
        { id: 'voice-summaries', title: 'Voice Summaries', type: 'feature' },
        { id: 'multi-language', title: 'Multi-language Support', type: 'guide' }
      ]
    },
    {
      id: 'security',
      title: 'Security & Compliance',
      icon: Shield,
      items: [
        { id: 'security-overview', title: 'Security Overview', type: 'guide' },
        { id: 'hipaa-compliance', title: 'HIPAA Compliance', type: 'compliance' },
        { id: 'gdpr-compliance', title: 'GDPR Compliance', type: 'compliance' },
        { id: 'blockchain-verification', title: 'Blockchain Verification', type: 'feature' }
      ]
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: Globe,
      items: [
        { id: 'google-forms', title: 'Google Forms Integration', type: 'integration' },
        { id: 'salesforce', title: 'Salesforce Integration', type: 'integration' },
        { id: 'zapier', title: 'Zapier Integration', type: 'integration' },
        { id: 'custom-integrations', title: 'Custom Integrations', type: 'guide' }
      ]
    },
    {
      id: 'team-management',
      title: 'Team Management',
      icon: Users,
      items: [
        { id: 'user-roles', title: 'User Roles & Permissions', type: 'guide' },
        { id: 'team-settings', title: 'Team Settings', type: 'guide' },
        { id: 'billing-management', title: 'Billing & Subscriptions', type: 'guide' }
      ]
    }
  ];

  const codeExample = `// Initialize VoiceForm Pro SDK
import { VoiceForm } from '@voiceform/sdk';

const voiceForm = new VoiceForm({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Create a new form
const form = await voiceForm.forms.create({
  name: 'Patient Intake Form',
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
      voicePrompt: 'What is your full name?'
    },
    {
      name: 'dateOfBirth',
      type: 'date',
      required: true,
      voicePrompt: 'What is your date of birth?'
    }
  ]
});

// Start voice session
const session = await voiceForm.voice.startSession({
  formId: form.id,
  language: 'en-US'
});`;

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'guide': return 'bg-blue-100 text-blue-700';
      case 'tutorial': return 'bg-green-100 text-green-700';
      case 'reference': return 'bg-purple-100 text-purple-700';
      case 'feature': return 'bg-orange-100 text-orange-700';
      case 'compliance': return 'bg-red-100 text-red-700';
      case 'integration': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Developer
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Documentation</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Complete guides, API references, and resources to integrate VoiceForm Pro into your applications
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Quick Start
            </button>
            <button className="bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center">
              <Code className="w-5 h-5 mr-2" />
              API Reference
            </button>
            <button className="bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center">
              <Download className="w-5 h-5 mr-2" />
              SDK Download
            </button>
          </div>
        </div>
      </section>

      {/* Main Documentation */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentation</h3>
                
                <div className="space-y-2">
                  {sections.map(section => (
                    <div key={section.id}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <section.icon className="w-4 h-4 mr-3 text-gray-600" />
                          <span className="font-medium text-gray-900">{section.title}</span>
                        </div>
                        {expandedSections.includes(section.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      
                      {expandedSections.includes(section.id) && (
                        <div className="ml-7 mt-2 space-y-1">
                          {section.items.map(item => (
                            <button
                              key={item.id}
                              onClick={() => setSelectedSection(item.id)}
                              className={`w-full text-left p-2 rounded text-sm transition-colors ${
                                selectedSection === item.id
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{item.title}</span>
                                <span className={`text-xs px-2 py-1 rounded ${getTypeColor(item.type)}`}>
                                  {item.type}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full flex items-center p-2 text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors">
                      <Download className="w-4 h-4 mr-2" />
                      Download SDK
                    </button>
                    <button className="w-full flex items-center p-2 text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors">
                      <GitBranch className="w-4 h-4 mr-2" />
                      GitHub Repository
                    </button>
                    <button className="w-full flex items-center p-2 text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      API Playground
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-white rounded-2xl border border-gray-200 p-8">
                {/* Breadcrumb */}
                <div className="flex items-center text-sm text-gray-600 mb-6">
                  <span>Documentation</span>
                  <ChevronRight className="w-4 h-4 mx-2" />
                  <span>Getting Started</span>
                  <ChevronRight className="w-4 h-4 mx-2" />
                  <span className="text-gray-900">Quick Start Guide</span>
                </div>

                {/* Content Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Start Guide</h1>
                    <p className="text-lg text-gray-600">Get up and running with VoiceForm Pro in under 10 minutes</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      <Bookmark className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="prose prose-lg max-w-none">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Installation</h2>
                  <p className="text-gray-600 mb-6">
                    Install the VoiceForm Pro SDK using your preferred package manager:
                  </p>

                  {/* Code Block */}
                  <div className="bg-gray-900 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Terminal</span>
                      </div>
                      <button className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </button>
                    </div>
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{`npm install @voiceform/sdk
# or
yarn add @voiceform/sdk
# or
pnpm add @voiceform/sdk`}</code>
                    </pre>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Usage</h2>
                  <p className="text-gray-600 mb-6">
                    Here's a simple example to get you started with creating and processing voice forms:
                  </p>

                  {/* Code Example */}
                  <div className="bg-gray-900 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Code className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">JavaScript</span>
                      </div>
                      <button className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </button>
                    </div>
                    <pre className="text-sm overflow-x-auto">
                      <code className="text-gray-300">{codeExample}</code>
                    </pre>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Next Steps</h2>
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">Authentication</h3>
                      <p className="text-blue-700 text-sm mb-4">
                        Learn how to securely authenticate your application with VoiceForm Pro.
                      </p>
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center">
                        Read Guide
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-200">
                      <h3 className="text-lg font-semibold text-emerald-900 mb-2">API Reference</h3>
                      <p className="text-emerald-700 text-sm mb-4">
                        Explore the complete API documentation with examples and parameters.
                      </p>
                      <button className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center">
                        View API Docs
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-8 border-t border-gray-200">
                    <button className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                      <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                      Previous: Overview
                    </button>
                    <button className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                      Next: Installation & Setup
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Documentation;