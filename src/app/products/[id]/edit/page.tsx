"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Upload, Factory, Package, ImageIcon, Pencil } from "lucide-react";

type SpecInput = {
  id?: number;
  sku: string; factoryCode: string; spec: string;
  costPrice: string; salePrice: string; carModel: string; oeCode: string;
};

type Supplier = { id: number; name: string; productCount?: number };

type ProductDetail = {
  id: number;
  sku: string;
  name: string;
  productLink: string | null;
  productWeight: string | null;
  productSize: string | null;
  packageSize: string | null;
  packageWeight: string | null;
  boxQuantity: string | null;
  remark: string | null;
  isPublic: boolean;
  supplier: Supplier;
  specs: Array<{
    id: number;
    sku: string;
    factoryCode: string | null;
    spec: string | null;
    costPrice: string | null;
    salePrice: string | null;
    carModel: string | null;
    oeCode: string | null;
  }>;
  images: Array<{ id: number; filePath: string }>;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = (params?.id ?? "") as string;
  const { data: session, status } = useSession();
  const role = session?.user?.role || "viewer";
  const isLoading = status === "loading";

  useEffect(() => {
    if (isLoading) return;
    if (role === "viewer") {
      router.push("/403");
    }
  }, [isLoading, role, router]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierSelectorOpen, setSupplierSelectorOpen] = useState(false);

  const [sku, setSku] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [name, setName] = useState("");
  const [productLink, setProductLink] = useState("");
  const [productWeight, setProductWeight] = useState("");
  const [productSize, setProductSize] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [packageWeight, setPackageWeight] = useState("");
  const [boxQuantity, setBoxQuantity] = useState("");
  const [remark, setRemark] = useState("");
  const [specs, setSpecs] = useState<SpecInput[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [originalImages, setOriginalImages] = useState<Array<{ id: number; filePath: string }>>([]);

  useEffect(() => {
    fetch("/api/suppliers").then(r => r.json()).then(d => setSuppliers(d.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/products?id=${productId}`)
      .then(r => r.json())
      .then(d => {
        if (d.data && d.data.length > 0) {
          const p: ProductDetail = d.data[0];
          setSku(p.sku);
          setSupplierId(String(p.supplier.id));
          setSupplierName(p.supplier.name);
          setName(p.name);
          setProductLink(p.productLink || "");
          setProductWeight(p.productWeight || "");
          setProductSize(p.productSize || "");
          setPackageSize(p.packageSize || "");
          setPackageWeight(p.packageWeight || "");
          setBoxQuantity(p.boxQuantity || "");
          setRemark(p.remark || "");
          setSpecs(p.specs.map(s => ({
            id: s.id,
            sku: s.sku || "",
            factoryCode: s.factoryCode || "",
            spec: s.spec || "",
            costPrice: s.costPrice?.toString() || "",
            salePrice: s.salePrice?.toString() || "",
            carModel: s.carModel || "",
            oeCode: s.oeCode || "",
          })));
          setOriginalImages(p.images || []);
          setImages(p.images?.map(i => i.filePath) || []);
        }
      })
      .catch(() => toast.error("加载产品失败"))
      .finally(() => setLoading(false));
  }, [productId]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    for (const item of e.clipboardData?.items || []) {
      if (item.type.startsWith("image/")) { const f = item.getAsFile(); if (f) addImage(f); }
    }
  }, [images.length]);

  function addImage(file: File) {
    if (images.length >= 20) { toast.warning("最多 20 张图片"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.warning("单张图片不超过 10MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setImages(prev => [...prev, ev.target?.result as string]);
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  function updateSpec(idx: number, field: keyof SpecInput, value: string) {
    setSpecs(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function selectSupplier(s: Supplier) {
    setSupplierId(String(s.id));
    setSupplierName(s.name);
    setSupplierSelectorOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) { toast.error("产品组SKU 和 产品名称为必填"); return; }
    if (!supplierId) { toast.error("请选择供应商"); return; }
    const validSpecs = specs.filter(s => s.spec || s.sku);
    if (validSpecs.length === 0) { toast.error("至少需要一个规格"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: parseInt(productId),
          sku: sku.trim(), supplierId: parseInt(supplierId), name: name.trim(),
          productLink: productLink.trim() || null, productWeight: productWeight.trim() || null,
          productSize: productSize.trim() || null, packageSize: packageSize.trim() || null,
          packageWeight: packageWeight.trim() || null, boxQuantity: boxQuantity.trim() || null,
          remark: remark.trim() || null,
          specs: validSpecs.map(s => ({
            id: s.id,
            sku: s.sku || `${sku}-${Date.now()}`,
            factoryCode: s.factoryCode || null,
            spec: s.spec || null,
            costPrice: s.costPrice || null,
            salePrice: s.salePrice || null,
            carModel: s.carModel || null,
            oeCode: s.oeCode || null,
          })),
          images,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `请求失败 (${res.status})` }));
        toast.error(err.error || `保存失败 (${res.status})`);
        return;
      }
      toast.success("产品已更新");
      router.push("/");
      router.refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "网络错误，保存失败"); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8f4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8f4]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-gray-100/80 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="h-10 w-10 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Pencil className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[17px] font-bold text-gray-800 leading-tight tracking-tight">编辑商品</h1>
                <p className="text-[12px] text-gray-400 leading-tight mt-0.5">Edit Product</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/")} className="h-10 rounded-xl border-gray-200 px-4">取消</Button>
              <Button className="h-10 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md shadow-blue-600/20 px-5" onClick={handleSubmit} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Left Panel */}
        <div className="w-[58%] overflow-y-auto p-6 border-r border-gray-100">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-800">产品组信息</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-600 font-medium">产品组SKU *</Label>
                  <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="如 MSL-00001" className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10" />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-600 font-medium">供应商 *</Label>
                  <div className="relative">
                    <Button
                      variant="outline"
                      onClick={() => setSupplierSelectorOpen(!supplierSelectorOpen)}
                      className={`w-full h-10 rounded-xl justify-start text-left px-3 ${supplierId ? "text-blue-700 border-blue-200 bg-blue-50" : "text-gray-500 border-gray-200 bg-gray-50/60"}`}
                    >
                      <Factory className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">{supplierName || "选择供应商"}</span>
                      {supplierId && (
                        <span
                          className="ml-auto shrink-0 w-5 h-5 rounded-full bg-blue-200 hover:bg-blue-300 flex items-center justify-center text-[11px] font-bold text-blue-700 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setSupplierId(""); setSupplierName(""); }}
                        >
                          ×
                        </span>
                      )}
                    </Button>
                    {supplierSelectorOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setSupplierSelectorOpen(false)} />
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-full max-h-[280px] overflow-y-auto smooth-appear">
                          <div className="py-1">
                            {suppliers.map((s) => (
                              <button
                                key={s.id}
                                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${supplierId === String(s.id) ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600"}`}
                                onClick={() => selectSupplier(s)}
                              >
                                <div className="flex items-center gap-2">
                                  <Factory className="w-4 h-4 text-gray-400" />
                                  <span className="truncate">{s.name}</span>
                                </div>
                                <span className="text-xs text-gray-400 shrink-0">{s.productCount ?? 0}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5 mt-4">
                <Label className="text-[13px] text-gray-600 font-medium">产品名称 *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="产品名称" className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10" />
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800">详细信息</h3>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[13px] text-gray-600 font-medium">产品链接</Label>
                <Input value={productLink} onChange={e => setProductLink(e.target.value)} placeholder="https://detail.1688.com/..." className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-1.5"><Label className="text-[13px] text-gray-600 font-medium">产品重量</Label><Input value={productWeight} onChange={e => setProductWeight(e.target.value)} placeholder="如 400g" className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10" /></div>
                <div className="space-y-1.5"><Label className="text-[13px] text-gray-600 font-medium">产品尺寸</Label><Input value={productSize} onChange={e => setProductSize(e.target.value)} placeholder="长*宽*高" className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10" /></div>
                <div className="space-y-1.5"><Label className="text-[13px] text-gray-600 font-medium">包装尺寸</Label><Input value={packageSize} onChange={e => setPackageSize(e.target.value)} placeholder="长*宽*高" className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10" /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5"><Label className="text-[13px] text-gray-600 font-medium">包装重量</Label><Input value={packageWeight} onChange={e => setPackageWeight(e.target.value)} placeholder="如 20KG" className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10" /></div>
                <div className="space-y-1.5"><Label className="text-[13px] text-gray-600 font-medium">装箱数</Label><Input value={boxQuantity} onChange={e => setBoxQuantity(e.target.value)} placeholder="如 50对一箱" className="h-10 rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10" /></div>
              </div>
              
              <div className="space-y-1.5 mt-4">
                <Label className="text-[13px] text-gray-600 font-medium">备注</Label>
                <Textarea value={remark} onChange={e => setRemark(e.target.value)} rows={2} placeholder="附加说明" className="rounded-xl bg-gray-50/60 border border-gray-200 text-[13px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10" />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800">产品图片</h3>
              <span className="text-xs text-gray-400 ml-auto">{images.length}/20</span>
            </div>
            <div 
              className="flex flex-wrap gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
              onClick={() => document.getElementById("imgInput")?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(f => { if (f.type.startsWith("image/")) addImage(f); }); }}
            >
              {images.map((img, i) => (
                <div key={i} className="relative w-[80px] h-[68px] rounded-lg border overflow-hidden shadow-sm">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <span
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-sm cursor-pointer"
                    onClick={e => { e.stopPropagation(); setImages(prev => prev.filter((_, j) => j !== i)); }}
                  >
                    ×
                  </span>
                </div>
              ))}
              {images.length < 20 && (
                <div className="w-[80px] h-[68px] flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors">
                  <Upload className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px]">点击上传</span>
                </div>
              )}
            </div>
            <input id="imgInput" type="file" accept="image/*" multiple className="hidden" onChange={e => { const files = e.target.files; if (files) Array.from(files).forEach(f => { if (f.type.startsWith("image/")) addImage(f); }); }} />
            <p className="text-[11px] text-gray-400 mt-2">支持拖拽上传、粘贴截图（Ctrl+V）</p>
          </div>
        </div>

        {/* Right Panel - Specs */}
        <div className="w-[42%] flex flex-col bg-[#f7faf4]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-800">规格列表</h2>
              <span className="text-xs text-gray-400 ml-1">({specs.length})</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSpecs(prev => [...prev, { sku: "", factoryCode: "", spec: "", costPrice: "", salePrice: "", carModel: "", oeCode: "" }])} className="h-8 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300">
              <Plus className="w-3.5 h-3.5 mr-1" />添加规格
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {specs.map((spec, idx) => (
                <Card key={idx} className="bg-white border-gray-100 shadow-sm">
                  <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center text-[11px] font-bold text-blue-600">#{idx + 1}</span>
                      <CardTitle className="text-sm font-medium text-gray-700">规格</CardTitle>
                    </div>
                    {specs.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => setSpecs(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-[11px] text-gray-500 font-medium">规格SKU</Label><Input className="h-8 text-sm rounded-lg bg-gray-50/60 border-gray-200 focus:border-blue-500/50" value={spec.sku} onChange={e => updateSpec(idx, "sku", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-[11px] text-gray-500 font-medium">工厂编号</Label><Input className="h-8 text-sm rounded-lg bg-gray-50/60 border-gray-200 focus:border-blue-500/50" value={spec.factoryCode} onChange={e => updateSpec(idx, "factoryCode", e.target.value)} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-[11px] text-gray-500 font-medium">产品规格</Label><Input className="h-8 text-sm rounded-lg bg-gray-50/60 border-gray-200 focus:border-blue-500/50" value={spec.spec} onChange={e => updateSpec(idx, "spec", e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-[11px] text-gray-500 font-medium">拿货价格(元)</Label><Input className="h-8 text-sm rounded-lg bg-gray-50/60 border-gray-200 focus:border-blue-500/50" type="text" value={spec.costPrice} onChange={e => updateSpec(idx, "costPrice", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-[11px] text-gray-500 font-medium">销售价格(元)</Label><Input className="h-8 text-sm rounded-lg bg-gray-50/60 border-gray-200 focus:border-blue-500/50" type="text" value={spec.salePrice} onChange={e => updateSpec(idx, "salePrice", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-[11px] text-gray-500 font-medium">适配车型</Label><Input className="h-8 text-sm rounded-lg bg-gray-50/60 border-gray-200 focus:border-blue-500/50" value={spec.carModel} onChange={e => updateSpec(idx, "carModel", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-[11px] text-gray-500 font-medium">OE码</Label><Input className="h-8 text-sm rounded-lg bg-gray-50/60 border-gray-200 focus:border-blue-500/50" value={spec.oeCode} onChange={e => updateSpec(idx, "oeCode", e.target.value)} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
