import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
              <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </FilterProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
