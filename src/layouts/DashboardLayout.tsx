import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">

      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        <Header />

        <main className="flex-1 overflow-y-auto content-scroll">
          <Outlet />
        </main>

      </div>

    </div>
  );
}
