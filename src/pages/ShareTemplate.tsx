import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Share2,
  Copy,
  Mail,
  MessageSquare,
  Download,
  Eye,
  Lock,
  Globe,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  QrCode,
  Settings,
  Trash2,
  Edit,
  X,
  Loader2,
  FileText,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap,
  Building2
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

interface ShareSettings {
  isPublic: boolean;
  allowCopy: boolean;
  requireAuth: boolean;
  expiresAt: string | null;
  password: string;
  allowedDomains: string[];
  maxUses: number | null;
}

function ShareTemplate() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    isPublic: false,
    allowCopy: true,
    requireAuth: false,
    expiresAt: null,
    password: '',
    allowedDomains: [],
    maxUses: null
  });
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState('share');

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  useEffect(() => {
    if (template) {
      generateShareUrl();
    }
  }, [template, shareSettings]);

  const loadTemplate = async () => {
    if (!templateId) return;
    
    try {
      setLoading(true);
      const { data, error } = await getTemplateById(templateId);
      if (error) throw error;
      setTemplate(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const generateShareUrl = () => {
    if (!template) return;
    
    const baseUrl = `${window.location.origin}/template/shared/${template.id}`;
    const params = new URLSearchParams();
    
    if (shareSettings.password) {
      params.append('protected', 'true');
    }
    if (shareSettings.requireAuth) {
      params.append('auth', 'required');
    }
    
    const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    setShareUrl(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareViaEmail = () => {
    const subject = `Check out this form template: ${template?.name}`;
    const body = `I wanted to share this form template with you:\n\n${template?.name}\n${template?.description}\n\nAccess it here: ${shareUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const downloadQR = () => {
    // In a real implementation, you'd generate a QR code
    console.log('Generate QR code for:', shareUrl);
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || FileText;
    return IconComponent;
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
                  <p className="text-gray-600">Share and manage template access</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to={`/template/review/${template.id}`}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
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
                    onClick={() => setActiveTab('share')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'share'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Share2 className="w-4 h-4 mr-2 inline" />
                    Share Settings
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'analytics'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Users className="w-4 h-4 mr-2 inline" />
                    Analytics
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'share' && (
                  <div className="space-y-8">
                    {/* Share URL */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Link</h3>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <input
                              type="text"
                              value={shareUrl}
                              readOnly
                              className="w-full bg-transparent text-gray-700 text-sm font-mono"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={copyToClipboard}
                              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              {copied ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 mr-1" />
                                  Copy
                                </>
                              )}
                            </button>
                            <button
                              onClick={shareViaEmail}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Share via Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowQR(!showQR)}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Access</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <Globe className="w-5 h-5 text-blue-600 mr-3" />
                            <div>
                              <h4 className="font-medium text-gray-900">Public Access</h4>
                              <p className="text-sm text-gray-600">Anyone with the link can view this template</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShareSettings(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              shareSettings.isPublic ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                shareSettings.isPublic ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <Copy className="w-5 h-5 text-emerald-600 mr-3" />
                            <div>
                              <h4 className="font-medium text-gray-900">Allow Copying</h4>
                              <p className="text-sm text-gray-600">Users can duplicate this template</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShareSettings(prev => ({ ...prev, allowCopy: !prev.allowCopy }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              shareSettings.allowCopy ? 'bg-emerald-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                shareSettings.allowCopy ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <Lock className="w-5 h-5 text-purple-600 mr-3" />
                            <div>
                              <h4 className="font-medium text-gray-900">Require Authentication</h4>
                              <p className="text-sm text-gray-600">Users must sign in to access</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShareSettings(prev => ({ ...prev, requireAuth: !prev.requireAuth }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              shareSettings.requireAuth ? 'bg-purple-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                shareSettings.requireAuth ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password Protection
                          </label>
                          <input
                            type="password"
                            value={shareSettings.password}
                            onChange={(e) => setShareSettings(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Optional password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiration Date
                          </label>
                          <input
                            type="datetime-local"
                            value={shareSettings.expiresAt || ''}
                            onChange={(e) => setShareSettings(prev => ({ ...prev, expiresAt: e.target.value || null }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Uses
                          </label>
                          <input
                            type="number"
                            value={shareSettings.maxUses || ''}
                            onChange={(e) => setShareSettings(prev => ({ ...prev, maxUses: e.target.value ? parseInt(e.target.value) : null }))}
                            placeholder="Unlimited"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="space-y-8">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Total Views</p>
                            <p className="text-2xl font-bold text-blue-900">1,247</p>
                          </div>
                          <Eye className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-6 border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-emerald-600 font-medium">Copies Made</p>
                            <p className="text-2xl font-bold text-emerald-900">89</p>
                          </div>
                          <Copy className="w-8 h-8 text-emerald-600" />
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-purple-600 font-medium">Unique Users</p>
                            <p className="text-2xl font-bold text-purple-900">456</p>
                          </div>
                          <Users className="w-8 h-8 text-purple-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Recent Activity</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            <span className="text-sm text-gray-700">Template viewed by anonymous user</span>
                          </div>
                          <span className="text-xs text-gray-500">2 minutes ago</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                            <span className="text-sm text-gray-700">Template copied by john@company.com</span>
                          </div>
                          <span className="text-xs text-gray-500">1 hour ago</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                            <span className="text-sm text-gray-700">Template shared via email</span>
                          </div>
                          <span className="text-xs text-gray-500">3 hours ago</span>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-900 capitalize">{template.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fields</p>
                  <p className="font-medium text-gray-900">{template.form_data?.fields?.length || 0} fields</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium text-gray-900">
                    {new Date(template.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium text-gray-900">
                    {new Date(template.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Visibility</p>
                  <div className="flex items-center">
                    {template.visibility === 'visible' ? (
                      <>
                        <Globe className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-blue-700">Visible</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Hidden</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to={`/template/review/${template.id}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Template
                </Link>
                <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Template
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center">
              <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <QrCode className="w-24 h-24 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code to access the template
              </p>
              <button
                onClick={downloadQR}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareTemplate;