import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Welcome from "./pages/Welcome.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import GoalsManagement from "./pages/admin/GoalsManagement.tsx";
import UsersManagement from "./pages/admin/UsersManagement.tsx";
import PermissionsManagement from "./pages/admin/PermissionsManagement.tsx";
import SellerProfile from "./pages/SellerProfile.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index store="sobral" />} />
          <Route path="/itapipoca" element={<Index store="itapipoca" />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="metas" element={<GoalsManagement />} />
            <Route path="usuarios" element={<UsersManagement />} />
            <Route path="permissoes" element={<PermissionsManagement />} />
          </Route>
          <Route path="/vendedor/:name" element={<SellerProfile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
