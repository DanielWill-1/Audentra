import React from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send,
  MessageSquare,
  Calendar,
  Users
} from 'lucide-react';

function Contact() {
  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Get in
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Touch</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ready to transform your workflow? Our team is here to help you get started 
            with VoiceForm Pro and answer any questions you might have.
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Send us a message</h2>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Smith"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@company.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your Company"
                  />
                </div>
                
                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <select
                    id="industry"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select your industry</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="construction">Construction & Field Work</option>
                    <option value="hr">Human Resources</option>
                    <option value="legal">Legal Services</option>
                    <option value="education">Education</option>
                    <option value="real-estate">Real Estate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about your needs and how we can help..."
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Other ways to reach us</h2>
              
              <div className="space-y-8 mb-12">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Email Support</h3>
                    <p className="text-gray-600 mb-2">Get help from our support team</p>
                    <a href="mailto:support@voiceformpro.com" className="text-blue-600 hover:text-blue-700">
                      support@voiceformpro.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mr-4">
                    <Phone className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Phone Support</h3>
                    <p className="text-gray-600 mb-2">Speak directly with our team</p>
                    <a href="tel:+1-555-123-4567" className="text-blue-600 hover:text-blue-700">
                      +1 (555) 123-4567
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <MapPin className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Office Location</h3>
                    <p className="text-gray-600">
                      123 Innovation Drive<br />
                      San Francisco, CA 94105<br />
                      United States
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Business Hours</h3>
                    <p className="text-gray-600">
                      Monday - Friday: 9:00 AM - 6:00 PM PST<br />
                      Saturday: 10:00 AM - 4:00 PM PST<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                
                <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule a Demo
                </button>
                
                <button className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Start Live Chat
                </button>
                
                <button className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
                  <Users className="w-5 h-5 mr-2" />
                  Talk to Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Common Questions
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to questions you might have
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How quickly can I get started?
              </h3>
              <p className="text-gray-600">
                You can start using VoiceForm Pro immediately with our 14-day free trial. 
                No setup required - just sign up and start speaking to forms.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer training and onboarding?
              </h3>
              <p className="text-gray-600">
                Yes! We provide comprehensive onboarding for all new customers, including 
                training sessions, best practices, and ongoing support.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can VoiceForm Pro integrate with our existing systems?
              </h3>
              <p className="text-gray-600">
                Absolutely. We offer API integrations and can work with your team to 
                connect VoiceForm Pro with your existing workflows and systems.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What kind of support do you provide?
              </h3>
              <p className="text-gray-600">
                We offer email support for all customers, priority support for Professional 
                plans, and dedicated 24/7 support for Enterprise customers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Contact;