import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DateSelect from "./pages/DateSelect";
import AddressInput from "./pages/AddressInput";
import ConditionInput from "./pages/ConditionInput";
import Result from "./pages/Result";

/**
 * 引越し見積もりフォーム アプリケーション
 * 
 * 4ステップ構成:
 * Step1: 日程選択（集荷日・お届け日）
 * Step2: 住所入力（集荷先・お届け先）
 * Step3: 条件入力（階数、エレベーター、オプション）
 * Step4: 見積結果
 */

function Router() {
  return (
    <Switch>
      <Route path="/" component={DateSelect} />
      <Route path="/address" component={AddressInput} />
      <Route path="/condition" component={ConditionInput} />
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
