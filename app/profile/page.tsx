"use client";

import { useState, useEffect } from "react";
import useSupabaseUser from "@/hooks/use-supabase-user";
import { getUserProfile, signOut, updateAuthUser } from "@/lib/auth";
import { compressImage } from "@/lib/image";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Bell,
  CreditCard,
  History,
  Settings,
  ChevronRight,
  Edit3,
  Trophy,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useSupabaseUser();
  const [profile, setProfile] = useState({
    username: "",
    displayName: "",
    email: "",
    phone: "",
    avatar_url: undefined as string | undefined,
    joinDate: "",
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    if (user) {
      getUserProfile(user.id)
        .then(({ data: profile }) => {
          setProfile({
            avatar_url: profile?.avatar || undefined,
            username: profile?.username || "",
            displayName: profile?.full_name || "",
            email: user.email || "",
            phone: profile?.phone || "",
            joinDate: formatDate(user.created_at),
          });
        })
        .catch(() => {
          toast({ title: "Failed to load profile", variant: "destructive" });
        });
    } else {
      setProfile({
        avatar_url: undefined,
        username: "",
        displayName: "",
        email: "",
        phone: "",
        joinDate: "",
      })
    }
  }, [user]);

  const stats = [
    { label: "Total Bets", value: "247", icon: History },
    { label: "Win Rate", value: "62%", icon: TrendingUp },
    { label: "Total Won", value: "$3,450", icon: Trophy },
  ];

  const menuItems = [
    { icon: CreditCard, label: "Payment Methods", path: "/deposit" },
    { icon: History, label: "Transaction History", path: "/transactions" },
    { icon: Bell, label: "Notifications", path: "#" },
    { icon: Shield, label: "Security", path: "#" },
    { icon: Settings, label: "Preferences", path: "#" },
  ];

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateAuthUser({ phone: profile.phone, full_name: profile.displayName, avatar: profile.avatar_url ?? null });
      setIsEditing(false);
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: err?.message || "Failed to save", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Profile Header */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center overflow-hidden relative">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={`${profile.username} avatar`} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
              {isEditing && (
                <label className="absolute -bottom-2 right-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const compressed = await compressImage(file, 256, 0.8);
                        setProfile((p) => ({ ...p, avatar_url: compressed }));
                      } catch (err) {
                        toast({ title: "Failed to process avatar", variant: "destructive" });
                      }
                    }}
                  />
                  <div className="bg-muted rounded-full p-1 cursor-pointer">
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
                  </div>
                </label>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.username}
                  </h1>
                  <p className="text-muted-foreground">Premium Member</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-muted rounded-xl p-4 text-center"
              >
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Profile Details
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="text-foreground">{profile.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Phone className="w-5 h-5 text-muted-foreground" />
              </div>
              {isEditing ? (
                <Input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="flex-1 bg-muted border-border"
                />
              ) : (
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-foreground">{profile.phone}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              {isEditing ? (
                <Input
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  className="flex-1 bg-muted border-border"
                />
              ) : (
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Full name</p>
                  <p className="text-foreground">{profile.displayName}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="text-foreground">{profile.joinDate}</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6">
              <Button
                variant="gold"
                className="flex-1"
                onClick={handleSaveProfile}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <h2 className="text-lg font-semibold text-foreground p-6 pb-4">
            Quick Actions
          </h2>
          <div className="divide-y divide-border">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.path}
                className="flex items-center gap-4 p-4 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="flex-1 text-foreground">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full mt-6 text-destructive hover:bg-destructive/10"
          onClick={async () => {
            const { error } = await signOut();
            if (error) toast({ title: error.message || "Sign out failed", variant: "destructive" });
            else toast({ title: "Signed out" });
          }}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;
