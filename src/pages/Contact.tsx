import React from 'react';
import { 
  Mail, 
  Phone, 
  Clock
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
            with Audentra and answer any questions you might have.
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Other ways to reach us</h2>
          <div className="space-y-8 mb-12 w-full max-w-lg">
            <div className="flex items-start justify-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Email Support</h3>
                <p className="text-gray-600 mb-2">Get help from our support team</p>
                <a href="mailto:danielwillson004@gmail.com" className="text-blue-600 hover:text-blue-700">
                  danielwillson004@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-start justify-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mr-4">
                <Phone className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Phone Support</h3>
                <p className="text-gray-600 mb-2">Speak directly with our team</p>
                <a href="tel:+91-8073293768" className="text-blue-600 hover:text-blue-700">
                  +91 8073293768
                </a>
              </div>
            </div>
            <div className="flex items-start justify-center">
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