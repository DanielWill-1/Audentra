import React from 'react';
import { 
  Shield, 
  Lock, 
  Globe, 
  FileText, 
  CheckCircle, 
  Eye, 
  Server, 
  Key,
  AlertTriangle,
  Award
} from 'lucide-react';

function Security() {
  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Enterprise-Grade
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Security</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your data security is our top priority. VoiceForm Pro employs military-grade encryption, 
            blockchain verification, and comprehensive compliance frameworks.
          </p>
        </div>
      </section>

      {/* Blockchain Security */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
              <div className="flex items-center mb-6">
                <Lock className="w-8 h-8 text-blue-400 mr-3" />
                <h3 className="text-2xl font-bold">Blockchain Verification</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Form Hash</span>
                    <span className="text-xs text-green-400">✓ Verified</span>
                  </div>
                  <code className="text-xs text-blue-300 font-mono break-all">
                    0x7f9b2c1a8e6d4f3a2b9c8e7d6f5a4b3c2d1e9f8a7b6c5d4e3f2a1b9c8d7e6f5a
                  </code>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Timestamp</span>
                    <span className="text-xs text-green-400">✓ Immutable</span>
                  </div>
                  <span className="text-sm text-white">2024-01-15 14:32:18 UTC</span>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Block Height</span>
                    <span className="text-xs text-green-400">✓ Confirmed</span>
                  </div>
                  <span className="text-sm text-white">#1,247,863</span>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Unbreakable Security with Blockchain
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Every form submission is cryptographically secured and recorded on the blockchain, 
                creating an immutable audit trail that ensures data integrity and compliance.
              </p>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Tamper-Proof Records</h4>
                    <p className="text-gray-600">Each form creates a unique cryptographic hash that's impossible to alter without detection.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Globe className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Distributed Verification</h4>
                    <p className="text-gray-600">Multiple nodes verify each transaction, ensuring no single point of failure.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Compliance Audit Trail</h4>
                    <p className="text-gray-600">Instant proof of data integrity for regulatory audits and legal requirements.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">End-to-End Encryption</h3>
              <p className="text-gray-600 text-sm mb-4">
                AES-256 encryption protects data in transit and at rest. Your voice data is encrypted before leaving your device.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Military-grade AES-256 encryption</li>
                <li>• Perfect forward secrecy</li>
                <li>• Zero-knowledge architecture</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Zero Data Retention</h3>
              <p className="text-gray-600 text-sm mb-4">
                Voice data is processed in real-time and immediately deleted. We never store your audio recordings.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Real-time processing only</li>
                <li>• Automatic data purging</li>
                <li>• No persistent storage</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Server className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Infrastructure</h3>
              <p className="text-gray-600 text-sm mb-4">
                Hosted on SOC 2 certified cloud infrastructure with 99.99% uptime and global redundancy.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• SOC 2 Type II certified</li>
                <li>• Multi-region redundancy</li>
                <li>• 24/7 security monitoring</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Threat Detection</h3>
              <p className="text-gray-600 text-sm mb-4">
                AI-powered threat detection monitors for suspicious activity and automatically responds to security incidents.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Real-time threat monitoring</li>
                <li>• Automated incident response</li>
                <li>• Behavioral anomaly detection</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance Certifications</h3>
              <p className="text-gray-600 text-sm mb-4">
                Certified compliant with major healthcare, financial, and privacy regulations worldwide.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• HIPAA/HITECH compliant</li>
                <li>• GDPR/CCPA compliant</li>
                <li>• ISO 27001 certified</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Global Privacy</h3>
              <p className="text-gray-600 text-sm mb-4">
                Data residency controls ensure your data stays within your jurisdiction's legal boundaries.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Regional data residency</li>
                <li>• Cross-border compliance</li>
                <li>• Local privacy law adherence</li>
              </ul>
            </div>
          </div>

          {/* Compliance Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Comprehensive Compliance</h2>
              <p className="text-xl text-blue-100">
                VoiceForm Pro meets the strictest regulatory requirements across industries
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">HIPAA/HITECH</h3>
                <p className="text-blue-100 text-sm">
                  Full compliance with healthcare privacy and security regulations
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">GDPR/CCPA</h3>
                <p className="text-blue-100 text-sm">
                  European and California privacy law compliance with data rights
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">SOC 2 Type II</h3>
                <p className="text-blue-100 text-sm">
                  Audited security controls for service organizations
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">ISO 27001</h3>
                <p className="text-blue-100 text-sm">
                  International standard for information security management
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Security;