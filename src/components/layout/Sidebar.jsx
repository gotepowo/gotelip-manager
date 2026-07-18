import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  DollarSign, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  Smartphone,
  FileText,
  Settings as SettingsIcon
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/atendimentos", label: "Atendimentos", icon: Wrench },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/financas", label: "Finanças", icon: DollarSign },
  { path: "/notas-fiscais", label: "Notas Fiscais", icon: FileText },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { path: "/configuracoes", label: "Configurações", icon: SettingsIcon },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 transition-all duration-300 ease-in-out ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-white truncate">Gotelip</h1>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">Assistência</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "" : "group-hover:scale-110 transition-transform"}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 py-4 border-t border-sidebar-border shrink-0">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all w-full"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span className="truncate">Recolher menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}