import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Upload, Sparkles, Save, Send, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function PosterGenerator() {
  const [selectedTemplate, setSelectedTemplate] = useState("template1");
  const [discount, setDiscount] = useState("20");
  const [caption, setCaption] = useState(
    "✨ Glow like never before! Get 20% off our bestselling products. Limited time only! 💕 #BellabeatrixCosmetics #BeautyDeals"
  );
  const [autoPost, setAutoPost] = useState(false);
  const [posterGenerated, setPosterGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const templates = [
    { id: "template1", name: "Elegant Minimal", style: "Clean white with gold accents" },
    { id: "template2", name: "Pink Glam", style: "Vibrant pink gradient" },
    { id: "template3", name: "Luxury Gold", style: "Premium gold and white" },
    { id: "template4", name: "Pastel Dream", style: "Soft pastel colors" },
  ];

  const handleGeneratePoster = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setPosterGenerated(true);
      setIsGenerating(false);
    }, 2000);
  };

  const handleGenerateCaption = () => {
    const captions = [
      `✨ Glow up with ${discount}% OFF! Transform your beauty routine today. Limited stock available! 💕 #BellabeatrixCosmetics`,
      `💕 Treat yourself! ${discount}% discount on our premium collection. Because you deserve it! ✨ #BeautyLovers #SelfCare`,
      `🌸 Spring into beauty! Save ${discount}% on your favorites. Shop now before it's gone! 💖 #BellabeatrixDeals`,
    ];
    setCaption(captions[Math.floor(Math.random() * captions.length)]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[#444444] mb-2">AI-Powered Poster Generator</h2>
        <p className="text-sm text-[#444444]/60">
          Create stunning marketing posters with AI assistance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
          <h3 className="text-[#444444] mb-6">Poster Details</h3>

          <div className="space-y-5">
            {/* Product Image Upload */}
            <div>
              <Label htmlFor="product-image" className="text-sm text-[#444444]/80 mb-2 block">
                Product Image
              </Label>
              <div className="border-2 border-dashed border-[#F9E0E7] rounded-xl p-8 text-center hover:border-[#D4A373] transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-[#D4A373] mx-auto mb-2" />
                <p className="text-sm text-[#444444]/70">Click to upload or drag and drop</p>
                <p className="text-xs text-[#444444]/50 mt-1">PNG, JPG up to 10MB</p>
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <Label htmlFor="template" className="text-sm text-[#444444]/80 mb-2 block">
                Select Template
              </Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="rounded-lg border-[#F9E0E7]/50">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <p className="text-sm">{template.name}</p>
                        <p className="text-xs text-[#444444]/60">{template.style}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discount Percentage */}
            <div>
              <Label htmlFor="discount" className="text-sm text-[#444444]/80 mb-2 block">
                Discount Percentage
              </Label>
              <div className="flex gap-2">
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="rounded-lg border-[#F9E0E7]/50"
                  placeholder="20"
                />
                <Button
                  variant="outline"
                  className="border-[#F9E0E7]/50 text-[#D4A373] hover:bg-[#F9E0E7]/30"
                >
                  %
                </Button>
              </div>
            </div>

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="caption" className="text-sm text-[#444444]/80">
                  Caption
                </Label>
                <Button
                  onClick={handleGenerateCaption}
                  size="sm"
                  variant="ghost"
                  className="text-[#D4A373] hover:text-[#D4A373] hover:bg-[#F9E0E7]/50 gap-1 h-7"
                >
                  <Sparkles className="w-3 h-3" />
                  AI Generate
                </Button>
              </div>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="rounded-lg border-[#F9E0E7]/50 min-h-[120px]"
                placeholder="Enter your caption or let AI generate one..."
              />
              <p className="text-xs text-[#444444]/50 mt-1">{caption.length} characters</p>
            </div>

            {/* Hashtags Suggestions */}
            <div>
              <Label className="text-sm text-[#444444]/80 mb-2 block">Suggested Hashtags</Label>
              <div className="flex flex-wrap gap-2">
                {["#BellabeatrixCosmetics", "#BeautyDeals", "#GlowUp", "#SelfCare", "#MakeupLovers"].map(
                  (tag) => (
                    <Badge
                      key={tag}
                      className="bg-[#F9E0E7]/50 text-[#D4A373] hover:bg-[#F9E0E7] cursor-pointer"
                    >
                      {tag}
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Auto Post Toggle */}
            <div className="flex items-center justify-between p-4 bg-[#F9E0E7]/20 rounded-xl">
              <div>
                <p className="text-sm text-[#444444]">Auto Post to Facebook</p>
                <p className="text-xs text-[#444444]/60">Post immediately after generation</p>
              </div>
              <Switch checked={autoPost} onCheckedChange={setAutoPost} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleGeneratePoster}
                disabled={isGenerating}
                className="flex-1 bg-gradient-to-r from-[#D4A373] to-[#D4A373]/80 hover:from-[#D4A373]/90 hover:to-[#D4A373]/70 text-white rounded-lg gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Poster
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Poster Preview */}
        <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
          <h3 className="text-[#444444] mb-6">Poster Preview</h3>

          {!posterGenerated ? (
            <div className="aspect-square bg-gradient-to-br from-[#F9E0E7]/30 to-white rounded-2xl flex items-center justify-center border-2 border-dashed border-[#F9E0E7]">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-[#D4A373]/50 mx-auto mb-3" />
                <p className="text-sm text-[#444444]/60">
                  Your poster will appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Generated Poster */}
              <div className="aspect-square bg-gradient-to-br from-[#F9E0E7] via-white to-[#D4A373]/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A373]/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#F9E0E7] rounded-full -ml-12 -mb-12"></div>
                
                <div className="relative z-10">
                  <div className="w-32 h-32 bg-white rounded-full mb-6 flex items-center justify-center shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1596462502278-27bfdc403348"
                      alt="Product"
                      className="w-24 h-24 object-cover rounded-full"
                    />
                  </div>
                  
                  <h2 className="text-[#444444] mb-2">Special Offer</h2>
                  <div className="text-[#D4A373] mb-4">
                    <span className="text-5xl">{discount}%</span>
                    <p className="text-sm mt-1">OFF</p>
                  </div>
                  <p className="text-sm text-[#444444]/70 max-w-xs">
                    Exclusive discount on premium cosmetics
                  </p>
                  <Badge className="mt-4 bg-[#D4A373] text-white hover:bg-[#D4A373]">
                    Limited Time Only
                  </Badge>
                </div>
              </div>

              {/* Post Details */}
              <div className="bg-[#F9E0E7]/20 rounded-xl p-4">
                <p className="text-xs text-[#444444]/60 mb-2">Post Caption:</p>
                <p className="text-sm text-[#444444]/80">{caption}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-[#F9E0E7] text-[#D4A373] hover:bg-[#F9E0E7]/30 rounded-lg gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </Button>
                <Button className="flex-1 bg-gradient-to-r from-[#D4A373] to-[#D4A373]/80 hover:from-[#D4A373]/90 hover:to-[#D4A373]/70 text-white rounded-lg gap-2">
                  {autoPost ? (
                    <>
                      <Send className="w-4 h-4" />
                      Auto Post
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post to Facebook
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
