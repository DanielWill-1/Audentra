import React from 'react';
import { CheckCircle, X, ArrowRight, Star } from 'lucide-react';

function Pricing() {
  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Pricing</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Choose the plan that fits your needs. All plans include our core voice AI technology, 
            blockchain verification, and enterprise-grade security.
          </p>
          <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
            <Star className="w-4 h-4 mr-2" />
            14-day free trial • No credit card required
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-shadow">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <p className="text-gray-600 mb-6">Perfect for small teams and individual professionals</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">$29</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <button className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors">
                  Start Free Trial
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Up to 100 forms per month</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">5 team members</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Basic voice AI</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Standard security</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Email support</span>
                </div>
                <div className="flex items-center">
                  <X className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-400">Voice summaries</span>
                </div>
                <div className="flex items-center">
                  <X className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-400">Custom integrations</span>
                </div>
                <div className="flex items-center">
                  <X className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-400">Priority support</span>
                </div>
              </div>
            </div>

            {/* Professional Plan */}
            <div className="bg-white rounded-2xl border-2 border-blue-500 p-8 relative hover:shadow-xl transition-shadow">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
                <p className="text-gray-600 mb-6">Ideal for growing teams and departments</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">$79</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                  Start Free Trial
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Up to 500 forms per month</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">25 team members</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Advanced voice AI</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Enterprise security</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Priority support</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Voice summaries</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">API access</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Analytics dashboard</span>
                </div>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-shadow">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-gray-600 mb-6">For large organizations with custom needs</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">Custom</span>
                </div>
                <button className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors">
                  Contact Sales
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Unlimited forms</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Unlimited team members</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Custom AI training</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Advanced security</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">24/7 dedicated support</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Custom integrations</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">On-premise deployment</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">SLA guarantee</span>
                </div>
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
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-8">
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens during the free trial?
              </h3>
              <p className="text-gray-600">
                You get full access to all Professional plan features for 14 days. No credit card required. 
                You can process up to 50 forms during the trial period.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and we'll prorate any billing adjustments.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600">
                Absolutely. We use enterprise-grade encryption, blockchain verification, and are fully 
                compliant with HIPAA, GDPR, and other major privacy regulations.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer volume discounts?
              </h3>
              <p className="text-gray-600">
                Yes, we offer custom pricing for large organizations. Contact our sales team to discuss 
                volume discounts and enterprise features.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who've transformed their workflow with VoiceForm Pro.
          </p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center">
            Start Your Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          <p className="text-blue-200 text-sm mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}

export default Pricing;