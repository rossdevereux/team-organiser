import React, { lazy, Suspense } from 'react';
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton';

const FixtureManager = lazy(() =>
  import('../components/FixtureManager').then((m) => ({ default: m.FixtureManager }))
);

export const FixturesPage: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingSkeleton label="Loading Fixtures..." />}>
      <FixtureManager />
    </Suspense>
  );
};
