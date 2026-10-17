import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { LandingHero } from '../components/LandingHero';

const PrivacyPolicyModal = React.lazy(() =>
  import('../components/PrivacyPolicyModal').then((m) => ({ default: m.PrivacyPolicyModal }))
);

export const LandingPage: React.FC = () => {
  const { currentUser, enterDemoMode } = useMatchday();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const handleStartDemo = () => {
    enterDemoMode();
    showToast('Entered Demo Mode with sample squad: The Rovers FC', 'info');
  };

  const handleGoToApp = () => {
    navigate({ to: '/lineup', search: (prev) => prev });
  };

  const handleSignInSuccess = () => {
    showToast('Signed in successfully! Loading your club dashboard...', 'success');
    navigate({ to: '/lineup', search: (prev) => prev });
  };

  return (
    <>
      <LandingHero
        currentUser={currentUser}
        onStartDemo={handleStartDemo}
        onGoToApp={handleGoToApp}
        onSignInSuccess={handleSignInSuccess}
        onOpenPrivacy={() => setPrivacyOpen(true)}
      />
      {privacyOpen && (
        <React.Suspense fallback={null}>
          <PrivacyPolicyModal
            isOpen={privacyOpen}
            onClose={() => setPrivacyOpen(false)}
          />
        </React.Suspense>
      )}
    </>
  );
};

