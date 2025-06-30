import React, { useState } from 'react';
import { 
  Search, 
  Book, 
  MessageCircle, 
  Video, 
  FileText, 
  ArrowRight,
  ChevronRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  Tag,
  Lightbulb,
  Settings,
  Shield,
  Zap,
  Users,
  Phone,
  Mail
} from 'lucide-react';

function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Topics', icon: Book, count: 47 },
    { id: 'getting-started', name: 'Getting Started', icon: Lightbulb, count: 8 },
    { id: 'voice-features', name: 'Voice Features', icon: Zap, count: 12 },
    { id: 'templates', name: 'Templates', icon: FileText, count: 10 },
    { id: 'security', name: 'Security & Privacy', icon: Shield, count: 6 },
    { id: 'team-management', name: 'Team Management', icon: Users, count: 7 },
    { id: 'settings', name: 'Settings & Account', icon: Settings, count: 4 }
  ];

  const popularArticles = [
    {
      id: 1,
      title: 'How to create your first voice form',
      category: 'getting-started',
      readTime: '3 min read',
      rating: 4.9,
      views: 1247,
      lastUpdated: '2 days ago'
    },
    {
      id: 2,
      title: 'Understanding voice accuracy and training',
      category: 'voice-features',
      readTime: '5 min read',
      rating: 4.8,
      views: 892,
      lastUpdated: '1 week ago'
    },
    {
      id: 3,
      title: 'Setting up team permissions and roles',
      category: 'team-management',
      readTime: '4 min read',
      rating: 4.7,
      views: 634,
      lastUpdated: '3 days ago'
    },
    {
      id: 4,
      title: 'HIPAA compliance and data security',
      category: 'security',
      readTime: '6 min read',
      rating: 4.9,
      views: 1156,
      lastUpdated: '1 day ago'
    },
    {
      id: 5,
      title: 'Creating custom form templates',
      category: 'templates',
      readTime: '7 min read',
      rating: 4.6,
      views: 445,
      lastUpdated: '5 days ago'
    },
    {
      id: 6,
      title: 'Troubleshooting voice recognition issues',
      category: 'voice-features',
      readTime: '4 min read',
      rating: 4.5,
      views: 723,
      lastUpdated: '1 week ago'
    }
  ];

  const quickActions = [
    {
      title: 'Video Tutorials',
      description: 'Watch step-by-step guides',
      icon: Video,
      color: 'bg-blue-100 text-blue-600',
      action: 'Browse Videos'
    },
    {
      title: 'Live Chat Support',
      description: 'Get instant help from our team',
      icon: MessageCircle,
      color: 'bg-emerald-100 text-emerald-600',
      action: 'Start Chat'
    },
    {
      title: 'Contact Support',
      description: 'Submit a support ticket',
      icon: Mail,
      color: 'bg-purple-100 text-purple-600',
      action: 'Contact Us'
    },
    {
      title: 'Schedule Demo',
      description: 'Book a personalized walkthrough',
      icon: Phone,
      color: 'bg-orange-100 text-orange-600',
      action: 'Book Demo'
    }
  ];

  const recentUpdates = [
    {
      title: 'New Voice Summary Feature Released',
      date: '2024-01-15',
      type: 'feature'
    },
    {
      title: 'Updated Security Documentation',
      date: '2024-01-12',
      type: 'update'
    },
    {
      title: 'Mobile App Performance Improvements',
      date: '2024-01-10',
      type: 'improvement'
    }
  ];

  const filteredArticles = popularArticles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Help Center <span className="text-gray-500">(Sample Data)</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Find answers, tutorials, and resources to help you get the most out of VoiceForm Pro
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search for help articles, tutorials, or features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {quickActions.map((action, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-gray-600 mb-4">{action.description}</p>
                <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  {action.action}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <category.icon className="w-4 h-4 mr-3" />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {category.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Recent Updates */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Recent Updates</h4>
                  <div className="space-y-3">
                    {recentUpdates.map((update, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">{update.title}</div>
                        <div className="text-gray-500 text-xs">{update.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Articles */}
            <div className="flex-1">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedCategory === 'all' ? 'Popular Articles' : categories.find(c => c.id === selectedCategory)?.name}
                </h2>
                <p className="text-gray-600">{filteredArticles.length} articles found</p>
              </div>

              <div className="grid gap-6">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                          {article.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {article.readTime}
                          </div>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                            {article.rating}
                          </div>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {article.views} views
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                            {categories.find(c => c.id === article.category)?.name}
                          </span>
                          <span className="text-xs text-gray-500">Updated {article.lastUpdated}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-4">
                        <button className="flex items-center text-sm text-gray-600 hover:text-green-600">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Helpful
                        </button>
                        <button className="flex items-center text-sm text-gray-600 hover:text-red-600">
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          Not helpful
                        </button>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        Read Article →
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredArticles.length === 0 && (
                <div className="text-center py-12">
                  <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                  <p className="text-gray-600 mb-6">Try adjusting your search or browse different categories</p>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Browse All Articles
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Our support team is here to help you succeed with VoiceForm Pro
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Start Live Chat
            </button>
            <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Support
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HelpCenter;