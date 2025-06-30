import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Star, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  User,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2
} from 'lucide-react';
import { Template, addTemplateReview, getTemplateReviews, updateTemplateReview, TemplateReview } from '../../lib/templates';

interface TemplateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template;
}

const STATUS_OPTIONS = [
  { id: 'pending', name: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'approved', name: 'Approved', color: 'bg-green-100 text-green-800' },
  { id: 'needs_changes', name: 'Needs Changes', color: 'bg-orange-100 text-orange-800' },
  { id: 'rejected', name: 'Rejected', color: 'bg-red-100 text-red-800' }
];

// Storage key for template reviews
const STORAGE_KEY_PREFIX = 'templateReviews_';

export default function TemplateReviewModal({ isOpen, onClose, template }: TemplateReviewModalProps) {
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    status: 'pending' as 'pending' | 'approved' | 'rejected' | 'needs_changes'
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editedComment, setEditedComment] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadReviews();
    }
  }, [isOpen, template.id]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      // Try to load from localStorage first
      const storageKey = `${STORAGE_KEY_PREFIX}${template.id}`;
      const savedReviews = localStorage.getItem(storageKey);
      
      if (savedReviews) {
        setReviews(JSON.parse(savedReviews));
      } else {
        // If not in localStorage, try to get from API
        const { data, error } = await getTemplateReviews(template.id);
        if (error) throw error;
        
        if (data && data.length > 0) {
          setReviews(data);
          // Save to localStorage
          localStorage.setItem(storageKey, JSON.stringify(data));
        } else {
          setReviews([]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      setError('Please add a comment to your review');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // In a real app, this would call an API
      // const { error } = await addTemplateReview({
      //   template_id: template.id,
      //   rating: newReview.rating,
      //   comment: newReview.comment,
      //   status: newReview.status
      // });
      
      // if (error) throw error;

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a new review object
      const newReviewObj: TemplateReview = {
        id: `review_${Date.now()}`,
        template_id: template.id,
        reviewer_id: 'current-user-id',
        reviewer_name: 'Current User',
        reviewer_email: 'user@example.com',
        rating: newReview.rating,
        comment: newReview.comment,
        status: newReview.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Update local state
      const updatedReviews = [...reviews, newReviewObj];
      setReviews(updatedReviews);
      
      // Save to localStorage
      const storageKey = `${STORAGE_KEY_PREFIX}${template.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedReviews));

      setSuccess('Review submitted successfully!');
      setNewReview({ rating: 5, comment: '', status: 'pending' });

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReview = async (reviewId: string) => {
    if (!editedComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    
    try {
      // In a real app, this would call an API
      // const { error } = await updateTemplateReview(reviewId, { comment: editedComment });
      // if (error) throw error;
      
      // Update the review in local state
      const updatedReviews = reviews.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              comment: editedComment,
              updated_at: new Date().toISOString()
            } 
          : review
      );
      
      setReviews(updatedReviews);
      
      // Save to localStorage
      const storageKey = `${STORAGE_KEY_PREFIX}${template.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedReviews));
      
      setEditingReview(null);
      setSuccess('Review updated successfully');
      setTimeout(() => setSuccess(null), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      // In a real app, this would call an API
      // const { error } = await deleteTemplateReview(reviewId);
      // if (error) throw error;
      
      // Remove the review from local state
      const updatedReviews = reviews.filter(review => review.id !== reviewId);
      setReviews(updatedReviews);
      
      // Save to localStorage
      const storageKey = `${STORAGE_KEY_PREFIX}${template.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedReviews));
      
      setSuccess('Review deleted successfully');
      setTimeout(() => setSuccess(null), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete review');
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.id === status)?.color || 'bg-gray-100 text-gray-800';
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

  const handleClose = () => {
    setNewReview({ rating: 5, comment: '', status: 'pending' });
    setError(null);
    setSuccess(null);
    setEditingReview(null);
    onClose();
  };

  if (!isOpen) return null;

  const averageRating = getAverageRating();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Template Reviews</h2>
                <p className="text-gray-600">Reviews for "{template.name}"</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Rating Summary */}
          {reviews.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                  <div className="flex items-center justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= averageRating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviews.filter(r => r.rating === rating).length;
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center space-x-2 mb-1">
                        <span className="text-sm text-gray-600 w-8">{rating}★</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-400 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Add New Review */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Your Review</h3>
            
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          star <= newReview.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {newReview.rating} star{newReview.rating !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={newReview.status}
                  onChange={(e) => setNewReview({ ...newReview, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
              <textarea
                rows={4}
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Share your thoughts about this template..."
              />
            </div>

            <button
              onClick={handleSubmitReview}
              disabled={submitting}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>

          {/* Existing Reviews */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              All Reviews ({reviews.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600">Loading reviews...</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h4>
                <p className="text-gray-600">Be the first to review this template!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {review.reviewer_name ? review.reviewer_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {review.reviewer_name || review.reviewer_email}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                              {STATUS_OPTIONS.find(s => s.id === review.status)?.name}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(review.created_at)}
                            {review.updated_at !== review.created_at && (
                              <span className="ml-2">(edited)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingReview(review.id);
                            setEditedComment(review.comment || '');
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit Review"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {editingReview === review.id ? (
                      <div className="space-y-4">
                        <textarea
                          value={editedComment}
                          onChange={(e) => setEditedComment(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          rows={3}
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingReview(null)}
                            className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateReview(review.id)}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 mb-4">{review.comment}</p>
                    )}

                    {/* Review Actions */}
                    <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
                      <button className="flex items-center text-sm text-gray-600 hover:text-green-600 transition-colors">
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Helpful
                      </button>
                      <button className="flex items-center text-sm text-gray-600 hover:text-red-600 transition-colors">
                        <ThumbsDown className="w-4 h-4 mr-1" />
                        Not helpful
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}