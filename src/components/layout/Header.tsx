import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, HelpCircle, LayoutDashboard, GitBranch } from 'lucide-react';
import { APP_VERSION } from '../../version';
import { getBackendDisplayHost } from '../../services/apiClient';

export const Header: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Bandeja de Preguntas', path: '/questions', icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2.5">
            <img
              src="/favicon.png"
              alt="NP Factory"
              className="h-9 w-9 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shadow-sm"
            />
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 leading-tight">NP Factory</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wide">CORE MANAGER v{APP_VERSION}</span>
            </div>
          </Link>

          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{getBackendDisplayHost()}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
