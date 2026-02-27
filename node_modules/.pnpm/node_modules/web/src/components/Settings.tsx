import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { User, Bell, Shield, Palette, Database, Key } from "lucide-react";

export function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[#444444] mb-2">Settings</h2>
        <p className="text-sm text-[#444444]/60">
          Manage your account, preferences, and system configuration
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-[#F9E0E7]/30 p-1 rounded-xl">
          <TabsTrigger
            value="profile"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#D4A373]"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#D4A373]"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#D4A373]"
          >
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#D4A373]"
          >
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="api"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#D4A373]"
          >
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
            <h3 className="text-[#444444] mb-6">Profile Information</h3>
            
            <div className="flex items-center gap-6 mb-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
                <AvatarFallback className="bg-[#F9E0E7] text-[#D4A373]">AD</AvatarFallback>
              </Avatar>
              <div>
                <Button
                  variant="outline"
                  className="border-[#F9E0E7] text-[#D4A373] hover:bg-[#F9E0E7]/30 rounded-lg mb-2"
                >
                  Change Photo
                </Button>
                <p className="text-xs text-[#444444]/60">JPG, PNG. Max size 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm text-[#444444]/80 mb-2 block">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  defaultValue="Admin"
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm text-[#444444]/80 mb-2 block">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  defaultValue="User"
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm text-[#444444]/80 mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="admin@bellabeatrix.com"
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-sm text-[#444444]/80 mb-2 block">
                  Role
                </Label>
                <Input
                  id="role"
                  defaultValue="Administrator"
                  className="rounded-lg border-[#F9E0E7]/50"
                  disabled
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button className="bg-gradient-to-r from-[#D4A373] to-[#D4A373]/80 hover:from-[#D4A373]/90 hover:to-[#D4A373]/70 text-white rounded-lg">
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
            <h3 className="text-[#444444] mb-6">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-[#F9E0E7]/30 rounded-xl">
                <div>
                  <p className="text-sm text-[#444444]">Sales Alerts</p>
                  <p className="text-xs text-[#444444]/60">Get notified when sales drop significantly</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border border-[#F9E0E7]/30 rounded-xl">
                <div>
                  <p className="text-sm text-[#444444]">AI Recommendations</p>
                  <p className="text-xs text-[#444444]/60">Receive AI-generated promotion suggestions</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border border-[#F9E0E7]/30 rounded-xl">
                <div>
                  <p className="text-sm text-[#444444]">Post Approvals</p>
                  <p className="text-xs text-[#444444]/60">Notification when posts need approval</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border border-[#F9E0E7]/30 rounded-xl">
                <div>
                  <p className="text-sm text-[#444444]">Facebook Activity</p>
                  <p className="text-xs text-[#444444]/60">Updates on posted content performance</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-4 border border-[#F9E0E7]/30 rounded-xl">
                <div>
                  <p className="text-sm text-[#444444]">Weekly Reports</p>
                  <p className="text-xs text-[#444444]/60">Receive weekly analytics summary</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
            <h3 className="text-[#444444] mb-6">Password & Security</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="text-sm text-[#444444]/80 mb-2 block">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <div>
                <Label htmlFor="newPassword" className="text-sm text-[#444444]/80 mb-2 block">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm text-[#444444]/80 mb-2 block">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <Button className="bg-gradient-to-r from-[#D4A373] to-[#D4A373]/80 hover:from-[#D4A373]/90 hover:to-[#D4A373]/70 text-white rounded-lg">
                Update Password
              </Button>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
            <h3 className="text-[#444444] mb-4">Two-Factor Authentication</h3>
            <div className="flex items-center justify-between p-4 bg-[#F9E0E7]/20 rounded-xl">
              <div>
                <p className="text-sm text-[#444444]">Enable 2FA</p>
                <p className="text-xs text-[#444444]/60">Add an extra layer of security</p>
              </div>
              <Switch />
            </div>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
            <h3 className="text-[#444444] mb-6">Theme Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-[#D4A373] rounded-xl p-4 cursor-pointer bg-[#F9E0E7]/10">
                <div className="aspect-video bg-gradient-to-br from-[#F9E0E7] to-white rounded-lg mb-3"></div>
                <p className="text-sm text-[#444444]">Feminine Pastel</p>
                <Badge className="bg-[#D4A373] text-white hover:bg-[#D4A373] mt-2">Active</Badge>
              </div>
              <div className="border-2 border-[#F9E0E7]/30 rounded-xl p-4 cursor-pointer hover:border-[#D4A373]/50">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-white rounded-lg mb-3"></div>
                <p className="text-sm text-[#444444]/60">Minimal Gray</p>
              </div>
              <div className="border-2 border-[#F9E0E7]/30 rounded-xl p-4 cursor-pointer hover:border-[#D4A373]/50">
                <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg mb-3"></div>
                <p className="text-sm text-[#444444]/60">Dark Mode</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
            <h3 className="text-[#444444] mb-4">Display Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-[#F9E0E7]/30 rounded-xl">
                <div>
                  <p className="text-sm text-[#444444]">Compact View</p>
                  <p className="text-xs text-[#444444]/60">Show more content in less space</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-4 border border-[#F9E0E7]/30 rounded-xl">
                <div>
                  <p className="text-sm text-[#444444]">Show Animations</p>
                  <p className="text-xs text-[#444444]/60">Enable smooth transitions</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* API Keys Settings */}
        <TabsContent value="api" className="space-y-6">
          <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
            <h3 className="text-[#444444] mb-6">API Keys Management</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="facebookToken" className="text-sm text-[#444444]/80">
                    Facebook Access Token
                  </Label>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    Connected
                  </Badge>
                </div>
                <Input
                  id="facebookToken"
                  type="password"
                  defaultValue="EAABw••••••••••••••••"
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="openaiKey" className="text-sm text-[#444444]/80">
                    OpenAI API Key
                  </Label>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    Active
                  </Badge>
                </div>
                <Input
                  id="openaiKey"
                  type="password"
                  defaultValue="sk-••••••••••••••••••••"
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="canvaKey" className="text-sm text-[#444444]/80">
                    Canva API Key (Optional)
                  </Label>
                  <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                    Not Connected
                  </Badge>
                </div>
                <Input
                  id="canvaKey"
                  type="password"
                  placeholder="Enter your Canva API key"
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="n8nWebhook" className="text-sm text-[#444444]/80">
                    n8n Webhook URL
                  </Label>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    Connected
                  </Badge>
                </div>
                <Input
                  id="n8nWebhook"
                  type="text"
                  defaultValue="https://n8n.bellabeatrix.com/webhook/..."
                  className="rounded-lg border-[#F9E0E7]/50"
                />
              </div>
              <Button className="bg-gradient-to-r from-[#D4A373] to-[#D4A373]/80 hover:from-[#D4A373]/90 hover:to-[#D4A373]/70 text-white rounded-lg">
                Save API Configuration
              </Button>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
            <h3 className="text-[#444444] mb-4">Integration Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-[#444444]">n8n Automation</p>
                    <p className="text-xs text-[#444444]/60">Last sync: 2 minutes ago</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-[#444444]">OpenAI GPT</p>
                    <p className="text-xs text-[#444444]/60">API calls: 234 today</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
