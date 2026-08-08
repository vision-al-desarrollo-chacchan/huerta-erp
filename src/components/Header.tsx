import React from 'react';
import { Search, Bell, MessageSquare, Calendar, Moon, Sun } from 'lucide-react';

import { useTheme } from "../context/ThemeContext";

const Header: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  return (
    <header className="h-16 bg-white dark:bg-brand-surfaceDark border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm transition-colors w-full">
      
      {/* Selectores Multi-Tenant */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Empresa</span>
          <select className="bg-transparent text-sm font-semibold text-brand-dark dark:text-white focus:outline-none cursor-pointer border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            <option>Huerta Group S.A.C.</option>
          </select>
        </div>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Sucursal</span>
          <select className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
            <option>Principal - Lima</option>
          </select>
        </div>
      </div>

      {/* Utilidades y Perfil */}
      <div className="flex items-center gap-5 ml-auto">
        <div className="relative hidden lg:block">
          <input 
            type="text" 
            placeholder="Buscar (Ctrl+K)" 
            className="w-64 pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/50 outline-none dark:text-white transition-all" 
          />
          <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
        </div>
        
        <div className="flex items-center gap-3 border-r border-slate-200 dark:border-slate-700 pr-5">
          <button onClick={toggleDarkMode} className="p-2 text-slate-500 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className="relative p-2 text-slate-500 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:block">
            <MessageSquare className="w-5 h-5" />
          </button>
          <button className="relative p-2 text-slate-500 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:block">
            <Calendar className="w-5 h-5" />
          </button>
          <button className="relative p-2 text-slate-500 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-brand-surfaceDark">4</span>
          </button>
        </div>

        {/* Perfil del Usuario */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Admin</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Online</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-md">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;