import React from 'react';
import { 
  Users, 
  Target, 
  Award, 
  Globe, 
  ArrowRight,
  Lightbulb,
  Heart,
  Zap
} from 'lucide-react';

function About() {
  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Revolutionizing Forms with
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Voice AI</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're on a mission to eliminate the friction of form completion and make 
            professional workflows more human, efficient, and accessible.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                We believe that technology should adapt to humans, not the other way around. 
                Forms are a necessary part of professional life, but they shouldn't be a barrier 
                to productivity or patient care.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                VoiceForm Pro was born from the frustration of watching healthcare professionals 
                spend more time on paperwork than with patients, field workers struggling with 
                complex forms in challenging environments, and HR teams drowning in administrative tasks.
              </p>
              <div className="flex items-center text-blue-600">
                <Target className="w-6 h-6 mr-3" />
                <span className="font-semibold">Making professional workflows more human</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
                  <div className="text-gray-600 text-sm">Time Reduction</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-2">50K+</div>
                  <div className="text-gray-600 text-sm">Forms Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">99.7%</div>
                  <div className="text-gray-600 text-sm">Accuracy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">500+</div>
                  <div className="text-gray-600 text-sm">Organizations</div>
                </div>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Innovation</h3>
              <p className="text-gray-600">
                We push the boundaries of what's possible with voice AI, constantly improving 
                accuracy and expanding capabilities.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Empathy</h3>
              <p className="text-gray-600">
                We understand the daily challenges professionals face and design solutions 
                that truly make their lives easier.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Excellence</h3>
              <p className="text-gray-600">
                We maintain the highest standards in security, accuracy, and user experience 
                because professionals deserve the best.
              </p>
            </div>
          </div>

          {/* Team Section */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-xl text-gray-600">
              A diverse group of AI researchers, healthcare professionals, and technology experts
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-white">SM</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dr. Sarah Martinez</h3>
              <p className="text-blue-600 font-medium mb-3">CEO & Co-Founder</p>
              <p className="text-gray-600 text-sm">
                Former Chief Medical Officer with 15 years in healthcare technology. 
                PhD in Biomedical Informatics from Stanford.
              </p>
            </div>
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-white">AC</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Alex Chen</h3>
              <p className="text-blue-600 font-medium mb-3">CTO & Co-Founder</p>
              <p className="text-gray-600 text-sm">
                AI researcher and former Google engineer. Specializes in natural language 
                processing and voice recognition systems.
              </p>
            </div>
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-white">MJ</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Maria Johnson</h3>
              <p className="text-blue-600 font-medium mb-3">VP of Product</p>
              <p className="text-gray-600 text-sm">
                Former field operations manager turned product leader. Brings real-world 
                experience to product development.
              </p>
            </div>
          </div>

          {/* Company Stats */}
          <div className="bg-gradient-to-r from-gray-900 to-black rounded-3xl p-12 text-white">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Our Impact</h2>
              <p className="text-xl text-gray-300">
                Transforming workflows across industries worldwide
              </p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-blue-400 mb-2">10K+</div>
                <div className="text-gray-300">Active Users</div>
              </div>
              <div>
                <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-emerald-400 mb-2">25</div>
                <div className="text-gray-300">Countries</div>
              </div>
              <div>
                <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-purple-400 mb-2">5</div>
                <div className="text-gray-300">Industry Awards</div>
              </div>
              <div>
                <div className="w-16 h-16 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-orange-400 mb-2">99.9%</div>
                <div className="text-gray-300">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Join Our Mission
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Be part of the voice AI revolution. Transform your workflow and experience 
            the future of form completion today.
          </p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center">
            Start Your Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </section>
    </div>
  );
}

export default About;