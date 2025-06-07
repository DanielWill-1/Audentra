import React from 'react';
import { 
  Clock, 
  Brain, 
  Shield, 
  CheckCircle, 
  Mic, 
  FileText, 
  Zap, 
  Globe, 
  Users, 
  BarChart3,
  Smartphone,
  Cloud
} from 'lucide-react';

function Features() {
  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Powerful Features for
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Professional Forms</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover how VoiceForm Pro's advanced AI technology transforms complex form completion 
            into natural, efficient conversations.
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Lightning Fast Processing</h3>
              <p className="text-gray-600 mb-6">
                Complete complex forms in under 2 minutes. Our AI processes speech in real-time, 
                instantly mapping your words to the correct form fields.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Real-time speech processing</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Smart field mapping</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Context understanding</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Instant validation</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-8 rounded-2xl border border-emerald-100">
              <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Advanced AI Intelligence</h3>
              <p className="text-gray-600 mb-6">
                Industry-specific AI models understand medical terminology, legal jargon, and technical language. 
                Continuously learns from your vocabulary.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Industry-specific training</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Multi-language support</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Accent adaptation</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Continuous learning</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-8 rounded-2xl border border-purple-100">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Enterprise Security</h3>
              <p className="text-gray-600 mb-6">
                Military-grade encryption, blockchain verification, and full compliance with 
                healthcare and privacy regulations worldwide.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />End-to-end encryption</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Blockchain verification</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />HIPAA/GDPR compliant</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Zero data retention</li>
              </ul>
            </div>
          </div>

          {/* Voice Summaries Feature */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium mb-6">
                  <FileText className="w-4 h-4 mr-2" />
                  New Feature
                </div>
                <h2 className="text-4xl font-bold mb-6">
                  AI-Generated Voice Summaries
                </h2>
                <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                  Get instant audio summaries of completed forms. Perfect for review, 
                  record-keeping, and sharing with team members.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-400 mr-4" />
                    <span className="text-lg">Instant audio playback of form data</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-400 mr-4" />
                    <span className="text-lg">Natural language summaries</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-400 mr-4" />
                    <span className="text-lg">Shareable audio files</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-400 mr-4" />
                    <span className="text-lg">Multiple voice options</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="bg-white rounded-xl p-6 text-gray-900">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Form Summary</h4>
                    <div className="flex items-center text-blue-600">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                      <span className="text-sm">Playing</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 italic">
                      "Summary for John Smith's patient intake: 32-year-old male presenting with 
                      shoulder pain onset one week ago after tennis. No previous injuries, currently 
                      taking ibuprofen. Appointment scheduled for Thursday at 2 PM with Dr. Johnson."
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Mic className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">2:34 / 3:12</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Download Audio
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mobile Optimized</h3>
              <p className="text-gray-600 text-sm">
                Works seamlessly on any device. Perfect for field workers and mobile professionals.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Cloud className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Offline Capable</h3>
              <p className="text-gray-600 text-sm">
                Continue working without internet. Data syncs automatically when reconnected.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Language</h3>
              <p className="text-gray-600 text-sm">
                Supports 50+ languages with native accent recognition and cultural context.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-gray-600 text-sm">
                Share forms, assign tasks, and collaborate with team members in real-time.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
              <p className="text-gray-600 text-sm">
                Track completion times, accuracy rates, and team performance metrics.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">API Integration</h3>
              <p className="text-gray-600 text-sm">
                Seamlessly integrate with your existing systems and workflows via REST API.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Features;