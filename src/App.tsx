import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pipeline from "./pages/Pipeline";
import Targets from "./pages/Targets";
import Team from "./pages/Team";
import AccountingDashboard from "./pages/AccountingDashboard";
import ProjectDashboard from "./pages/ProjectDashboard";
import HelpdeskDashboard from "./pages/HelpdeskDashboard";
import Calculator from "./pages/Calculator";
import Settings from "./pages/Settings";
import JobCosting from "./pages/JobCosting";
import JobCostingDetail from "./pages/JobCostingDetail";
import JobCostingReports from "./pages/JobCostingReports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <FilterProvider>
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
              <Route path="/targets" element={<ProtectedRoute><Targets /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
              <Route path="/accounting" element={<ProtectedRoute><AccountingDashboard /></ProtectedRoute>} />
              <Route path="/project" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
              <Route path="/helpdesk" element={<ProtectedRoute><HelpdeskDashboard /></ProtectedRoute>} />
              <Route path="/job-costing" element={<ProtectedRoute><JobCosting /></ProtectedRoute>} />
              <Route path="/job-costing/reports" element={<ProtectedRoute><JobCostingReports /></ProtectedRoute>} />
              <Route path="/job-costing/:id" element={<ProtectedRoute><JobCostingDetail /></ProtectedRoute>} />
              <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </FilterProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
