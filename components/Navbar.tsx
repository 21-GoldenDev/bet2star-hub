"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wallet, User, Menu, X, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import clsx from "clsx";

import { signOut } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";
import supabase from "@/lib/supabase/client";
import { isUserAdminByEmail } from "@/lib/admin/auth";
import { getUserProfile } from "@/lib/auth";

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setIsLoggedIn(!!user);
        if (user?.email) {
          setIsAdmin(await isUserAdminByEmail(user.email));
        }
        if (user?.id) {
          try {
            const { data: profile } = await getUserProfile(user.id);
            setBalance(profile?.balance || 0);
          } catch (error) {
            console.error("Failed to load balance:", error);
            setBalance(0);
          }
        }
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      if (session?.user?.id) {
        getUserProfile(session.user.id).then(({ data: profile }) => {
          setBalance(profile?.balance || 0);
        }).catch(() => setBalance(0));
      } else {
        setBalance(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) toast({ title: error.message || "Sign out failed", variant: "destructive" });
    else {
      router.push("/");
    }
  };

  const isActive = (path: string) => pathname === path;
  const isAdminPage = pathname.startsWith("/admin");

  const navLinks = [
    { path: "/", label: "Home" },
  ];

  if (isAdminPage) {
    navLinks.push({ path: "/admin", label: "Admin Dashboard" });
  } else {
    navLinks.push(
      { path: "/lotto", label: "Lotto" },
      { path: "/pools", label: "Pools" },
      { path: "/sports", label: "Sports Betting" }
    );
    if (isAdmin) {
      navLinks.push({ path: "/admin", label: "Admin Dashboard" });
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo2.png"
              alt="Bet2Star Logo"
              height={33}
              width={250}
            />
          </Link>

          {/* Desktop Navigation */}
          {isLoggedIn && !isAdminPage && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={clsx(
                    "px-4 py-2 rounded-lg font-medium transition-all duration-300",
                    isActive(link.path)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Balance & User */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {!isAdminPage && (
                  <>
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        {balance !== null ? `₦${balance.toLocaleString()}` : "--"}
                      </span>
                    </div>
                    <Link href="/deposit">
                      <Button variant="gold" size="sm" className="hidden sm:flex">
                        Deposit
                      </Button>
                    </Link>
                    <Link href="/withdraw">
                      <Button variant="cyan" size="sm" className="hidden sm:flex">
                        Withdraw
                      </Button>
                    </Link>
                  </>
                )}
                <Link href="/profile">
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleSignOut}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <Link href="/auth">
                <Button variant="gold" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-slide-up">
            <div className="flex flex-col gap-2">
              {!isAdminPage && navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    "px-4 py-3 rounded-lg font-medium transition-all",
                    isActive(link.path)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {isLoggedIn ? (
                <>
                  {!isAdminPage && (
                    <>
                      <div className="flex items-center gap-2 px-4 py-3 mt-2 rounded-lg bg-muted border border-border">
                        <Wallet className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">
                          {balance !== null ? `₦${balance.toLocaleString()}` : "--"}
                        </span>
                      </div>
                      <Link href="/deposit" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="gold" className="w-full mt-2">
                          Deposit
                        </Button>
                      </Link>
                    </>
                  )}
                  <Link href="/withdraw" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="cyan" className="w-full mt-2">
                      Withdraw
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="gold" className="w-full mt-4">
                    Sign In / Sign Up
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
