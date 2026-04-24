import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Public Pages
import Home from "@/pages/home";
import Pricing from "@/pages/pricing";
import WorkshopsPublic from "@/pages/workshops";
import WorkshopDetailPublic from "@/pages/workshop-detail";
import Login from "@/pages/login";

// App Pages
import Dashboard from "@/pages/app/dashboard";
import Vehicles from "@/pages/app/vehicles";
import VehicleDetail from "@/pages/app/vehicle-detail";
import Diagnostics from "@/pages/app/diagnostics";
import DiagnosticSession from "@/pages/app/diagnostic-session";
import Dtc from "@/pages/app/dtc";
import Maintenance from "@/pages/app/maintenance";
import WorkshopsApp from "@/pages/app/workshops-app";
import Bookings from "@/pages/app/bookings";
import Assistant from "@/pages/app/assistant";
import Recommendations from "@/pages/app/recommendations";
import Subscription from "@/pages/app/subscription";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminVehicles from "@/pages/admin/vehicles";
import AdminDiagnostics from "@/pages/admin/diagnostics";
import AdminIssues from "@/pages/admin/issues";
import AdminWorkshops from "@/pages/admin/workshops";
import AdminRevenue from "@/pages/admin/revenue";

import { Shell } from "@/components/layout/Shell";

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
        <Route path="/app/workshops" component={WorkshopsApp} />
        <Route path="/app/bookings" component={Bookings} />
        <Route path="/app/assistant" component={Assistant} />
        <Route path="/app/recommendations" component={Recommendations} />
        <Route path="/app/subscription" component={Subscription} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function AdminRoutes() {
  return (
    <Shell isAdmin>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/vehicles" component={AdminVehicles} />
        <Route path="/admin/diagnostics" component={AdminDiagnostics} />
        <Route path="/admin/issues" component={AdminIssues} />
        <Route path="/admin/workshops" component={AdminWorkshops} />
        <Route path="/admin/revenue" component={AdminRevenue} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/workshops" component={WorkshopsPublic} />
      <Route path="/workshops/:id" component={WorkshopDetailPublic} />
      <Route path="/login" component={Login} />
      <Route path="/app" component={AppRoutes} />
      <Route path="/app/*?" component={AppRoutes} />
      <Route path="/admin" component={AdminRoutes} />
      <Route path="/admin/*?" component={AdminRoutes} />
      <Route component={NotFound} />
    </Switch>
  );
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
