import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { RootLayout } from './RootLayout';
import { LineupPage } from './pages/LineupPage';
import { MatrixPage } from './pages/MatrixPage';
import { SquadPage } from './pages/SquadPage';
import { FixturesPage } from './pages/FixturesPage';
import { StatsPage } from './pages/StatsPage';
import { TeamsPage } from './pages/TeamsPage';
import { AdminPage } from './pages/AdminPage';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LineupPage,
});

const lineupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lineup',
  component: LineupPage,
});

const matrixRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matrix',
  component: MatrixPage,
});

const squadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/squad',
  component: SquadPage,
});

const fixturesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fixtures',
  component: FixturesPage,
});

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stats',
  component: StatsPage,
});

const teamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teams',
  component: TeamsPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
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
