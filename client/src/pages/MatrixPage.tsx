import React, { lazy, Suspense } from 'react';
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton';

const RotationMatrix = lazy(() =>
  import('../components/RotationMatrix').then((m) => ({ default: m.RotationMatrix }))
);

export const MatrixPage: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingSkeleton label="Loading Rotation Matrix..." />}>
      <RotationMatrix />
    </Suspense>
  );
};
