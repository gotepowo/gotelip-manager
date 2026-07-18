import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  HashRouter as Router,
  Route,
  Routes,
} from "react-router-dom";

import ScrollToTop from "./components/ScrollToTop";
import AppLayout from "./components/layout/AppLayout";
import PageNotFound from "./lib/PageNotFound";

import Dashboard from "./pages/Dashboard";
import ServiceOrders from "./pages/ServiceOrders";
import Clients from "./pages/Clients";
import Finances from "./pages/Finances";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />

        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/atendimentos" element={<ServiceOrders />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/financas" element={<Finances />} />
            <Route path="/notas-fiscais" element={<Invoices />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>

      <Toaster />
    </QueryClientProvider>
  );
}

export default App;