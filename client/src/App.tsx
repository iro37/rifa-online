import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RaffleProvider } from "./context/RaffleContext";
import NotFound from "@/pages/not-found";

import Home from "@/pages/public/Home";
import Dashboard from "@/pages/admin/Dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RaffleProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </RaffleProvider>
    </QueryClientProvider>
  );
}

export default App;
