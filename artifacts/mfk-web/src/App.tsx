import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import NotFound from "@/pages/not-found";

// Public Pages
import Home from "@/pages/home";
import Pricing from "@/pages/pricing";
import Auth from "@/pages/auth";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Onboarding from "@/pages/onboarding";
import Checkout from "@/pages/checkout";
import CheckoutPlan from "@/pages/checkout-plan";
import CheckoutPayment from "@/pages/checkout-payment";
import CheckoutResult from "@/pages/checkout-result";
import Payment from "@/pages/payment";
import PaymentResult from "@/pages/payment-result";
import OrderDetail from "@/pages/order-detail";
import DeviceActivation from "@/pages/device-activation";
import FleetContact from "@/pages/fleet-contact";
import FleetSetup from "@/pages/fleet-setup";

// Company Pages
import About from "@/pages/about";
import Careers from "@/pages/careers";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import Contact from "@/pages/contact";
import Help from "@/pages/help";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Refunds from "@/pages/refunds";

// App Pages
import Dashboard from "@/pages/app/dashboard";
import Vehicles from "@/pages/app/vehicles";
import VehicleDetail from "@/pages/app/vehicle-detail";
import Diagnostics from "@/pages/app/diagnostics";
import DiagnosticSession from "@/pages/app/diagnostic-session";
import Dtc from "@/pages/app/dtc";
import Maintenance from "@/pages/app/maintenance";
import Assistant from "@/pages/app/assistant";
import Recommendations from "@/pages/app/recommendations";
import Subscription from "@/pages/app/subscription";
import FuelPage from "@/pages/app/fuel";
import ProfilePage from "@/pages/app/profile";
import DevicePending from "@/pages/app/device-pending";
import AppDeviceActivate from "@/pages/app/device-activate";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminVehicles from "@/pages/admin/vehicles";
import AdminDiagnostics from "@/pages/admin/diagnostics";
import AdminIssues from "@/pages/admin/issues";
import AdminRevenue from "@/pages/admin/revenue";
import AdminOrders from "@/pages/admin/orders";
import AdminOrderDetail from "@/pages/admin/order-detail";
import AdminDevices from "@/pages/admin/devices";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminFleetAccounts from "@/pages/admin/fleet-accounts";
import AdminReports from "@/pages/admin/reports";
import AdminSettings from "@/pages/admin/settings";

import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Shell>
      <Switch>
        <Route path="/app" component={Dashboard} />
        <Route path="/app/dashboard" component={Dashboard} />
        <Route path="/app/vehicles" component={Vehicles} />
        <Route path="/app/vehicles/:id" component={VehicleDetail} />
        <Route path="/app/diagnostics" component={Diagnostics} />
        <Route path="/app/diagnostics/:sessionId" component={DiagnosticSession} />
        <Route path="/app/dtc" component={Dtc} />
        <Route path="/app/maintenance" component={Maintenance} />
        <Route path="/app/assistant" component={Assistant} />
        <Route path="/app/recommendations" component={Recommendations} />
        <Route path="/app/profile" component={ProfilePage} />
        <Route path="/app/subscription" component={Subscription} />
        <Route path="/app/device/pending" component={DevicePending} />
        <Route path="/app/device/activate" component={AppDeviceActivate} />
        <Route path="/app/fuel" component={FuelPage} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function AdminRoutes() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(`/login?next=${encodeURIComponent(location)}`);
    }
  }, [isLoading, location, setLocation, user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
        <div className="text-sm text-muted-foreground">جاري التحقق من الصلاحية...</div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              !
            </div>
            <div>
              <h1 className="text-2xl font-black">صلاحية الأدمن مطلوبة</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                هذا المسار مخصص لحسابات الإدارة فقط.
              </p>
            </div>
            <Button className="w-full" onClick={() => setLocation("/app")}>
              العودة للتطبيق
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Shell isAdmin>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/vehicles" component={AdminVehicles} />
        <Route path="/admin/diagnostics" component={AdminDiagnostics} />
        <Route path="/admin/issues" component={AdminIssues} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/orders/:orderId" component={AdminOrderDetail} />
        <Route path="/admin/devices" component={AdminDevices} />
        <Route path="/admin/subscriptions" component={AdminSubscriptions} />
        <Route path="/admin/fleet-accounts" component={AdminFleetAccounts} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/revenue" component={AdminRevenue} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function AnimatedSwitch() {
  const [location] = useLocation();

  const pageKey = location.startsWith("/app")
    ? "app"
    : location.startsWith("/admin")
      ? "admin"
      : location.split("?")[0];

  useEffect(() => {
    const pendingScrollTarget = window.sessionStorage.getItem(
      "mfk-pending-scroll-target",
    );

    if (pendingScrollTarget) return;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pageKey]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/plans" component={Pricing} />
          <Route path="/auth" component={Auth} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/checkout/plan" component={CheckoutPlan} />
          <Route path="/checkout/payment" component={CheckoutPayment} />
          <Route path="/checkout/result" component={CheckoutResult} />
          <Route path="/checkout/:planId" component={Checkout} />
          <Route path="/payment/:orderId" component={Payment} />
          <Route path="/payment-result" component={PaymentResult} />
          <Route path="/orders/:orderId" component={OrderDetail} />
          <Route path="/device-activation" component={DeviceActivation} />
          <Route path="/fleet-contact" component={FleetContact} />
          <Route path="/fleet/setup" component={FleetSetup} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/about" component={About} />
          <Route path="/careers" component={Careers} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
          <Route path="/contact" component={Contact} />
          <Route path="/help" component={Help} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/refunds" component={Refunds} />
          <Route path="/app" component={AppRoutes} />
          <Route path="/app/*?" component={AppRoutes} />
          <Route path="/admin" component={AdminRoutes} />
          <Route path="/admin/*?" component={AdminRoutes} />
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function Router() {
  return <AnimatedSwitch />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
