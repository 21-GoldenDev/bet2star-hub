"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Save, Mail } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState({
    siteName: "Bet2Star",
    siteEmail: "support@bet2star.com",
    maintenanceMode: false,
    maintenanceMessage: "",
    minBetAmount: 100,
    maxBetAmount: 100000,
    withdrawalFee: 2.5,
    depositFee: 1.0,
    transactionTimeout: 30,
    maxWithdrawalPerDay: 500000,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "noreply@bet2star.com",
    smtpPassword: "****",
    fromEmail: "noreply@bet2star.com",
    fromName: "Bet2Star",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailOnDeposit: true,
    emailOnWithdrawal: true,
    emailOnBigWin: true,
    emailOnGameDraw: false,
    smsOnTransactions: true,
    pushNotifications: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    ipWhitelist: false,
    ipList: "",
  });

  const handleSave = (section: string) => {
    alert(`${section} settings saved successfully!`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage platform configuration and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6">General Settings</h3>

            <div className="space-y-6">
              {/* Site Info */}
              <div className="pb-6 border-b border-border">
                <h4 className="font-bold mb-4">Site Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2">Site Name</Label>
                    <Input
                      value={settings.siteName}
                      onChange={(e) =>
                        setSettings({ ...settings, siteName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Support Email</Label>
                    <Input
                      type="email"
                      value={settings.siteEmail}
                      onChange={(e) =>
                        setSettings({ ...settings, siteEmail: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Maintenance Mode */}
              <div className="pb-6 border-b border-border">
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maintenanceMode: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <Label className="font-bold">Maintenance Mode</Label>
                </div>
                {settings.maintenanceMode && (
                  <div>
                    <Label className="mb-2">Maintenance Message</Label>
                    <Textarea
                      value={settings.maintenanceMessage}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maintenanceMessage: e.target.value,
                        })
                      }
                      placeholder="Message to display to users"
                      rows={4}
                    />
                  </div>
                )}
              </div>

              {/* Betting Limits */}
              <div className="pb-6 border-b border-border">
                <h4 className="font-bold mb-4">Betting Limits</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2">Min Bet Amount (₦)</Label>
                    <Input
                      type="number"
                      value={settings.minBetAmount}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          minBetAmount: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Max Bet Amount (₦)</Label>
                    <Input
                      type="number"
                      value={settings.maxBetAmount}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maxBetAmount: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Max Withdrawal/Day (₦)</Label>
                    <Input
                      type="number"
                      value={settings.maxWithdrawalPerDay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maxWithdrawalPerDay: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Transaction Fees */}
              <div className="pb-6 border-b border-border">
                <h4 className="font-bold mb-4">Transaction Fees</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2">Deposit Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.depositFee}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          depositFee: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Withdrawal Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.withdrawalFee}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          withdrawalFee: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Transaction Timeout (min)</Label>
                    <Input
                      type="number"
                      value={settings.transactionTimeout}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          transactionTimeout: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleSave("General")}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6">Email Configuration</h3>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                  Configure your SMTP settings for sending emails to users
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">SMTP Host</Label>
                  <Input
                    value={emailSettings.smtpHost}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpHost: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="mb-2">SMTP Port</Label>
                  <Input
                    type="number"
                    value={emailSettings.smtpPort}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpPort: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="mb-2">SMTP Username</Label>
                  <Input
                    value={emailSettings.smtpUser}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpUser: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="mb-2">SMTP Password</Label>
                  <Input
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="mb-2">From Email</Label>
                  <Input
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        fromEmail: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="mb-2">From Name</Label>
                  <Input
                    value={emailSettings.fromName}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        fromName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <Button className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Send Test Email
              </Button>

              <Button
                onClick={() => handleSave("Email")}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Email Settings
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6">Notification Preferences</h3>

            <div className="space-y-4">
              <div className="space-y-4 pb-6 border-b border-border">
                <h4 className="font-bold">Email Notifications</h4>
                {[
                  {
                    key: "emailOnDeposit",
                    label: "Email on deposit",
                  },
                  {
                    key: "emailOnWithdrawal",
                    label: "Email on withdrawal",
                  },
                  {
                    key: "emailOnBigWin",
                    label: "Email on big win",
                  },
                  {
                    key: "emailOnGameDraw",
                    label: "Email on game draw",
                  },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={
                        notificationSettings[
                        item.key as keyof typeof notificationSettings
                        ] as boolean
                      }
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-4 pb-6 border-b border-border">
                <h4 className="font-bold">Other Notifications</h4>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={notificationSettings.smsOnTransactions}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        smsOnTransactions: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span>SMS on transactions</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={notificationSettings.pushNotifications}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        pushNotifications: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span>Push notifications</span>
                </label>
              </div>

              <Button
                onClick={() => handleSave("Notifications")}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6">Security Settings</h3>

            <div className="space-y-6">
              <div className="pb-6 border-b border-border">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorAuth}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        twoFactorAuth: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="font-bold">Require 2FA for Admin Access</span>
                </label>
              </div>

              <div className="pb-6 border-b border-border">
                <Label className="mb-2 block font-bold">Session Timeout (minutes)</Label>
                <Input
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      sessionTimeout: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="pb-6 border-b border-border">
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={securitySettings.ipWhitelist}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        ipWhitelist: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="font-bold">IP Whitelist</span>
                </label>
                {securitySettings.ipWhitelist && (
                  <div>
                    <Label className="mb-2">Allowed IPs (one per line)</Label>
                    <Textarea
                      value={securitySettings.ipList}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          ipList: e.target.value,
                        })
                      }
                      placeholder="192.168.1.1&#10;192.168.1.2"
                      rows={4}
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleSave("Security")}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Security Settings
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
