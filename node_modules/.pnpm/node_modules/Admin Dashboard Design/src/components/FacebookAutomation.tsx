import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Facebook, Check, Clock, AlertCircle, Eye, Send, Calendar } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const postingQueue = [
  {
    id: 1,
    posterUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348",
    caption: "✨ Glow like never before! Get 20% off our bestselling Glow Serum...",
    status: "draft",
    date: "2025-10-22",
    product: "Glow Serum",
  },
  {
    id: 2,
    posterUrl: "https://images.unsplash.com/photo-1571875257727-256c39da42af",
    caption: "💕 Treat yourself! 15% discount on our premium Lip Gloss Set...",
    status: "approved",
    date: "2025-10-23",
    product: "Lip Gloss Set",
  },
  {
    id: 3,
    posterUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9",
    caption: "🌸 Spring into beauty! Save 25% on Face Cream Deluxe...",
    status: "posted",
    date: "2025-10-21",
    product: "Face Cream",
  },
  {
    id: 4,
    posterUrl: "https://images.unsplash.com/photo-1631214524020-7e18db9a8f92",
    caption: "💖 Limited time offer! Get our Eye Shadow Palette at 30% off...",
    status: "scheduled",
    date: "2025-10-24",
    product: "Eye Shadow Palette",
  },
];

const activityLog = [
  {
    id: 1,
    action: "Post Published",
    product: "Face Cream Deluxe",
    status: "success",
    time: "2 hours ago",
  },
  {
    id: 2,
    action: "Post Scheduled",
    product: "Eye Shadow Palette",
    status: "scheduled",
    time: "1 day ago",
  },
  {
    id: 3,
    action: "Post Failed",
    product: "Blush Palette",
    status: "failed",
    time: "2 days ago",
  },
  {
    id: 4,
    action: "Post Approved",
    product: "Lip Gloss Set",
    status: "success",
    time: "2 days ago",
  },
];

export function FacebookAutomation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[#444444] mb-2">Facebook Automation</h2>
        <p className="text-sm text-[#444444]/60">
          Manage your Facebook posting queue and automation settings
        </p>
      </div>

      {/* Connected Page Info */}
      <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Facebook className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-[#444444]">Bellabeatrix Cosmetics</h3>
              <p className="text-sm text-[#444444]/60">Facebook Business Page</p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <Check className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        </div>
      </Card>

      {/* Automation Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
          <h3 className="text-[#444444] mb-4">Automation Mode</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#F9E0E7]/20 rounded-xl">
              <div>
                <p className="text-sm text-[#444444]">Manual Approval Mode</p>
                <p className="text-xs text-[#444444]/60">Review posts before publishing</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm text-[#444444]/50">Full Automation Mode</p>
                <p className="text-xs text-[#444444]/40">Auto-post without review</p>
              </div>
              <Switch disabled />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Manual mode is recommended for safety and quality control
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
          <h3 className="text-[#444444] mb-4">API Configuration</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="facebook-token" className="text-sm text-[#444444]/80 mb-2 block">
                Facebook Access Token
              </Label>
              <Input
                id="facebook-token"
                type="password"
                value="EAABw••••••••••••••••"
                className="rounded-lg border-[#F9E0E7]/50"
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="openai-key" className="text-sm text-[#444444]/80 mb-2 block">
                OpenAI API Key
              </Label>
              <Input
                id="openai-key"
                type="password"
                value="sk-••••••••••••••••••••"
                className="rounded-lg border-[#F9E0E7]/50"
                readOnly
              />
            </div>
            <Button
              variant="outline"
              className="w-full border-[#F9E0E7] text-[#D4A373] hover:bg-[#F9E0E7]/30 rounded-lg"
            >
              Update API Keys
            </Button>
          </div>
        </Card>
      </div>

      {/* Posting Queue */}
      <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#444444]">Posting Queue</h3>
          <Badge className="bg-[#F9E0E7] text-[#D4A373] hover:bg-[#F9E0E7]">
            {postingQueue.length} Posts
          </Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-[#F9E0E7]/30">
              <TableHead>Poster Preview</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Caption</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {postingQueue.map((post) => (
              <TableRow key={post.id} className="border-[#F9E0E7]/30">
                <TableCell>
                  <ImageWithFallback
                    src={post.posterUrl}
                    alt={post.product}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                </TableCell>
                <TableCell>{post.product}</TableCell>
                <TableCell>
                  <p className="text-sm text-[#444444]/80 max-w-xs truncate">{post.caption}</p>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${
                      post.status === "posted"
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : post.status === "approved"
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                        : post.status === "scheduled"
                        ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {post.status}
                  </Badge>
                </TableCell>
                <TableCell>{post.date}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {post.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#D4A373] hover:text-[#D4A373] hover:bg-[#F9E0E7]/50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#D4A373] text-white hover:bg-[#D4A373]/90"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {post.status === "approved" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-[#D4A373] text-white hover:bg-[#D4A373]/90 gap-1"
                        >
                          <Send className="w-3 h-3" />
                          Post Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#F9E0E7] text-[#D4A373] hover:bg-[#F9E0E7]/30"
                        >
                          <Calendar className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {post.status === "posted" && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                        <Check className="w-3 h-3" />
                        Published
                      </Badge>
                    )}
                    {post.status === "scheduled" && (
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 gap-1">
                        <Clock className="w-3 h-3" />
                        Scheduled
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Activity Log */}
      <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
        <h3 className="text-[#444444] mb-4">Activity Log</h3>
        <div className="space-y-3">
          {activityLog.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-4 bg-[#F9E0E7]/10 rounded-xl hover:bg-[#F9E0E7]/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    log.status === "success"
                      ? "bg-green-100"
                      : log.status === "failed"
                      ? "bg-red-100"
                      : "bg-purple-100"
                  }`}
                >
                  {log.status === "success" ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : log.status === "failed" ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-[#444444]">{log.action}</p>
                  <p className="text-xs text-[#444444]/60">{log.product}</p>
                </div>
              </div>
              <p className="text-xs text-[#444444]/50">{log.time}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
