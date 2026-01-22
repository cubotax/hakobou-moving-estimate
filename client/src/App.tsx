import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import Step0 from "./pages/Step0";
import Step1 from "./pages/Step1";
import Step2 from "./pages/Step2";
import Result from "./pages/Result";
import LiffRedirect from "./pages/LiffRedirect";
import ApplyForm from "./pages/apply/ApplyForm";
import Confirm from "./pages/apply/Confirm";
import Complete from "./pages/apply/Complete";

// 管理画面
import AdminLogin from "./pages/admin/login";
import AdminDashboard from "./pages/admin/index";
import AdminEstimateDetail from "./pages/admin/estimates/[id]";
import AdminCoupons from "./pages/admin/coupons/index";
import AdminCouponDetail from "./pages/admin/coupons/[id]";
import AdminCouponEdit from "./pages/admin/coupons/edit";
import AdminPricingSettings from "./pages/admin/pricing-settings";

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
      {/* 見積もりフォーム */}
      <Route path="/" component={Step0} />
      <Route path="/step1" component={Step1} />
      <Route path="/step2" component={Step2} />
      <Route path="/result" component={Result} />
      <Route path="/apply" component={ApplyForm} />
      <Route path="/apply/confirm" component={Confirm} />
      <Route path="/apply/complete" component={Complete} />
      <Route path="/liff" component={LiffRedirect} />

      {/* 管理画面 */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/estimates/:id" component={AdminEstimateDetail} />
      <Route path="/admin/coupons/new" component={AdminCouponEdit} />
      <Route path="/admin/coupons/:id/edit" component={AdminCouponEdit} />
      <Route path="/admin/coupons/:id" component={AdminCouponDetail} />
      <Route path="/admin/coupons" component={AdminCoupons} />
      <Route path="/admin/pricing-settings" component={AdminPricingSettings} />
      <Route path="/admin" component={AdminDashboard} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AdminAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AdminAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

