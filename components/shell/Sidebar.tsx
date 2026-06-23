"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "./nav";
import { NAV_ICONS, RisexMark } from "./icons";

function isActive(pathname: string, href: string): boolean {
  if (href === "/wallets") return pathname.startsWith("/wallets");
  return pathname === href || pathname.startsWith(href + "/");
}

const STORE_KEY = "risex:sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname() || "/wallets";
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const groups: Array<"ANALYTICS" | "MARKET"> = ["ANALYTICS", "MARKET"];

  return (
    <aside
      className="sticky top-0 flex h-screen flex-none flex-col border-r border-border-subtle bg-[#0A0C0F] transition-[width] duration-200 ease-out"
      style={{ width: collapsed ? 68 : 236 }}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 border-b border-border-subtle pt-[18px] pb-4">
          <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] bg-[#10141A]">
            <RisexMark />
          </div>
          <CollapseToggle collapsed={collapsed} onClick={toggle} />
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-border-subtle px-5 pt-[18px] pb-4">
          <div className="flex flex-col gap-[4px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/risex-typeface-on-dark.png"
              alt="RISEx"
              height={22}
              style={{ height: 22, width: "auto" }}
            />
            <span className="pl-[2px] text-[10px] font-semibold tracking-[0.18em] text-fg-faint">
              TRACKER
            </span>
          </div>
          <CollapseToggle collapsed={collapsed} onClick={toggle} />
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-[2px] p-3 pt-[14px]">
        {groups.map((group) => (
          <div key={group} className="flex flex-col gap-[2px]">
            {!collapsed ? (
              <span className="px-3 pt-[14px] pb-[6px] text-[10px] font-semibold tracking-[0.12em] text-fg-faint first:pt-[6px]">
                {group}
              </span>
            ) : (
              <div className="pt-[10px] first:pt-0" />
            )}
            {NAV.filter((n) => n.group === group).map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = NAV_ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "flex items-center rounded-md border-l-2 py-[9px] text-[13px] font-semibold transition-colors",
                    collapsed ? "justify-center px-0" : "gap-[11px] pr-3",
                    active
                      ? "border-brand bg-bg-hover text-fg"
                      : "border-transparent text-fg-muted hover:bg-bg-hover hover:text-fg",
                    collapsed ? "" : active ? "pl-[10px]" : "pl-3",
                  ].join(" ")}
                >
                  <span className={active ? "text-brand" : ""}>
                    <Icon />
                  </span>
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

    </aside>
  );
}

function CollapseToggle({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-bg-hover hover:text-fg"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {collapsed ? (
          <path d="M13 18l6-6-6-6M6 18l6-6-6-6" />
        ) : (
          <path d="M11 18l-6-6 6-6M18 18l-6-6 6-6" />
        )}
      </svg>
    </button>
  );
}
