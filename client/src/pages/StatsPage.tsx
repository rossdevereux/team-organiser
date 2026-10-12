import React, { lazy, Suspense } from 'react';
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton';

const FairPlayStats = lazy(() =>
  import('../components/FairPlayStats').then((m) => ({ default: m.FairPlayStats }))
);

export const StatsPage: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingSkeleton label="Loading Fair Play Statistics..." />}>
      <FairPlayStats />
    </Suspense>
  );
};
