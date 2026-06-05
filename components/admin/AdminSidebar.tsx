"use client";

import { type MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Gamepad2,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Home,
  LayoutDashboard,
  Goal,
  Trophy,
  Monitor,
  HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";
import useAdminRole from "@/hooks/use-admin-role";

const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  // { href: "/admin/transactions", label: "Transactions", icon: DollarSign },
  // { href: "/admin/reports", label: "Reports", icon: FileText },
  // { href: "/admin/matches", label: "Matches", icon: Goal },
  { href: "/admin/prize", label: "Prize Config", icon: Trophy },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [betsOpen, setBetsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const pathname = usePathname();
  const { roleInfo } = useAdminRole();
  const isAdmin = roleInfo?.role === "admin";
  const isStaff = roleInfo?.role === "staff";
  const isAgent = roleInfo?.role === "agent";

  const setHoverPopup = (item: string, event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredItem(item);
    setPopupPosition({
      left: 4,
      top: Math.floor(rect.top),
    });
  };
  const router = useRouter();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--admin-sidebar-width",
      isCollapsed ? "4rem" : "16rem"
    );
  }, [isCollapsed]);

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

      {/* Desktop collapse toggle */}
      <div
        className="dark hidden lg:block fixed top-17 z-50 transition-all duration-300"
        style={{ left: isCollapsed ? "4.15rem" : "16.15rem" }}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-background text-foreground"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={clsx(
          "dark fixed left-0 top-0 h-screen bg-sidebar-background border-r border-sidebar-border shadow-lg transition-all duration-300 z-40",
          isCollapsed ? "w-16" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full pt-16">
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Bets expandable item */}
            <div
              className="relative group"
              onMouseEnter={(event) => setHoverPopup('bets', event)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {(() => {
                const isParentActive = pathname?.startsWith("/admin/bets");
                return (
                  <div>
                    <div
                      role="button"
                      onClick={() => setBetsOpen(!betsOpen)}
                      className={clsx(
                        "flex items-center justify-between gap-3 rounded-lg transition-colors cursor-pointer",
                        isCollapsed ? "justify-center px-0 py-3" : "px-4 py-3",
                        isParentActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <div className={clsx("flex items-center gap-3", isCollapsed && "justify-center")}
                      >
                        <BarChart3 className="w-5 h-5" />
                        {!isCollapsed && <span className="font-medium">Bets</span>}
                      </div>
                      {!isCollapsed && (
                        <ChevronDown className={clsx("w-4 h-4 transition-transform", betsOpen && "rotate-180")} />
                      )}
                    </div>

                    {betsOpen && !isCollapsed && (
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

                        <Link href="/admin/bets/sports-draw" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname === "/admin/bets/sports-draw"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Football Pool</span>
                          </div>
                        </Link>

                        {isAdmin && (
                          <Link href="/admin/bets/void" onClick={() => setIsOpen(false)}>
                            <div
                              className={clsx(
                                "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                                pathname === "/admin/bets/void"
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                              )}
                            >
                              <span>Deleted Bets</span>
                            </div>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Sales expandable item */}
            <div
              className="relative group"
              onMouseEnter={(event) => setHoverPopup('sales', event)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {(() => {
                const isParentActive = pathname?.startsWith("/admin/sales");
                return (
                  <div>
                    <div
                      role="button"
                      onClick={() => setSalesOpen(!salesOpen)}
                      className={clsx(
                        "flex items-center justify-between gap-3 rounded-lg transition-colors cursor-pointer",
                        isCollapsed ? "justify-center px-0 py-3" : "px-4 py-3",
                        isParentActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <div className={clsx("flex items-center gap-3", isCollapsed && "justify-center")}
                      >
                        <BarChart3 className="w-5 h-5" />
                        {!isCollapsed && <span className="font-medium">Sales</span>}
                      </div>
                      {!isCollapsed && (
                        <ChevronDown
                          className={clsx(
                            "w-4 h-4 transition-transform",
                            salesOpen && "rotate-180"
                          )}
                        />
                      )}
                    </div>

                    {salesOpen && !isCollapsed && (
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
                        <Link href="/admin/sales/sports-draw" onClick={() => setIsOpen(false)}>
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-10 py-2 rounded-lg transition-colors text-sm",
                              pathname === "/admin/sales/sports-draw"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <span>Football Pool</span>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Users expandable item */}
            <div
              className="relative group"
              onMouseEnter={(event) => setHoverPopup('users', event)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {(() => {
                const isParentActive =
                  pathname === "/admin/users" ||
                  pathname?.startsWith("/admin/staff") ||
                  pathname?.startsWith("/admin/agents");

                return (
                  <div>
                    <div
                      role="button"
                      onClick={() => setUsersOpen(!usersOpen)}
                      className={clsx(
                        "flex items-center justify-between gap-3 rounded-lg transition-colors cursor-pointer",
                        isCollapsed ? "justify-center px-0 py-3" : "px-4 py-3",
                        isParentActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <div className={clsx("flex items-center gap-3", isCollapsed && "justify-center")}
                      >
                        <Users className="w-5 h-5" />
                        {!isCollapsed && <span className="font-medium">Users</span>}
                      </div>
                      {!isCollapsed && (
                        <ChevronDown
                          className={clsx(
                            "w-4 h-4 transition-transform",
                            usersOpen && "rotate-180"
                          )}
                        />
                      )}
                    </div>

                    {usersOpen && !isCollapsed && (
                      <div className="mt-2 space-y-1">
                        {isAdmin && (
                          <>
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
                          </>
                        )}
                        {(isStaff || isAdmin) && (
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
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {isAdmin && (
              <div
                className="relative group"
                onMouseEnter={(event) => setHoverPopup("games", event)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link href="/admin/games" onClick={() => setIsOpen(false)}>
                  <div
                    className={clsx(
                      "flex items-center gap-3 rounded-lg transition-colors",
                      isCollapsed ? "justify-center px-0 py-3" : "px-4 py-3",
                      pathname === "/admin/games"
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Gamepad2 className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium">Games</span>}
                  </div>
                </Link>
              </div>
            )}

            {isAdmin && (
              <div
                className="relative group"
                onMouseEnter={(event) => setHoverPopup("terminals", event)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link href="/admin/terminals" onClick={() => setIsOpen(false)}>
                  <div
                    className={clsx(
                      "flex items-center gap-3 rounded-lg transition-colors",
                      isCollapsed ? "justify-center px-0 py-3" : "px-4 py-3",
                      pathname?.startsWith("/admin/terminals")
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Monitor className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium">Terminals</span>}
                  </div>
                </Link>
              </div>
            )}

            {isAdmin && (
              <div
                className="relative group"
                onMouseEnter={(event) => setHoverPopup("manual-funding", event)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link href="/admin/manual-funding" onClick={() => setIsOpen(false)}>
                  <div
                    className={clsx(
                      "flex items-center gap-3 rounded-lg transition-colors",
                      isCollapsed ? "justify-center px-0 py-3" : "px-4 py-3",
                      pathname?.startsWith("/admin/manual-funding")
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <HandCoins className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium">Online Manual Funding</span>}
                  </div>
                </Link>
              </div>
            )}

            {isAdmin && adminMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <div
                  key={item.href}
                  className="relative group"
                  onMouseEnter={(event) => setHoverPopup(item.href, event)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link href={item.href} onClick={() => setIsOpen(false)}>
                    <div
                      className={clsx(
                        "flex items-center gap-3 rounded-lg transition-colors",
                        isCollapsed ? "justify-center px-0 py-3" : "px-4 py-3",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </div>
                  </Link>

                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <Link href="/">
              <Button
                variant="outline"
                className={clsx(
                  "w-full text-white",
                  isCollapsed ? "justify-center" : "justify-start"
                )}
                size="sm"
              >
                <Home className={clsx("w-4 h-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && "Back to App"}
              </Button>
            </Link>
            <Button
              variant="outline"
              className={clsx(
                "w-full text-destructive hover:text-destructive mt-2",
                isCollapsed ? "justify-center" : "justify-start"
              )}
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className={clsx("w-4 h-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && "Logout"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Global popups for collapsed sidebar */}
      <div className="dark">
        {hoveredItem === 'bets' && isCollapsed && (
          <div
            className="fixed z-60 w-56 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-background shadow-lg"
            style={{ left: `${popupPosition.left}px`, top: `${popupPosition.top}px` }}
            onMouseEnter={() => setHoveredItem('bets')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div
              className={clsx(
                "flex items-center gap-3 px-4 py-3",
                pathname?.startsWith("/admin/bets") ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
              )}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Bets</span>
            </div>
            <div className="space-y-1 p-2 pl-10">
              <Link href="/admin/bets/lotto" onClick={() => setIsOpen(false)}>
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm transition-colors",
                    pathname === "/admin/bets/lotto"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  Lotto
                </div>
              </Link>
              <Link href="/admin/bets/pools" onClick={() => setIsOpen(false)}>
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm transition-colors",
                    pathname === "/admin/bets/pools"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  Pools
                </div>
              </Link>
              <Link href="/admin/bets/sports" onClick={() => setIsOpen(false)}>
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm transition-colors",
                    pathname === "/admin/bets/sports"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  Sports
                </div>
              </Link>
              <Link href="/admin/bets/sports-draw" onClick={() => setIsOpen(false)}>
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm transition-colors",
                    pathname === "/admin/bets/sports-draw"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  Football Pool
                </div>
              </Link>
              {isAdmin && (
                <Link href="/admin/bets/void" onClick={() => setIsOpen(false)}>
                  <div
                    className={clsx(
                      "rounded-lg px-4 py-2 text-sm transition-colors",
                      pathname === "/admin/bets/void"
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    Deleted Bets
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {hoveredItem === 'sales' && isCollapsed && (
          <div
            className="fixed z-60 w-56 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-background shadow-lg"
            style={{ left: `${popupPosition.left}px`, top: `${popupPosition.top}px` }}
            onMouseEnter={() => setHoveredItem('sales')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div
              className={clsx(
                "flex items-center gap-3 px-4 py-3",
                pathname?.startsWith("/admin/sales") ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
              )}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Sales</span>
            </div>
            <div className="space-y-1 p-2 pl-10">
              <Link href="/admin/sales/lotto" onClick={() => setIsOpen(false)}>
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm transition-colors",
                    pathname === "/admin/sales/lotto"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  Lotto
                </div>
              </Link>
              <Link href="/admin/sales/pools" onClick={() => setIsOpen(false)}>
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm transition-colors",
                    pathname === "/admin/sales/pools"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  Pools
                </div>
              </Link>
              <Link href="/admin/sales/sports" onClick={() => setIsOpen(false)}>
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm transition-colors",
                    pathname === "/admin/sales/sports"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  Sports
                </div>
              </Link>
              <Link href="/admin/sales/sports-draw" onClick={() => setIsOpen(false)}>
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm transition-colors",
                    pathname === "/admin/sales/sports-draw"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  Football Pool
                </div>
              </Link>
            </div>
          </div>
        )}

        {hoveredItem === 'users' && isCollapsed && (
          <div
            className="fixed z-60 w-56 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-background shadow-lg"
            style={{ left: `${popupPosition.left}px`, top: `${popupPosition.top}px` }}
            onMouseEnter={() => setHoveredItem('users')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div
              className={clsx(
                "flex items-center gap-3 px-4 py-3",
                (pathname === "/admin/users" ||
                  pathname?.startsWith("/admin/staff") ||
                  pathname?.startsWith("/admin/agents"))
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground"
              )}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Users</span>
            </div>
            <div className="space-y-1 p-2 pl-10">
              <Link href="/admin/users" onClick={() => setIsOpen(false)}>
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm transition-colors",
                    pathname === "/admin/users"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  Online Players
                </div>
              </Link>
              {isAdmin && (
                <>
                  <Link href="/admin/staff" onClick={() => setIsOpen(false)}>
                    <div
                      className={clsx(
                        "rounded-lg px-4 py-2 text-sm transition-colors",
                        pathname?.startsWith("/admin/staff")
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      Staff
                    </div>
                  </Link>
                  <Link href="/admin/agents" onClick={() => setIsOpen(false)}>
                    <div
                      className={clsx(
                        "rounded-lg px-4 py-2 text-sm transition-colors",
                        pathname?.startsWith("/admin/agents")
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      Agents
                    </div>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {hoveredItem === "games" && isCollapsed && isAdmin && (
          <Link
            href="/admin/games"
            className="fixed z-60 w-56 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-background shadow-lg"
            style={{ left: popupPosition.left, top: popupPosition.top }}
            onMouseEnter={() => setHoveredItem("games")}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => setIsOpen(false)}
          >
            <div
              className={clsx(
                "flex items-center gap-3 px-4 py-3",
                pathname === "/admin/games"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground"
              )}
            >
              <Gamepad2 className="w-5 h-5" />
              <span className="font-medium">Games</span>
            </div>
          </Link>
        )}

        {hoveredItem === "terminals" && isCollapsed && isAdmin && (
          <Link
            href="/admin/terminals"
            className="fixed z-60 w-56 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-background shadow-lg"
            style={{ left: popupPosition.left, top: popupPosition.top }}
            onMouseEnter={() => setHoveredItem("terminals")}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => setIsOpen(false)}
          >
            <div
              className={clsx(
                "flex items-center gap-3 px-4 py-3",
                pathname?.startsWith("/admin/terminals")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground"
              )}
            >
              <Monitor className="w-5 h-5" />
              <span className="font-medium">Terminals</span>
            </div>
          </Link>
        )}

        {hoveredItem === "manual-funding" && isCollapsed && isAdmin && (
          <Link
            href="/admin/manual-funding"
            className="fixed z-60 w-56 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-background shadow-lg"
            style={{ left: popupPosition.left, top: popupPosition.top }}
            onMouseEnter={() => setHoveredItem("manual-funding")}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => setIsOpen(false)}
          >
            <div
              className={clsx(
                "flex items-center gap-3 px-4 py-3",
                pathname?.startsWith("/admin/manual-funding")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground"
              )}
            >
              <HandCoins className="w-5 h-5" />
              <span className="font-medium">Online Manual Funding</span>
            </div>
          </Link>
        )}

        {isAdmin && adminMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return hoveredItem === item.href && isCollapsed ? (
            <Link
              href={item.href}
              key={item.href}
              className="fixed z-60 w-56 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-background shadow-lg"
              style={{ left: popupPosition.left, top: popupPosition.top }}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => setIsOpen(false)}
            >
              <div
                className={clsx(
                  "flex items-center gap-3 px-4 py-3",
                  isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          ) : null;
        })}
      </div>

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
