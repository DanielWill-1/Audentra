import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MessageSquare, 
  Star, 
  Clock, 
  FileText, 
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  Filter,
  Search,
  Calendar,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap,
  Building2
} from 'lucide-react';
import { getReviewQueue, updateTemplateReview, TemplateReview } from '../../lib/templates';
import { useAuth } from '../../contexts/AuthContext';

interface ReviewQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReviewQueueItem extends TemplateReview {
  template: {
    id: string;
    name: string;
    category: string;
    description?: string;
    form_data?: any;
    visibility: string;
    created_by: string;
    created_at: string;
    updated_at: string;
  };
}

const CATEGORY_ICONS = {
  healthcare: Stethoscope,
  fieldwork: HardHat,
  hr: UserCheck,
  legal: Scale,
  education: GraduationCap,
  realestate: Building2
};

const STATUS_OPTIONS = [
  { id: 'pending', name: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { id: 'approved', name: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { id: 'needs_changes', name: 'Needs Changes', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  { id: 'rejected', name: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
];

// Storage key for review queue items
const STORAGE_KEY = 'reviewQueueItems';

export default function ReviewQueueModal({ isOpen, onClose }: ReviewQueueModalProps) {
  const { user } = useAuth();
  const [reviewItems, setReviewItems] = useState<ReviewQueueItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
    status: 'pending' as 'pending' | 'approved' | 'rejected' | 'needs_changes'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadReviewQueue();
    }
  }, [isOpen]);

  useEffect(() => {
    filterItems();
  }, [reviewItems, searchQuery, statusFilter]);

  // Add scroll wheel event handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (itemsContainerRef.current) {
        itemsContainerRef.current.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };

    const container = itemsContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  const loadReviewQueue = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to load from localStorage first
      const savedItems = localStorage.getItem(STORAGE_KEY);
      if (savedItems) {
        const parsedItems = JSON.parse(savedItems);
        setReviewItems(parsedItems);
        setLoading(false);
        return;
      }
      
      const { data, error } = await getReviewQueue();
      if (error) throw error;
      
      // If no data is returned, create some mock data for demonstration
      if (!data || data.length === 0) {
        // Get user name from metadata
        const firstName = user?.user_metadata?.first_name || '';
        const lastName = user?.user_metadata?.last_name || '';
        const userName = `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'User';
        
        const mockReviewItems: ReviewQueueItem[] = [
          {
            id: '1',
            template_id: '1',
            template: {
              id: '1',
              name: 'Patient Intake Form',
              category: 'healthcare',
              description: 'Standard patient intake form for new patients',
              visibility: 'visible',
              created_by: 'user-id',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            reviewer_id: user?.id || 'user-id',
            reviewer_name: userName,
            reviewer_email: user?.email || 'user@example.com',
            rating: 0,
            comment: '',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            template_id: '2',
            template: {
              id: '2',
              name: 'Safety Inspection Checklist',
              category: 'fieldwork',
              description: 'Comprehensive safety inspection form for construction sites',
              visibility: 'visible',
              created_by: 'user-id',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            reviewer_id: user?.id || 'user-id',
            reviewer_name: userName,
            reviewer_email: user?.email || 'user@example.com',
            rating: 0,
            comment: '',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setReviewItems(mockReviewItems);
        
        // Save to localStorage for persistence
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockReviewItems));
      } else {
        setReviewItems(data);
        
        // Save to localStorage for persistence
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (err: any) {
      console.error('Failed to load review queue:', err);
      setError(err.message || 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = reviewItems;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reviewer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredItems(filtered);
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || FileText;
    return IconComponent;
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.id === status) || STATUS_OPTIONS[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReviewSubmit = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // In a real app, this would call an API
      // const { error } = await updateTemplateReview(selectedItem.id, {
      //   rating: reviewData.rating,
      //   comment: reviewData.comment,
      //   status: reviewData.status
      // });
      
      // if (error) throw error;

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Review submitted successfully!');
      
      // Update the review item in the local state
      const updatedItems = reviewItems.map(item => 
        item.id === selectedItem.id 
          ? { 
              ...item, 
              rating: reviewData.rating, 
              comment: reviewData.comment, 
              status: reviewData.status,
              updated_at: new Date().toISOString()
            } 
          : item
      );
      
      setReviewItems(updatedItems);
      
      // Save to localStorage for persistence
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));

      setTimeout(() => {
        setSuccess(null);
        setSelectedItem(null);
        setReviewData({ rating: 5, comment: '', status: 'pending' });
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = (itemId: string) => {
    try {
      // Remove the review item
      const updatedItems = reviewItems.filter(item => item.id !== itemId);
      setReviewItems(updatedItems);
      
      // Save to localStorage for persistence
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
      
      setSuccess('Review deleted successfully');
      setTimeout(() => setSuccess(null), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete review');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleClose = () => {
    setSelectedItem(null);
    setReviewData({ rating: 5, comment: '', status: 'pending' });
    setSearchQuery('');
    setStatusFilter('all');
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Review Queue</h2>
                <p className="text-gray-600">Templates awaiting review and approval</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.id} value={status.id}>{status.name}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-green-800 text-sm">{success}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading review queue...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items in review queue</h3>
              <p className="text-gray-600">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'All templates have been reviewed'
                }
              </p>
            </div>
          ) : (
            <div 
              className="grid gap-6 max-h-[400px] overflow-y-auto pr-2" 
              ref={itemsContainerRef}
            >
              {filteredItems.map((item) => {
                const IconComponent = getCategoryIcon(item.template.category);
                const statusInfo = getStatusInfo(item.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-blue-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{item.template.name}</h3>
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded capitalize">
                              {item.template.category}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.name}
                            </span>
                          </div>
                          
                          {item.template.description && (
                            <p className="text-gray-600 mb-3">{item.template.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              Reviewer: {item.reviewer_name}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Added {formatDate(item.created_at)}
                            </div>
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              {item.template.form_data?.fields?.length || 0} fields
                            </div>
                          </div>

                          {item.comment && (
                            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                              <p className="text-sm text-gray-700 italic">"{item.comment}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            // Handle view template
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Template"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setReviewData({
                              rating: item.rating || 5,
                              comment: item.comment || '',
                              status: item.status
                            });
                          }}
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => handleDeleteReview(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Review Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Review Template</h3>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-600 mt-1">"{selectedItem.template.name}"</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Error/Success Messages */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <span className="text-green-800 text-sm">{success}</span>
                  </div>
                )}

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewData({ ...reviewData, rating: star })}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            star <= reviewData.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300 hover:text-yellow-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {reviewData.rating} star{reviewData.rating !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={reviewData.status}
                    onChange={(e) => setReviewData({ ...reviewData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Review Comment</label>
                  <textarea
                    rows={4}
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Add your review comments..."
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setReviewData({ ...reviewData, status: 'approved', rating: 5 })}
                    className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    Quick Approve
                  </button>
                  <button
                    onClick={() => setReviewData({ ...reviewData, status: 'needs_changes', rating: 3 })}
                    className="flex items-center px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Needs Changes
                  </button>
                  <button
                    onClick={() => setReviewData({ ...reviewData, status: 'rejected', rating: 1 })}
                    className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    Reject
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}