import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Step1 from "./pages/Step1";
import Step2 from "./pages/Step2";
import Result from "./pages/Result";

/**
 * 引越し見積もりフォーム アプリケーション
 * 
 * Design Philosophy: 和モダン・ミニマリズム
 * - 藍色をプライマリカラーに
 * - 生成り色の温かみのある背景
 * - 余白を活かした静謐で上品なUI
 */

function Router() {
  return (
    <Switch>
      <Route path="/" component={Step1} />
      <Route path="/step2" component={Step2} />
      <Route path="/result" component={Result} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
