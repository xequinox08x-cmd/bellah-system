import { Card } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sparkles, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { useState } from "react";

const productPerformance = [
  {
    id: 1,
    product: "Glow Serum",
    salesVolume: 145,
    trend: "+12%",
    trendDirection: "up",
    performance: "high",
  },
  {
    id: 2,
    product: "Lip Gloss Set",
    salesVolume: 132,
    trend: "+8%",
    trendDirection: "up",
    performance: "high",
  },
  {
    id: 3,
    product: "Face Cream Deluxe",
    salesVolume: 98,
    trend: "+2%",
    trendDirection: "up",
    performance: "medium",
  },
  {
    id: 4,
    product: "Eye Shadow Palette",
    salesVolume: 76,
    trend: "-5%",
    trendDirection: "down",
    performance: "medium",
  },
  {
    id: 5,
    product: "Blush Palette",
    salesVolume: 54,
    trend: "-30%",
    trendDirection: "down",
    performance: "low",
  },
  {
    id: 6,
    product: "Night Repair Cream",
    salesVolume: 41,
    trend: "-22%",
    trendDirection: "down",
    performance: "low",
  },
];

interface AIRecommendationProps {
  onGeneratePoster: () => void;
}

export function AIAnalysis({ onGeneratePoster }: AIRecommendationProps) {
  const [analyzedProduct, setAnalyzedProduct] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = (productId: number) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setAnalyzedProduct(productId);
      setIsAnalyzing(false);
    }, 1500);
  };

  const lowPerformingProducts = productPerformance.filter((p) => p.performance === "low");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[#444444] mb-2">AI Sales Analysis & Recommendations</h2>
        <p className="text-sm text-[#444444]/60">
          Analyze product performance and get AI-powered marketing recommendations
        </p>
      </div>

      {/* Product Performance Table */}
      <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#444444]">Product Sales Performance</h3>
          <Badge className="bg-[#F9E0E7] text-[#D4A373] hover:bg-[#F9E0E7]">
            Last 7 Days
          </Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-[#F9E0E7]/30">
              <TableHead>Product</TableHead>
              <TableHead>Sales Volume</TableHead>
              <TableHead>7-Day Trend</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productPerformance.map((product) => (
              <TableRow key={product.id} className="border-[#F9E0E7]/30">
                <TableCell>{product.product}</TableCell>
                <TableCell>{product.salesVolume} units</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {product.trendDirection === "up" ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span
                      className={`text-sm ${
                        product.trendDirection === "up" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {product.trend}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${
                      product.performance === "high"
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : product.performance === "medium"
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {product.performance}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => handleAnalyze(product.id)}
                    disabled={isAnalyzing}
                    variant="ghost"
                    className="text-[#D4A373] hover:text-[#D4A373] hover:bg-[#F9E0E7]/50 gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isAnalyzing && analyzedProduct === null ? "Analyzing..." : "Analyze with AI"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* AI Recommendations */}
      {analyzedProduct && (
        <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm bg-gradient-to-br from-[#F9E0E7]/20 to-white">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#D4A373]" />
            <h3 className="text-[#444444]">AI Recommendations</h3>
          </div>

          <div className="space-y-4">
            {/* AI Insight */}
            <div className="bg-white rounded-xl p-4 border border-[#F9E0E7]/50">
              <p className="text-sm text-[#444444]/80 mb-2">
                <strong className="text-[#D4A373]">AI Insight:</strong>
              </p>
              <p className="text-sm text-[#444444]/70">
                "{productPerformance.find((p) => p.id === analyzedProduct)?.product}" sales dropped{" "}
                {productPerformance.find((p) => p.id === analyzedProduct)?.trend} this week due to low
                visibility and lack of promotional content. Competitor products are gaining market share
                with aggressive social media campaigns.
              </p>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Discount Suggestion */}
              <div className="bg-white rounded-xl p-4 border border-[#F9E0E7]/50">
                <p className="text-sm text-[#444444]/60 mb-1">Suggested Discount</p>
                <p className="text-[#D4A373] mb-2">15-20% OFF</p>
                <p className="text-xs text-[#444444]/60">
                  Limited time offer to boost urgency
                </p>
              </div>

              {/* Caption Suggestion */}
              <div className="bg-white rounded-xl p-4 border border-[#F9E0E7]/50">
                <p className="text-sm text-[#444444]/60 mb-1">Generated Caption</p>
                <p className="text-xs text-[#444444]/70 italic mb-2">
                  "✨ Glow like never before! Get 20% off our bestselling Blush Palette. Limited
                  stock! 💕"
                </p>
                <Badge className="bg-[#D4A373]/20 text-[#D4A373] hover:bg-[#D4A373]/20 text-xs">
                  GPT Generated
                </Badge>
              </div>

              {/* Schedule Suggestion */}
              <div className="bg-white rounded-xl p-4 border border-[#F9E0E7]/50">
                <p className="text-sm text-[#444444]/60 mb-1">Suggested Post Time</p>
                <p className="text-[#D4A373] mb-2">6:00 PM Today</p>
                <p className="text-xs text-[#444444]/60">
                  Peak engagement time for your audience
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <Button
                onClick={onGeneratePoster}
                className="bg-gradient-to-r from-[#D4A373] to-[#D4A373]/80 hover:from-[#D4A373]/90 hover:to-[#D4A373]/70 text-white rounded-lg gap-2"
              >
                Generate Poster
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
          <h3 className="text-[#444444] mb-3">⚠️ Attention Needed</h3>
          <div className="space-y-2">
            {lowPerformingProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-[#F9E0E7]/20 rounded-lg"
              >
                <div>
                  <p className="text-sm text-[#444444]">{product.product}</p>
                  <p className="text-xs text-[#444444]/60">Down {product.trend}</p>
                </div>
                <Button
                  onClick={() => handleAnalyze(product.id)}
                  size="sm"
                  variant="ghost"
                  className="text-[#D4A373] hover:text-[#D4A373] hover:bg-white"
                >
                  Boost Sales
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
          <h3 className="text-[#444444] mb-3">💡 AI Tips</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4A373]/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[#D4A373]" />
              </div>
              <div>
                <p className="text-sm text-[#444444]">Create bundled offers</p>
                <p className="text-xs text-[#444444]/60">
                  Pair low-performing products with bestsellers
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4A373]/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[#D4A373]" />
              </div>
              <div>
                <p className="text-sm text-[#444444]">Post during peak hours</p>
                <p className="text-xs text-[#444444]/60">5-7 PM shows highest engagement</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4A373]/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[#D4A373]" />
              </div>
              <div>
                <p className="text-sm text-[#444444]">Use emotion-driven captions</p>
                <p className="text-xs text-[#444444]/60">Words like "glow" and "love" perform well</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
