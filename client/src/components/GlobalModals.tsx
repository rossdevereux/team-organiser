import React, { lazy, Suspense } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { ConfirmModal } from './ConfirmModal';

// Modals lazy loaded on demand
const WhatsAppExportModal = lazy(() =>
  import('./WhatsAppExportModal').then((m) => ({ default: m.WhatsAppExportModal }))
);
const PrintMatchSheet = lazy(() =>
  import('./PrintMatchSheet').then((m) => ({ default: m.PrintMatchSheet }))
);
const SettingsModal = lazy(() =>
  import('./SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const MatchdaySelectorModal = lazy(() =>
  import('./MatchdaySelectorModal').then((m) => ({ default: m.MatchdaySelectorModal }))
);
const CustomFormationModal = lazy(() =>
  import('./CustomFormationModal').then((m) => ({ default: m.CustomFormationModal }))
);
const PostMatchModal = lazy(() =>
  import('./PostMatchModal').then((m) => ({ default: m.PostMatchModal }))
);
const SuggestedSubsModal = lazy(() =>
  import('./SuggestedSubsModal').then((m) => ({ default: m.SuggestedSubsModal }))
);
const PrivacyPolicyModal = lazy(() =>
  import('./PrivacyPolicyModal').then((m) => ({ default: m.PrivacyPolicyModal }))
);
const LiveMatchModal = lazy(() =>
  import('./LiveMatchModal').then((m) => ({ default: m.LiveMatchModal }))
);
const EditFixtureModal = lazy(() =>
  import('./EditFixtureModal').then((m) => ({ default: m.EditFixtureModal }))
);
const DesignSystemShowcase = lazy(() =>
  import('../design-system').then((m) => ({ default: m.DesignSystemShowcase }))
);

export interface GlobalModalsProps {
  confirmResetOpen: boolean;
  onConfirmResetClose: () => void;
  onResetLineups: () => void;
  showcaseOpen: boolean;
  onShowcaseClose: () => void;
  whatsAppOpen: boolean;
  onWhatsAppClose: () => void;
  printOpen: boolean;
  onPrintClose: () => void;
  settingsOpen: boolean;
  onSettingsClose: () => void;
  onOpenCustomFormation: () => void;
  squadSelectorOpen: boolean;
  onSquadSelectorClose: () => void;
  customFormationOpen: boolean;
  onCustomFormationClose: () => void;
  postMatchOpen: boolean;
  onPostMatchClose: () => void;
  suggestedSubsOpen: boolean;
  onSuggestedSubsClose: () => void;
  privacyOpen: boolean;
  onPrivacyClose: () => void;
  liveMatchOpen: boolean;
  onLiveMatchClose: () => void;
  editActiveFixtureOpen: boolean;
  onEditActiveFixtureClose: () => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
  confirmResetOpen,
  onConfirmResetClose,
  onResetLineups,
  showcaseOpen,
  onShowcaseClose,
  whatsAppOpen,
  onWhatsAppClose,
  printOpen,
  onPrintClose,
  settingsOpen,
  onSettingsClose,
  onOpenCustomFormation,
  squadSelectorOpen,
  onSquadSelectorClose,
  customFormationOpen,
  onCustomFormationClose,
  postMatchOpen,
  onPostMatchClose,
  suggestedSubsOpen,
  onSuggestedSubsClose,
  privacyOpen,
  onPrivacyClose,
  liveMatchOpen,
  onLiveMatchClose,
  editActiveFixtureOpen,
  onEditActiveFixtureClose,
}) => {
  const { activeFixture } = useMatchday();

  return (
    <>
      <ConfirmModal
        isOpen={confirmResetOpen}
        title="Reset Match Sheet Lineups?"
        message={`Are you sure you want to reset all period lineups for vs ${activeFixture?.opponent}? This will unassign players from pitch positions and place all matchday squad members on the bench so you can build fresh.`}
        confirmLabel="Reset Lineups"
        cancelLabel="Keep Current Lineups"
        isDestructive={true}
        onConfirm={onResetLineups}
        onCancel={onConfirmResetClose}
      />

      {showcaseOpen && (
        <Suspense fallback={null}>
          <DesignSystemShowcase
            isOpen={showcaseOpen}
            onClose={onShowcaseClose}
          />
        </Suspense>
      )}

      {whatsAppOpen && (
        <Suspense fallback={null}>
          <WhatsAppExportModal
            isOpen={whatsAppOpen}
            onClose={onWhatsAppClose}
          />
        </Suspense>
      )}

      {printOpen && (
        <Suspense fallback={null}>
          <PrintMatchSheet
            isOpen={printOpen}
            onClose={onPrintClose}
          />
        </Suspense>
      )}

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={settingsOpen}
            onClose={onSettingsClose}
            onOpenCustomFormation={onOpenCustomFormation}
          />
        </Suspense>
      )}

      {squadSelectorOpen && (
        <Suspense fallback={null}>
          <MatchdaySelectorModal
            isOpen={squadSelectorOpen}
            onClose={onSquadSelectorClose}
          />
        </Suspense>
      )}

      {customFormationOpen && (
        <Suspense fallback={null}>
          <CustomFormationModal
            isOpen={customFormationOpen}
            onClose={onCustomFormationClose}
          />
        </Suspense>
      )}

      {postMatchOpen && (
        <Suspense fallback={null}>
          <PostMatchModal
            fixture={activeFixture}
            isOpen={postMatchOpen}
            onClose={onPostMatchClose}
          />
        </Suspense>
      )}

      {suggestedSubsOpen && (
        <Suspense fallback={null}>
          <SuggestedSubsModal
            fixture={activeFixture}
            isOpen={suggestedSubsOpen}
            onClose={onSuggestedSubsClose}
          />
        </Suspense>
      )}

      {privacyOpen && (
        <Suspense fallback={null}>
          <PrivacyPolicyModal
            isOpen={privacyOpen}
            onClose={onPrivacyClose}
          />
        </Suspense>
      )}

      {liveMatchOpen && (
        <Suspense fallback={null}>
          <LiveMatchModal
            isOpen={liveMatchOpen}
            onClose={onLiveMatchClose}
          />
        </Suspense>
      )}

      {editActiveFixtureOpen && (
        <Suspense fallback={null}>
          <EditFixtureModal
            fixture={activeFixture}
            isOpen={editActiveFixtureOpen}
            onClose={onEditActiveFixtureClose}
          />
        </Suspense>
      )}
    </>
  );
};
