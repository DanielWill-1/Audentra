import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Trash2, ArrowLeft, Loader2, FileText } from 'lucide-react';

function FilledTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filled, setFilled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchFilled = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('filled_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setFilled(data || []);
      setLoading(false);
    };
    fetchFilled();
  }, [user]);

  const deleteFilledTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('filled_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // Remove the deleted item from the state
      setFilled((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete filled template:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Filled Templates</h1>
              <p className="text-gray-600">Manage all your previously filled templates here.</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filled.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No filled templates found</h3>
            <p className="text-gray-600 mb-6">
              You haven’t filled any templates yet. Start by creating a new form.
            </p>
            <button
              onClick={() => navigate('/templates')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose a Template
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filled.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border shadow-sm p-6 relative">
                <button
                  onClick={() => deleteFilledTemplate(item.id)}
                  className="absolute top-4 right-4 text-red-600 hover:text-red-800"
                  title="Delete Template"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="font-semibold text-lg text-gray-800 mb-2">
                  Template Name: <span className="text-purple-600">{item.template_name}</span>
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  Filled on: {new Date(item.created_at).toLocaleString()}
                </div>
                <div className="bg-gray-50 rounded p-4 text-sm overflow-x-auto border">
                  <h2 className="text-gray-700 font-medium mb-2">Form Data:</h2>
                  <ul className="text-gray-600 space-y-2">
                    {Object.entries(item.form_data).map(([key, value]) => (
                      <li key={key}>
                        <span className="font-semibold text-gray-800">{key}:</span> {value || 'N/A'}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FilledTemplates;