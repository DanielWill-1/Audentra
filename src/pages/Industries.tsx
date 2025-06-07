import React from 'react';
import { 
  Stethoscope, 
  HardHat, 
  UserCheck, 
  Scale, 
  GraduationCap, 
  Building2,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

function Industries() {
  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Specialized for
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Your Industry</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            VoiceForm Pro's AI is trained on industry-specific terminology and workflows, 
            ensuring perfect understanding of your professional language.
          </p>
        </div>
      </section>

      {/* Main Industries */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12 mb-20">
            <div className="bg-white p-8 rounded-2xl shadow-lg border hover:shadow-xl transition-shadow">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mb-8">
                <Stethoscope className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">Healthcare</h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                Transform patient care with voice-powered intake forms, medical histories, 
                and clinical documentation. Our AI understands medical terminology, ICD codes, 
                and healthcare workflows.
              </p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Key Features:</h4>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Patient intake forms in 60 seconds
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Medical history capture with ICD-10 coding
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Insurance verification and pre-authorization
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      HIPAA-compliant documentation
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Common Use Cases:</h4>
                  <ul className="text-gray-600 space-y-1 text-sm">
                    <li>• Emergency room triage</li>
                    <li>• Specialist consultations</li>
                    <li>• Discharge summaries</li>
                    <li>• Medication reconciliation</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 text-sm italic">
                  "Reduced patient wait times by 75% and improved data accuracy to 99.8%"
                </p>
                <p className="text-blue-600 text-xs mt-1">- Metro General Hospital</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border hover:shadow-xl transition-shadow">
              <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mb-8">
                <HardHat className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">Field Work</h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                Streamline field operations with voice-powered inspection reports, safety checklists, 
                and incident documentation. Works offline and syncs when connected.
              </p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Key Features:</h4>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Safety inspection reports while walking
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Equipment maintenance logs with photos
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Incident documentation with GPS location
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Offline capability with auto-sync
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Common Use Cases:</h4>
                  <ul className="text-gray-600 space-y-1 text-sm">
                    <li>• Construction site inspections</li>
                    <li>• Equipment maintenance rounds</li>
                    <li>• Safety incident reports</li>
                    <li>• Quality control checklists</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-orange-800 text-sm italic">
                  "Inspection efficiency increased 300% with hands-free documentation"
                </p>
                <p className="text-orange-600 text-xs mt-1">- BuildCorp Industries</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border hover:shadow-xl transition-shadow">
              <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mb-8">
                <UserCheck className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">Human Resources</h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                Revolutionize HR processes with conversational onboarding, performance reviews, 
                and compliance documentation. Maintains confidentiality and accuracy.
              </p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Key Features:</h4>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Employee onboarding in 15 minutes
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Performance evaluations via conversation
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Benefits enrollment and changes
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      Exit interviews with sentiment analysis
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Common Use Cases:</h4>
                  <ul className="text-gray-600 space-y-1 text-sm">
                    <li>• New hire paperwork</li>
                    <li>• Annual performance reviews</li>
                    <li>• Disciplinary documentation</li>
                    <li>• Training completion records</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-emerald-800 text-sm italic">
                  "New hire satisfaction increased 85% with conversational onboarding"
                </p>
                <p className="text-emerald-600 text-xs mt-1">- TechFlow Solutions</p>
              </div>
            </div>
          </div>

          {/* Additional Industries */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Scale className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Legal Services</h3>
              <p className="text-gray-600 mb-4">
                Client intake, case documentation, and legal form completion with 
                understanding of legal terminology and procedures.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Client consultation notes
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Legal document preparation
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Case status updates
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <GraduationCap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Education</h3>
              <p className="text-gray-600 mb-4">
                Student enrollment, academic assessments, and administrative documentation 
                with educational terminology understanding.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Student registration
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Academic evaluations
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Parent-teacher conferences
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Real Estate</h3>
              <p className="text-gray-600 mb-4">
                Property listings, client consultations, and transaction documentation 
                with real estate industry knowledge.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Property assessments
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Client preferences
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Market analysis reports
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Industry?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who've revolutionized their workflow with VoiceForm Pro.
          </p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center">
            Start Your Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </section>
    </div>
  );
}

export default Industries;