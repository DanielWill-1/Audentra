import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Mic, 
  Clock, 
  Shield, 
  CheckCircle, 
  ArrowRight, 
  Zap, 
  Brain,
  FileText,
  Stethoscope,
  HardHat,
  UserCheck,
  Play,
  Star
} from 'lucide-react';

function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4 mr-2" />
                10x Faster Form Completion
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Fill Complex Forms with
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Your Voice</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Revolutionary AI-powered voice technology that transforms hours of paperwork into minutes of natural conversation. 
                Trusted by field workers, healthcare professionals, and HR teams worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link 
                  to="/login"
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Try Voice Demo
                </Link>
                <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-colors">
                  Watch 2-Min Demo
                </button>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  No Setup Required
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  HIPAA Compliant
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Blockchain Verified
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Patient Intake Form</h3>
                  <div className="flex items-center text-green-600">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm font-medium">Voice Active</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">You said:</p>
                    <p className="text-gray-900">"I'm John Smith, born March 15th, 1985. I'm here for shoulder pain that started last week after playing tennis."</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Full Name</label>
                      <div className="border rounded p-2 bg-green-50 border-green-200">John Smith ✓</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Date of Birth</label>
                      <div className="border rounded p-2 bg-green-50 border-green-200">03/15/1985 ✓</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Chief Complaint</label>
                    <div className="border rounded p-2 bg-green-50 border-green-200">Shoulder pain - onset 1 week ago, sports-related ✓</div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">95%</div>
              <div className="text-gray-300">Time Saved</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-400 mb-2">99.7%</div>
              <div className="text-gray-300">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">50K+</div>
              <div className="text-gray-300">Forms Processed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-400 mb-2">24/7</div>
              <div className="text-gray-300">AI Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Professionals Choose VoiceForm Pro
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of form completion with AI-powered voice technology 
              that understands context, ensures accuracy, and maintains security.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
              <p className="text-gray-600 mb-6">
                Complete complex forms in under 2 minutes. What used to take 30 minutes 
                now happens in natural conversation speed.
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-8 rounded-2xl border border-emerald-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Incredibly Smart</h3>
              <p className="text-gray-600 mb-6">
                Advanced AI understands medical terminology, legal jargon, and technical language. 
                Learns from your industry-specific vocabulary.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-8 rounded-2xl border border-purple-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Bulletproof Security</h3>
              <p className="text-gray-600 mb-6">
                Enterprise-grade security with blockchain verification, end-to-end encryption, 
                and full compliance with healthcare and privacy regulations.
              </p>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link 
              to="/features" 
              className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Explore All Features
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Industries Preview */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Built for Your Industry
            </h2>
            <p className="text-xl text-gray-600">
              Specialized AI models trained for your specific professional needs
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <Stethoscope className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Healthcare</h3>
              <p className="text-gray-600 mb-6">
                Patient intake, medical histories, insurance forms, and clinical documentation. 
                Understands medical terminology and ICD codes.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <HardHat className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Field Work</h3>
              <p className="text-gray-600 mb-6">
                Inspection reports, safety checklists, incident reports, and equipment logs. 
                Works offline and syncs when connected.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                <UserCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Human Resources</h3>
              <p className="text-gray-600 mb-6">
                Employee onboarding, performance reviews, exit interviews, and compliance documentation. 
                Maintains confidentiality and accuracy.
              </p>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link 
              to="/industries" 
              className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Industries
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "VoiceForm Pro has revolutionized our patient intake process. What used to take 
                20 minutes now takes 3 minutes, and our patients love it."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  SM
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Dr. Sarah Martinez</div>
                  <div className="text-gray-600 text-sm">Chief Medical Officer, Metro Health</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "Our field inspectors can now complete safety reports while walking the site. 
                The accuracy is incredible and the blockchain verification gives us audit confidence."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  MJ
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Mike Johnson</div>
                  <div className="text-gray-600 text-sm">Safety Director, BuildCorp Industries</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "Employee onboarding is now a conversation, not a chore. New hires complete 
                all paperwork in their first 15 minutes, and they actually enjoy the process."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  LC
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Lisa Chen</div>
                  <div className="text-gray-600 text-sm">VP of HR, TechFlow Solutions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-gray-900 to-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Forms?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Join thousands of professionals who've already revolutionized their workflow. 
            Start your free trial today and experience the future of form completion.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link 
              to="/login"
              className="bg-blue-600 text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link 
              to="/contact"
              className="border-2 border-gray-400 text-gray-300 px-10 py-4 rounded-lg text-lg font-semibold hover:border-white hover:text-white transition-colors"
            >
              Schedule Demo
            </Link>
          </div>
          <p className="text-gray-400 text-sm">
            No credit card required • 14-day free trial • Setup in under 5 minutes
          </p>
        </div>
      </section>
    </div>
  );
}

export default Home;