import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Layout } from './components/Layout';
import { AnimatePresence } from 'framer-motion';

import Home from './pages/Home';
import Pair from './pages/Pair';
import Logs from './pages/Logs';
import Plugins from './pages/Plugins';
import Commands from './pages/Commands';
import Stats from './pages/Stats';
import Sessions from './pages/Sessions';
import Files from './pages/Files';
import ApiStatus from './pages/ApiStatus';
import Settings from './pages/Settings';
import Backup from './pages/Backup';

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/pair" component={Pair} />
          <Route path="/logs" component={Logs} />
          <Route path="/plugins" component={Plugins} />
          <Route path="/commands" component={Commands} />
          <Route path="/stats" component={Stats} />
          <Route path="/sessions" component={Sessions} />
          <Route path="/files" component={Files} />
          <Route path="/api-status" component={ApiStatus} />
          <Route path="/settings" component={Settings} />
          <Route path="/backup" component={Backup} />
          <Route component={NotFound} />
        </Switch>
      </AnimatePresence>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
