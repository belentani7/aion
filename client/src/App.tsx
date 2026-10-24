import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
const ComponentShowcase = lazy(() => import("@/pages/ComponentShowcase"));
const ValidationCenter = lazy(() => import("@/pages/ValidationCenter"));
import { I18nProvider } from "./contexts/I18nContext";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/components"} component={ComponentShowcase} />
      <Route path={"/validation"} component={ValidationCenter} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<main role="status" className="p-6">Loading Aion…</main>}><Router /></Suspense>
        </TooltipProvider>
      </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
