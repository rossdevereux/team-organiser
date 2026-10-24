import React, { lazy, Suspense } from 'react';
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton';

const TeamDashboardView = lazy(() =>
  import('../components/TeamDashboardView').then((m) => ({ default: m.TeamDashboardView }))
);

export const TeamDashboardPage: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingSkeleton label="Loading Team Dashboard & Analytics..." />}>
      <TeamDashboardView />
    </Suspense>
  );
};
