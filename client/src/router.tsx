import React, { Suspense } from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { RootLayout } from './RootLayout';
import { LandingPage } from './pages/LandingPage';

const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
    <span className="text-xs text-slate-400 font-medium">Loading view...</span>
  </div>
);

// Lazy-load authenticated dashboards and standalone secondary pages for optimal Core Web Vitals
const LazyLineupPage = React.lazy(() => import('./pages/LineupPage').then((m) => ({ default: m.LineupPage })));
const LazyMatrixPage = React.lazy(() => import('./pages/MatrixPage').then((m) => ({ default: m.MatrixPage })));
const LazySquadPage = React.lazy(() => import('./pages/SquadPage').then((m) => ({ default: m.SquadPage })));
const LazyFixturesPage = React.lazy(() => import('./pages/FixturesPage').then((m) => ({ default: m.FixturesPage })));
const LazyStatsPage = React.lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const LazyTeamsPage = React.lazy(() => import('./pages/TeamsPage').then((m) => ({ default: m.TeamsPage })));
const LazyAdminPage = React.lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const LazyCalculatorPage = React.lazy(() => import('./pages/CalculatorPage').then((m) => ({ default: m.CalculatorPage })));
const LazyFeaturesPage = React.lazy(() => import('./pages/FeaturesPage').then((m) => ({ default: m.FeaturesPage })));
const LazyRulesPage = React.lazy(() => import('./pages/RulesPage').then((m) => ({ default: m.RulesPage })));

const withSuspense = (Component: React.ComponentType) => () => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

const calculatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calculator',
  component: withSuspense(LazyCalculatorPage),
});

const featuresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/features',
  component: withSuspense(LazyFeaturesPage),
});

const rulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rules',
  component: withSuspense(LazyRulesPage),
});

const lineupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lineup',
  component: withSuspense(LazyLineupPage),
});

const matrixRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matrix',
  component: withSuspense(LazyMatrixPage),
});

const squadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/squad',
  component: withSuspense(LazySquadPage),
});

const fixturesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fixtures',
  component: withSuspense(LazyFixturesPage),
});

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stats',
  component: withSuspense(LazyStatsPage),
});

const teamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teams',
  component: withSuspense(LazyTeamsPage),
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: withSuspense(LazyAdminPage),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  calculatorRoute,
  featuresRoute,
  rulesRoute,
  lineupRoute,
  matrixRoute,
  squadRoute,
  fixturesRoute,
  statsRoute,
  teamsRoute,
  adminRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

