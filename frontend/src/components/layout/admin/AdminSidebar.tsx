"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  FaShieldAlt,
  FaChartLine,
  FaFileAlt,
  FaUsers,
  FaUniversity,
  FaUserCog,
  FaSignOutAlt,
  FaTimes,
  FaLayerGroup,
  FaChevronDown,
  FaFileContract,
  FaBriefcase,
  FaMapMarkedAlt,
  FaHandHoldingUsd,
  FaCalendarAlt,
  FaUserShield,
  FaCog,
  FaEnvelope,
} from "react-icons/fa";

type Props = {
  adminName: string;
  handleLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
};

const navItems = [
  { icon: FaChartLine, label: "Dashboard", href: "/admin/dashboard" },
  { icon: FaFileAlt, label: "Applications", href: "/admin/applications" },
  { icon: FaUsers, label: "Users", href: "/admin/users" },
  { icon: FaUniversity, label: "Banks", href: "/admin/banks" },
  { icon: FaUserCog, label: "My Profile", href: "/admin/profile" },
];

const serviceModuleItems = [
  { icon: FaFileContract, label: "Manage Documents", href: "/admin/service-module/documents" },
  { icon: FaBriefcase, label: "Employment Type", href: "/admin/service-module/employment-type" },
  { icon: FaMapMarkedAlt, label: "State", href: "/admin/service-module/state" },
  { icon: FaHandHoldingUsd, label: "Loan Service", href: "/admin/service-module/loan-service" },
  { icon: FaCalendarAlt, label: "Loan Tenure", href: "/admin/service-module/loan-tenure" },
  { icon: FaUserShield, label: "Roles", href: "/admin/service-module/role" },
];

const settingsItems = [
  {
    icon: FaEnvelope,
    label: "SMTP Settings",
    href: "/admin/settings/smtp",
  },
];

export default function AdminSidebar({
  adminName,
  handleLogout,
  isOpen,
  onClose,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const isServiceModuleRoute = pathname?.startsWith("/admin/service-module");
    const isSettingsRoute = pathname?.startsWith("/admin/settings");

  const [serviceModuleOpen, setServiceModuleOpen] = useState(isServiceModuleRoute ?? false);
  const [settingsOpen, setSettingsOpen] = useState(
  isSettingsRoute ?? false
);



  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen w-64 bg-[#1e3a5f] flex flex-col z-50
      transition-transform duration-300 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <FaShieldAlt size={15} color="#fff" />
        </div>
        <span className="text-white font-extrabold text-base">SN Finance</span>
        <button
          onClick={onClose}
          className="ml-auto text-white/70 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <FaTimes size={16} />
        </button>
      </div>

      {/* Badge */}
      <div className="flex items-center gap-2 mx-4 mt-4 px-3 py-2 rounded-lg bg-white/5 shrink-0">
        <FaShieldAlt size={13} className="text-amber-400" />
        <span className="text-[12px] font-semibold text-white/80">Admin Panel</span>
      </div>

      {/* Navigation */}
     {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 mt-4 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left
              ${active ? "bg-white text-[#1e3a5f]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              <item.icon size={15} className={active ? "text-[#1e3a5f]" : "text-white/60"} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Service Module — expandable */}
        <div>
          <button
            onClick={() => setServiceModuleOpen((prev) => !prev)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left
            ${isServiceModuleRoute ? "bg-white text-[#1e3a5f]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
          >
            <FaLayerGroup size={15} className={isServiceModuleRoute ? "text-[#1e3a5f]" : "text-white/60"} />
            <span className="flex-1"> Manage Services</span>
            <FaChevronDown
              size={11}
              className={`transition-transform duration-200 ${serviceModuleOpen ? "rotate-180" : ""} ${isServiceModuleRoute ? "text-[#1e3a5f]" : "text-white/50"}`}
            />
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${serviceModuleOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"}`}
          >
            <div className="flex flex-col gap-1 pl-3 border-l border-white/10 ml-4">
              {serviceModuleItems.map((sub) => {
                const active = pathname === sub.href;
                return (
                  <button
                    key={sub.href}
                    onClick={() => go(sub.href)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left
                    ${active ? "bg-white text-[#1e3a5f]" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                  >
                    <sub.icon size={13} className={active ? "text-[#1e3a5f]" : "text-white/45"} />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Settings Module */}
<div>
  <button
    onClick={() => setSettingsOpen((prev) => !prev)}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left
    ${
      isSettingsRoute
        ? "bg-white text-[#1e3a5f]"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`}
  >
    <FaCog
      size={15}
      className={
        isSettingsRoute ? "text-[#1e3a5f]" : "text-white/60"
      }
    />

    <span className="flex-1">Settings</span>

    <FaChevronDown
      size={11}
      className={`transition-transform duration-200 ${
        settingsOpen ? "rotate-180" : ""
      } ${
        isSettingsRoute ? "text-[#1e3a5f]" : "text-white/50"
      }`}
    />
  </button>

  <div
    className={`overflow-hidden transition-all duration-300 ease-in-out ${
      settingsOpen
        ? "max-h-96 opacity-100 mt-1"
        : "max-h-0 opacity-0"
    }`}
  >
    <div className="flex flex-col gap-1 pl-3 border-l border-white/10 ml-4">
      {settingsItems.map((sub) => {
        const active = pathname === sub.href;

        return (
          <button
            key={sub.href}
            onClick={() => go(sub.href)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left
            ${
              active
                ? "bg-white text-[#1e3a5f]"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            <sub.icon
              size={13}
              className={
                active ? "text-[#1e3a5f]" : "text-white/45"
              }
            />

            <span>{sub.label}</span>
          </button>
        );
      })}
    </div>
  </div>
</div>
      </nav>

      {/* Bottom user */}
      <div
        className="flex items-center gap-2.5 mx-3 mb-2 px-3 py-2.5 rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
        onClick={() => go("/admin/profile")}
      >
        <div className="w-8 h-8 rounded-full bg-amber-400 text-[#1e3a5f] font-bold flex items-center justify-center text-sm shrink-0">
          {adminName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-white text-sm font-semibold truncate">{adminName}</div>
          <div className="text-white/50 text-xs">Administrator</div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2.5 mx-3 mb-4 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-300 hover:bg-red-500/10 shrink-0"
      >
        <FaSignOutAlt size={13} />
        <span>Logout</span>
      </button>
    </aside>
  );
}