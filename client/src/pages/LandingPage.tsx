import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { LandingHero } from '../components/LandingHero';

const PrivacyPolicyModal = React.lazy(() =>
  import('../components/PrivacyPolicyModal').then((m) => ({ default: m.PrivacyPolicyModal }))
);

export const LandingPage: React.FC = () => {
  const { currentUser } = useMatchday();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const handleStartDemo = () => {
    sessionStorage.setItem('subshuffle_demo_entered', 'true');
    localStorage.setItem('subshuffle_has_visited', 'true');
    showToast('Entered Demo Mode with sample squad: The Rovers U11', 'info');
    navigate({ to: '/lineup', search: (prev) => prev });
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

