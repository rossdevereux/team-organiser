import React, { lazy, Suspense } from 'react';
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton';

const SquadManager = lazy(() =>
  import('../components/SquadManager').then((m) => ({ default: m.SquadManager }))
);

export const SquadPage: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingSkeleton label="Loading Squad Roster..." />}>
      <SquadManager />
    </Suspense>
  );
};
