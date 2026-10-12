import React, { lazy, Suspense } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AdminRoute } from '../components/AdminRoute';
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton';

const AdminPortal = lazy(() =>
  import('../components/AdminPortal').then((m) => ({ default: m.AdminPortal }))
);

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AdminRoute allowedRoles={['owner', 'coach']} onNavigateHome={() => navigate({ to: '/' })}>
      <Suspense fallback={<PageLoadingSkeleton label="Loading Admin Portal..." />}>
        <AdminPortal onNavigateHome={() => navigate({ to: '/' })} />
      </Suspense>
    </AdminRoute>
  );
};
