"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Gamepad2,
  Settings,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Home,
  LayoutDashboard,
  Goal,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";

const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
  // { href: "/admin/transactions", label: "Transactions", icon: DollarSign },
  // { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/matches", label: "Matches", icon: Goal },
  { href: "/admin/prize", label: "Prize Config", icon: Trophy },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [betsOpen, setBetsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div
        className={clsx(
          "lg:hidden fixed top-20 left-4 z-50 transition-transform duration-300",
          isOpen ? "translate-x-64" : "translate-x-0",
        )}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-background"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={clsx(
          "dark fixed left-0 top-0 h-screen w-64 bg-sidebar-background border-r border-sidebar-border shadow-lg transition-transform duration-300 z-40",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full pt-16">
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Bets expandable item */}
            <div>
              {(() => {
                const isParentActive = pathname?.startsWith("/admin/bets");
                return (
                  <div>
                    <div
                      role="button"
                      onClick={() => setBetsOpen(!betsOpen)}
                      className={clsx(
                        "flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer",
                        isParentActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5" />
                        <span className="font-medium">Bets</span>
                      </div>
                      <ChevronDown className={clsx("w-4 h-4 transition-transform", betsOpen && "rotate-180")} />
                    </div>

                    {betsOpen && (
                      <div className="mt-2 space-y-1">
                        <Link href="/admin/bets/lotto" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname === "/admin/bets/lotto"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Lotto</span>
                          </div>
                        </Link>

                        <Link href="/admin/bets/pools" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname === "/admin/bets/pools"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Pools</span>
                          </div>
                        </Link>

                        <Link href="/admin/bets/sports" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname === "/admin/bets/sports"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Sports</span>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Sales expandable item */}
            <div>
              {(() => {
                const isParentActive = pathname?.startsWith("/admin/sales");
                return (
                  <div>
                    <div
                      role="button"
                      onClick={() => setSalesOpen(!salesOpen)}
                      className={clsx(
                        "flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer",
                        isParentActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5" />
                        <span className="font-medium">Sales</span>
                      </div>
                      <ChevronDown
                        className={clsx(
                          "w-4 h-4 transition-transform",
                          salesOpen && "rotate-180"
                        )}
                      />
                    </div>

                    {salesOpen && (
                      <div className="mt-2 space-y-1">
                        <Link href="/admin/sales/lotto" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname === "/admin/sales/lotto"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Lotto</span>
                          </div>
                        </Link>

                        <Link href="/admin/sales/pools" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname === "/admin/sales/pools"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Pools</span>
                          </div>
                        </Link>

                        <Link href="/admin/sales/sports" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname === "/admin/sales/sports"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Sports</span>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Users expandable item */}
            <div>
              {(() => {
                const isParentActive =
                  pathname === "/admin/users" ||
                  pathname?.startsWith("/admin/staff") ||
                  pathname?.startsWith("/admin/agents") ||
                  pathname?.startsWith("/admin/terminals");

                return (
                  <div>
                    <div
                      role="button"
                      onClick={() => setUsersOpen(!usersOpen)}
                      className={clsx(
                        "flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer",
                        isParentActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" />
                        <span className="font-medium">Users</span>
                      </div>
                      <ChevronDown
                        className={clsx(
                          "w-4 h-4 transition-transform",
                          usersOpen && "rotate-180"
                        )}
                      />
                    </div>

                    {usersOpen && (
                      <div className="mt-2 space-y-1">
                        <Link href="/admin/users" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname === "/admin/users"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Online Players</span>
                          </div>
                        </Link>

                        <Link href="/admin/staff" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname?.startsWith("/admin/staff")
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Staff</span>
                          </div>
                        </Link>

                        <Link href="/admin/agents" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname?.startsWith("/admin/agents")
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Agents</span>
                          </div>
                        </Link>

                        <Link href="/admin/terminals" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname?.startsWith("/admin/terminals")
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Terminals</span>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                  <div
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <Link href="/">
              <Button variant="outline" className="w-full justify-start text-white" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Back to App
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive mt-2"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
