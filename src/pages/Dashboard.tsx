import React, { useState } from 'react';
import { 
  Mic, 
  Plus, 
  Clock, 
  Users, 
  FileText, 
  Shield, 
  BarChart3, 
  ArrowRight,
  Play,
  Star,
  CheckCircle,
  Brain,
  Zap,
  ExternalLink,
  Share2,
  Eye,
  Settings,
  Bell,
  Calendar,
  AlertTriangle,
  Download,
  Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderOverview = () => (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Start a New Form */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Start a New Form</h2>
            <Link to="/templates" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Templates
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <Play className="w-8 h-8 text-white/80 hover:text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Quick Voice Form</h3>
              <p className="text-blue-100 text-sm mb-4">
                Start speaking immediately. Our AI will intelligently structure your input into the right format.
              </p>
              <div className="flex items-center text-sm text-blue-200">
                <Zap className="w-4 h-4 mr-1" />
                Average completion: 2 minutes
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Template</h3>
              <p className="text-gray-600 text-sm mb-4">
                Select from industry-specific templates optimized for your workflow and compliance needs.
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <Users className="w-4 h-4 mr-1" />
                50+ professional templates
              </div>
            </div>
          </div>

          {/* External Forms Integration */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                  <ExternalLink className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">External Forms Integration</h3>
                  <p className="text-gray-600 text-sm">Import and voice-enable your existing Google Forms, Microsoft Forms, and other platforms</p>
                </div>
              </div>
              <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                Connect Forms
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="flex items-center p-3 bg-white rounded-lg border">
                <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">G</span>
                </div>
                <span className="text-sm text-gray-700">Google Forms</span>
              </div>
              <div className="flex items-center p-3 bg-white rounded-lg border">
                <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">M</span>
                </div>
                <span className="text-sm text-gray-700">Microsoft Forms</span>
              </div>
              <div className="flex items-center p-3 bg-white rounded-lg border">
                <div className="w-8 h-8 bg-purple-100 rounded mr-3 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">T</span>
                </div>
                <span className="text-sm text-gray-700">Typeform</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Activity
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Patient Intake - John Smith</h4>
                    <p className="text-sm text-gray-600">Completed 2 hours ago • 1:34 duration</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Verified</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">View</button>
                  <button className="text-gray-600 hover:text-gray-700">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Safety Inspection Report</h4>
                    <p className="text-sm text-gray-600">In progress • Started 30 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Draft</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">Continue</button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Employee Onboarding - Maria Garcia</h4>
                    <p className="text-sm text-gray-600">Completed yesterday • 2:15 duration</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Archived</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">View</button>
                  <button className="text-gray-600 hover:text-gray-700">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <div className="space-y-8">
        {/* Team Templates */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Team Templates</h2>
            <button className="text-blue-600 hover:text-blue-700">
              <Eye className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Patient Intake</h4>
                    <p className="text-xs text-gray-500">Healthcare • Pending Review</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500">4.9</span>
                  <button className="text-orange-600 hover:text-orange-700 ml-2">
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Safety Inspection</h4>
                    <p className="text-xs text-gray-500">Field Work • Approved</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500">4.8</span>
                  <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Employee Review</h4>
                    <p className="text-xs text-gray-500">HR • Shared with team</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500">4.7</span>
                  <Share2 className="w-4 h-4 text-blue-500 ml-2" />
                </div>
              </div>
            </div>

            <Link to="/templates" className="w-full mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium py-2 block text-center">
              Browse All Templates
            </Link>
          </div>
        </section>

        {/* Quick Stats */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Stats</h2>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">47</div>
                <div className="text-sm text-gray-600">Forms Completed</div>
                <div className="text-xs text-green-600">+12 this week</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900">2:14</div>
                  <div className="text-xs text-gray-600">Avg. Time</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">99.2%</div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>
              </div>

              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors">
                <BarChart3 className="w-4 h-4 inline mr-2" />
                View Detailed Analytics
              </button>
            </div>
          </div>
        </section>

        {/* Alerts & Reminders */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Alerts & Reminders</h2>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex items-start p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <Bell className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">Template Review Due</h4>
                  <p className="text-xs text-gray-600">Patient Intake template needs supervisor approval</p>
                  <p className="text-xs text-yellow-600 mt-1">Due in 2 hours</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Calendar className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">Scheduled Form</h4>
                  <p className="text-xs text-gray-600">Weekly safety inspection reminder</p>
                  <p className="text-xs text-blue-600 mt-1">Tomorrow at 9:00 AM</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">Compliance Update</h4>
                  <p className="text-xs text-gray-600">All forms are HIPAA compliant</p>
                  <p className="text-xs text-green-600 mt-1">Last checked: 1 hour ago</p>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium py-2">
              Manage Alerts & Schedules
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, Sarah</h1>
              <p className="text-gray-600">Ready to streamline your workflow with voice-powered forms?</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <Shield className="w-4 h-4 mr-1" />
                Blockchain Trust Active
              </div>
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                <Brain className="w-4 h-4 mr-1" />
                AI Assistant Ready
              </div>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('collaboration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'collaboration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Team Collaboration
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings & Customization
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        
        {activeTab === 'collaboration' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Team Collaboration</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Shared Templates</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Patient Intake v2.1</h4>
                        <p className="text-sm text-gray-600">Shared by Dr. Johnson • 15 uses</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-700">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-700">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Safety Checklist Pro</h4>
                        <p className="text-sm text-gray-600">Shared by Mike Chen • 8 uses</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-700">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-orange-600 hover:text-orange-700">
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                        MJ
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">Mike Johnson completed Safety Inspection</p>
                        <p className="text-xs text-gray-600">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                        LC
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">Lisa Chen shared new HR template</p>
                        <p className="text-xs text-gray-600">4 hours ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings & Customization</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>English (US)</option>
                        <option>English (UK)</option>
                        <option>Spanish</option>
                        <option>French</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Voice Sensitivity</label>
                      <input type="range" className="w-full" min="1" max="10" defaultValue="7" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Form completion alerts</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Template review reminders</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Team collaboration updates</span>
                      <input type="checkbox" className="rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;