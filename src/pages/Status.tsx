import React from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Activity,
  Server,
  Globe,
  Shield,
  Zap,
  Database,
  ArrowRight
} from 'lucide-react';

function Status() {
  const services = [
    {
      name: 'Voice Processing API',
      status: 'operational',
      uptime: '99.98%',
      responseTime: '145ms',
      description: 'Core voice-to-text processing service'
    },
    {
      name: 'Form Builder',
      status: 'operational',
      uptime: '99.95%',
      responseTime: '89ms',
      description: 'Template creation and management'
    },
    {
      name: 'Authentication Service',
      status: 'operational',
      uptime: '99.99%',
      responseTime: '67ms',
      description: 'User login and security'
    },
    {
      name: 'Blockchain Verification',
      status: 'operational',
      uptime: '99.97%',
      responseTime: '234ms',
      description: 'Data integrity and verification'
    },
    {
      name: 'Data Storage',
      status: 'maintenance',
      uptime: '99.94%',
      responseTime: '156ms',
      description: 'Form data and user information storage'
    },
    {
      name: 'Analytics Dashboard',
      status: 'operational',
      uptime: '99.96%',
      responseTime: '112ms',
      description: 'Usage metrics and reporting'
    }
  ];

  const incidents = [
    {
      id: 1,
      title: 'Scheduled Maintenance - Data Storage Optimization',
      status: 'ongoing',
      severity: 'low',
      startTime: '2024-01-15 02:00 UTC',
      description: 'We are performing routine maintenance on our data storage systems to improve performance.',
      updates: [
        {
          time: '2024-01-15 02:00 UTC',
          message: 'Maintenance window started. Some users may experience slower response times.'
        },
        {
          time: '2024-01-15 01:45 UTC',
          message: 'Maintenance scheduled to begin at 02:00 UTC.'
        }
      ]
    },
    {
      id: 2,
      title: 'Voice Processing Latency Issues',
      status: 'resolved',
      severity: 'medium',
      startTime: '2024-01-14 14:30 UTC',
      endTime: '2024-01-14 15:45 UTC',
      description: 'Some users experienced increased latency in voice processing.',
      updates: [
        {
          time: '2024-01-14 15:45 UTC',
          message: 'Issue resolved. All services operating normally.'
        },
        {
          time: '2024-01-14 15:20 UTC',
          message: 'Implementing fix. Latency improving.'
        },
        {
          time: '2024-01-14 14:30 UTC',
          message: 'Investigating reports of increased voice processing latency.'
        }
      ]
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'degraded': return 'text-orange-600 bg-orange-100';
      case 'outage': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational': return CheckCircle;
      case 'maintenance': return Clock;
      case 'degraded': return AlertTriangle;
      case 'outage': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            System
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Status</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Real-time status and performance metrics for all VoiceForm Pro services
          </p>
          <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4 mr-2" />
            All Systems Operational
          </div>
        </div>
      </section>

      {/* Overall Status */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">99.98%</div>
              <div className="text-sm text-gray-600">Overall Uptime</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">134ms</div>
              <div className="text-sm text-gray-600">Avg Response Time</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Server className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">6/6</div>
              <div className="text-sm text-gray-600">Services Online</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">5</div>
              <div className="text-sm text-gray-600">Global Regions</div>
            </div>
          </div>

          {/* Service Status */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Service Status</h2>
              <p className="text-gray-600 mt-1">Current operational status of all VoiceForm Pro services</p>
            </div>
            <div className="divide-y divide-gray-200">
              {services.map((service, index) => {
                const StatusIcon = getStatusIcon(service.status);
                return (
                  <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <StatusIcon className="w-5 h-5 text-green-600 mr-4" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                          <p className="text-sm text-gray-600">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{service.uptime}</div>
                          <div className="text-gray-600">Uptime</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{service.responseTime}</div>
                          <div className="text-gray-600">Response</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Incidents */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Recent Incidents</h2>
            <p className="text-gray-600">Latest updates on service incidents and maintenance</p>
          </div>

          <div className="space-y-6">
            {incidents.map((incident) => (
              <div key={incident.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{incident.title}</h3>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                        {incident.severity.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        incident.status === 'resolved' ? 'text-green-600 bg-green-100' : 
                        incident.status === 'ongoing' ? 'text-yellow-600 bg-yellow-100' : 
                        'text-gray-600 bg-gray-100'
                      }`}>
                        {incident.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{incident.description}</p>
                  <div className="text-sm text-gray-500">
                    Started: {incident.startTime}
                    {incident.endTime && ` • Resolved: ${incident.endTime}`}
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Updates</h4>
                  <div className="space-y-3">
                    {incident.updates.map((update, index) => (
                      <div key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-4"></div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">{update.time}</div>
                          <div className="text-gray-700">{update.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe to Updates */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Stay Updated</h2>
          <p className="text-xl text-gray-600 mb-8">
            Get notified about service updates and maintenance windows
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
              Subscribe
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Status;