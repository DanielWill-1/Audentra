import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Mail, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Users,
  Crown,
  Edit,
  Eye,
  Copy,
  Globe
} from 'lucide-react';
import { Template, shareTemplate, generateShareLink } from '../../lib/templates';

interface ShareTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template;
}

interface ShareData {
  email: string;
  role: 'viewer' | 'editor' | 'admin';
}

const ROLES = [
  { 
    id: 'viewer', 
    name: 'Viewer', 
    icon: Eye,
    description: 'Can view and use the template',
    permissions: ['View template', 'Use template', 'Leave reviews']
  },
  { 
    id: 'editor', 
    name: 'Editor', 
    icon: Edit,
    description: 'Can view, use, and edit the template',
    permissions: ['View template', 'Use template', 'Edit template', 'Leave reviews', 'Share with viewers']
  },
  { 
    id: 'admin', 
    name: 'Admin', 
    icon: Crown,
    description: 'Full access to the template',
    permissions: ['View template', 'Use template', 'Edit template', 'Delete template', 'Manage sharing', 'Leave reviews']
  }
];

export default function ShareTemplateModal({ isOpen, onClose, template }: ShareTemplateModalProps) {
  const [shares, setShares] = useState<ShareData[]>([{ email: '', role: 'viewer' }]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const addShare = () => {
    setShares([...shares, { email: '', role: 'viewer' }]);
  };

  const removeShare = (index: number) => {
    if (shares.length > 1) {
      setShares(shares.filter((_, i) => i !== index));
    }
  };

  const updateShare = (index: number, field: keyof ShareData, value: string) => {
    const updated = [...shares];
    updated[index] = { ...updated[index], [field]: value };
    setShares(updated);
  };

  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors: string[] = [];
    
    shares.forEach((share, index) => {
      if (!share.email.trim()) {
        errors.push(`Email ${index + 1} is required`);
      } else if (!emailRegex.test(share.email)) {
        errors.push(`Email ${index + 1} is invalid`);
      }
    });

    // Check for duplicate emails
    const emails = shares.map(share => share.email.toLowerCase());
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicates.length > 0) {
      errors.push('Duplicate email addresses found');
    }

    return errors;
  };

  const handleShare = async () => {
    setError(null);
    setSuccess(null);

    const validationErrors = validateEmails();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);

    try {
      const { error } = await shareTemplate({
        template_id: template.id,
        user_emails: shares.map(s => s.email),
        role: shares[0].role, // For simplicity, using first role
        message
      });

      if (error) throw error;
      
      setSuccess(`Template shared with ${shares.length} user${shares.length > 1 ? 's' : ''}!`);
      
      // Reset form after success
      setTimeout(() => {
        setShares([{ email: '', role: 'viewer' }]);
        setMessage('');
        setSuccess(null);
        onClose();
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to share template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const link = generateShareLink(template.id);
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleClose = () => {
    setShares([{ email: '', role: 'viewer' }]);
    setMessage('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                <Share2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Share Template</h2>
                <p className="text-gray-600">Share "{template.name}" with your team</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-green-800 text-sm">{success}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Share Link */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Share Link</h3>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-white rounded border border-blue-200 px-3 py-2">
                <code className="text-sm text-blue-800 break-all">
                  {generateShareLink(template.id)}
                </code>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
              >
                {linkCopied ? (
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
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Anyone with this link can view the template
            </p>
          </div>

          {/* Current Shares */}
          {template.shared_with && template.shared_with.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Currently Shared With</h3>
              <div className="space-y-2">
                {template.shared_with.map((share, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{share.user_email}</p>
                        <p className="text-xs text-gray-500">
                          {share.role.charAt(0).toUpperCase() + share.role.slice(1)} • 
                          Shared {new Date(share.shared_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share Forms */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Share with New Users</h3>
            
            {shares.map((share, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    User {index + 1}
                  </h4>
                  {shares.length > 1 && (
                    <button
                      onClick={() => removeShare(index)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="email"
                        value={share.email}
                        onChange={(e) => updateShare(index, 'email', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="colleague@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Level *
                    </label>
                    <select
                      value={share.role}
                      onChange={(e) => updateShare(index, 'role', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {ROLES.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Role Permissions Preview */}
                <div className="p-3 bg-white rounded border border-gray-200">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    {ROLES.find(r => r.id === share.role)?.name} Permissions:
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.find(r => r.id === share.role)?.permissions.map((permission, i) => (
                      <span key={i} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Share */}
          <button
            onClick={addShare}
            className="w-full mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another User
          </button>

          {/* Personal Message */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Add a personal message to your sharing invitation..."
            />
          </div>

          {/* Role Information */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Access Levels:</h4>
            <div className="space-y-2 text-sm text-blue-800">
              {ROLES.map(role => (
                <div key={role.id} className="flex items-center">
                  <role.icon className="w-4 h-4 mr-2" />
                  <strong>{role.name}:</strong>
                  <span className="ml-1">{role.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Sharing...' : `Share Template`}
          </button>
        </div>
      </div>
    </div>
  );
}