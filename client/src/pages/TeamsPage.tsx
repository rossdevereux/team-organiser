import React, { lazy, Suspense } from 'react';
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton';

const TeamManager = lazy(() =>
  import('../components/TeamManager').then((m) => ({ default: m.TeamManager }))
);

export const TeamsPage: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingSkeleton label="Loading Teams & Sharing..." />}>
      <TeamManager />
    </Suspense>
  );
};
