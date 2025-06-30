import React from 'react';
import { Link } from 'react-router-dom';
import { Mic } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Audentra</span>
            </Link>
            <p className="text-gray-600 text-sm">
              Revolutionary AI-powered voice technology for professional form completion.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/features" className="hover:text-blue-600">Features</Link></li>
              <li><Link to="/industries" className="hover:text-blue-600">Industries</Link></li>
              <li><Link to="/security" className="hover:text-blue-600">Security</Link></li>
              <li><Link to="/pricing" className="hover:text-blue-600">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/about" className="hover:text-blue-600">About</Link></li>
              <li><Link to="/contact" className="hover:text-blue-600">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/help-center" className="hover:text-blue-600">Help Center</Link></li>
              <li><Link to="/documentation" className="hover:text-blue-600">Documentation</Link></li>
              <li><Link to="/status" className="hover:text-blue-600">Status</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
          <p>&copy; 2024 Audentra. All rights reserved. HIPAA Compliant • SOC 2 Certified • Blockchain Verified</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;