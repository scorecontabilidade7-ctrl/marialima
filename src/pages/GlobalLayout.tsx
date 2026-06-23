import { Outlet } from "react-router-dom";
import Sidebar from "@/components/dashboard/Sidebar";

export default function GlobalLayout() {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
