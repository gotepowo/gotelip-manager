import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        className={`transition-all duration-300 ease-in-out min-h-screen ${
          collapsed ? "ml-[72px]" : "ml-[240px]"
        }`}
      >
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b px-6 lg:px-8 py-2.5">
          <GlobalSearch />
        </div>
        <div className="p-6 lg:p-8 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}