"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ProductGroup {
  id: number;
  sku: string;
  name: string;
  images: { filePath: string }[];
  specs: {
    sku: string;
    spec: string;
    salePrice: string | null;
    carModel: string;
    oeCode: string;
  }[];
}

export default function CatalogPage() {
  const [products, setProducts] = useState<ProductGroup[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/catalog")
      .then(r => r.json())
      .then(d => setProducts(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? products.filter(p =>
        p.name.includes(search) ||
        p.sku.includes(search) ||
        p.specs.some(s => s.carModel?.includes(search) || s.oeCode?.includes(search))
      )
    : products;

  return (
    <div className="min-h-screen bg-[#fffefa]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#fffefa] border-b border-[#aebdae] px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold text-[#244b35] mb-3 text-center">产品目录</h1>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#637066]" />
            <Input
              className="pl-9"
              placeholder="搜索车型、OE码、产品名称..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-[#f3f8f1] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#637066]">
            {search ? "未找到匹配的产品" : "暂无产品"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(product => {
              const firstSpec = product.specs[0];
              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-[4/3] bg-[#dfeadf] flex items-center justify-center">
                    {product.images.length > 0 ? (
                      <img src={product.images[0].filePath} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-[#637066] text-sm">暂无图片</span>
                    )}
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <h3 className="font-medium text-sm line-clamp-2 leading-snug" title={product.name}>{product.name}</h3>
                    {firstSpec && (
                      <div className="space-y-1 text-xs text-[#637066]">
                        {firstSpec.carModel && <p>🚗 {firstSpec.carModel}</p>}
                        {firstSpec.oeCode && <p>🔧 OE: {firstSpec.oeCode}</p>}
                        {firstSpec.spec && <p>📐 {firstSpec.spec}</p>}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      {firstSpec?.salePrice != null && (
                        <span className="text-[#8b4513] font-semibold">{formatPrice(firstSpec.salePrice)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
