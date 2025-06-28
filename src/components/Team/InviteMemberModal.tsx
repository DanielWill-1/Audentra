import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Mail, 
  UserPlus, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InviteData {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  message?: string;
}

const ROLES = [
  { 
    id: 'admin', 
    name: 'Admin', 
    description: 'Full access to all features and settings',
    permissions: ['Create templates', 'Edit templates', 'Delete templates', 'Manage team', 'View analytics']
  },
  { 
    id: 'editor', 
    name: 'Editor', 
    description: 'Can create and edit templates',
    permissions: ['Create templates', 'Edit templates', 'View analytics']
  },
  { 
    id: 'viewer', 
    name: 'Viewer', 
    description: 'Read-only access to templates',
    permissions: ['View templates', 'Use templates']
  }
];

export default function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const [invites, setInvites] = useState<InviteData[]>([
    { email: '', role: 'editor', message: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invitesContainerRef = useRef<HTMLDivElement>(null);

  // Add scroll wheel event handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (invitesContainerRef.current) {
        invitesContainerRef.current.scrollTop += e.deltaY;
      }
    };

    const container = invitesContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  const addInvite = () => {
    setInvites([...invites, { email: '', role: 'editor', message: '' }]);
  };

  const removeInvite = (index: number) => {
    if (invites.length > 1) {
      setInvites(invites.filter((_, i) => i !== index));
    }
  };

  const updateInvite = (index: number, field: keyof InviteData, value: string) => {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  };

  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors: string[] = [];
    
    invites.forEach((invite, index) => {
      if (!invite.email.trim()) {
        errors.push(`Email ${index + 1} is required`);
      } else if (!emailRegex.test(invite.email)) {
        errors.push(`Email ${index + 1} is invalid`);
      }
    });

    // Check for duplicate emails
    const emails = invites.map(invite => invite.email.toLowerCase());
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicates.length > 0) {
      errors.push('Duplicate email addresses found');
    }

    return errors;
  };

  const handleSendInvites = async () => {
    setError(null);
    setSuccess(null);

    const validationErrors = validateEmails();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Successfully sent ${invites.length} invitation${invites.length > 1 ? 's' : ''}!`);
      
      // Reset form after success
      setTimeout(() => {
        setInvites([{ email: '', role: 'editor', message: '' }]);
        setSuccess(null);
        onClose();
      }, 2000);
      
    } catch (err) {
      setError('Failed to send invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInvites([{ email: '', role: 'editor', message: '' }]);
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
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Invite Team Members</h2>
                <p className="text-gray-600">Add collaborators to your workspace</p>
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

          {/* Invite Forms */}
          <div 
            className="space-y-6 max-h-[400px] overflow-y-auto pr-2" 
            ref={invitesContainerRef}
          >
            {invites.map((invite, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Invitation {index + 1}
                  </h3>
                  {invites.length > 1 && (
                    <button
                      onClick={() => removeInvite(index)}
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
                        value={invite.email}
                        onChange={(e) => updateInvite(index, 'email', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="colleague@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      value={invite.role}
                      onChange={(e) => updateInvite(index, 'role', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {ROLES.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={invite.message}
                    onChange={(e) => updateInvite(index, 'message', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Add a personal message to your invitation..."
                  />
                </div>

                {/* Role Permissions Preview */}
                <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {ROLES.find(r => r.id === invite.role)?.name} Permissions:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.find(r => r.id === invite.role)?.permissions.map((permission, i) => (
                      <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Invite */}
          <button
            onClick={addInvite}
            className="w-full mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Invitation
          </button>

          {/* Role Information */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Role Descriptions:</h4>
            <div className="space-y-2 text-sm text-blue-800">
              {ROLES.map(role => (
                <div key={role.id}>
                  <strong>{role.name}:</strong> {role.description}
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
            onClick={handleSendInvites}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Sending...' : `Send ${invites.length} Invitation${invites.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}