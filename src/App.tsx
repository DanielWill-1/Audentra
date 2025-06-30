import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Features from './pages/Features';
import Industries from './pages/Industries';
import Security from './pages/Security';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import TeamCollaboration from './pages/TeamCollaboration';
import Scheduler from './pages/Scheduler';
import ManageSchedules from './pages/ManageSchedules';
import SchedulerSettings from './pages/SchedulerSettings';
import Status from './pages/Status';
import HelpCenter from './pages/HelpCenter';
import Documentation from './pages/Documentation';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ActivityLog from './pages/ActivityLog';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-white">
          <Routes>
            {/* Auth pages without header/footer */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/team" element={<TeamCollaboration />} />
            <Route path="/scheduler" element={<Scheduler />} />
            <Route path="/manage-schedules" element={<ManageSchedules />} />
            <Route path="/scheduler-settings" element={<SchedulerSettings />} />
            <Route path="/activity" element={<ActivityLog />} />
            
            {/* Main website pages with header/footer */}
            <Route path="/" element={
              <>
                <Header />
                <main>
                  <Home />
                </main>
                <Footer />
              </>
            } />
            <Route path="/features" element={
              <>
                <Header />
                <main>
                  <Features />
                </main>
                <Footer />
              </>
            } />
            <Route path="/industries" element={
              <>
                <Header />
                <main>
                  <Industries />
                </main>
                <Footer />
              </>
            } />
            <Route path="/security" element={
              <>
                <Header />
                <main>
                  <Security />
                </main>
                <Footer />
              </>
            } />
            <Route path="/pricing" element={
              <>
                <Header />
                <main>
                  <Pricing />
                </main>
                <Footer />
              </>
            } />
            <Route path="/about" element={
              <>
                <Header />
                <main>
                  <About />
                </main>
                <Footer />
              </>
            } />
            <Route path="/contact" element={
              <>
                <Header />
                <main>
                  <Contact />
                </main>
                <Footer />
              </>
            } />
            <Route path="/status" element={
              <>
                <Header />
                <main>
                  <Status />
                </main>
                <Footer />
              </>
            } />
            <Route path="/help-center" element={
              <>
                <Header />
                <main>
                  <HelpCenter />
                </main>
                <Footer />
              </>
            } />
            <Route path="/documentation" element={
              <>
                <Header />
                <main>
                  <Documentation />
                </main>
                <Footer />
              </>
            } />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;