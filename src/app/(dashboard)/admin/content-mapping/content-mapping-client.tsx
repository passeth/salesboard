"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder,
  Search,
  Plus,
  X,
  FileText,
  AlertTriangle,
  Upload,
  Trash2,
  Loader2,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import {
  getContentMappingOverview,
  getMappedProducts,
  getSlugFiles,
  updateProductContentSlug,
  searchProducts,
  getMappingStats,
  uploadContentFiles,
  deleteContentFileAction,
  deleteSlugContents,
  renameSlugFiles,
} from "./_actions/mapping-actions";
import type {
  SlugOverview,
  MappedProduct,
  SerializedR2ContentFile,
  MappingStats,
  RenameResult,
} from "./_actions/mapping-actions";

type ContentMappingClientProps = {
  initialSlugs: SlugOverview[];
  orphanedSlugs: string[];
  initialStats: MappingStats;
};

const SUBFOLDER_OPTIONS = [
  { value: "__root__", label: "Root (no subfolder)" },
  { value: "banner", label: "Banner" },
  { value: "concepts", label: "Concept Photos" },
  { value: "page-en", label: "Detail Page (EN)" },
  { value: "page-kr", label: "Detail Page (KR)" },
  { value: "page-cn", label: "Detail Page (CN)" },
  { value: "page-jp", label: "Detail Page (JP)" },
  { value: "page-vn", label: "Detail Page (VN)" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "");
}

export function ContentMappingClient({
  initialSlugs,
  orphanedSlugs: initialOrphaned,
  initialStats,
}: ContentMappingClientProps) {
  const [slugs, setSlugs] = useState<SlugOverview[]>(initialSlugs);
  const [orphanedSlugs, setOrphanedSlugs] = useState<string[]>(initialOrphaned);
  const [stats, setStats] = useState<MappingStats>(initialStats);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [slugSearch, setSlugSearch] = useState("");
  const [mappedProducts, setMappedProducts] = useState<MappedProduct[]>([]);
  const [files, setFiles] = useState<SerializedR2ContentFile[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<MappedProduct[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadSubfolder, setUploadSubfolder] = useState("__root__");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createSlugDialogOpen, setCreateSlugDialogOpen] = useState(false);
  const [newSlugName, setNewSlugName] = useState("");
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState(false);
  const [renamingSlug, setRenamingSlug] = useState(false);
  const [renamingAll, setRenamingAll] = useState(false);
  const [renameAllProgress, setRenameAllProgress] = useState<{ current: number; total: number; currentSlug: string } | null>(null);

  const filteredSlugs = slugs.filter((s) =>
    s.slug.toLowerCase().includes(slugSearch.toLowerCase())
  );

  useEffect(() => {
    if (!selectedSlug) {
      setMappedProducts([]);
      setFiles([]);
      return;
    }

    setLoadingProducts(true);
    setLoadingFiles(true);

    getMappedProducts(selectedSlug).then((products) => {
      setMappedProducts(products);
      setLoadingProducts(false);
    });

    getSlugFiles(selectedSlug).then((result) => {
      if (result.success && result.files) {
        setFiles(result.files);
      } else {
        setFiles([]);
      }
      setLoadingFiles(false);
    });
  }, [selectedSlug]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingProducts(true);
    const timer = setTimeout(() => {
      searchProducts(productSearch).then((results) => {
        setSearchResults(results);
        setSearchingProducts(false);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleSelectSlug = (slug: string) => {
    setSelectedSlug(slug === selectedSlug ? null : slug);
  };

  const refreshStats = async () => {
    const newStats = await getMappingStats();
    setStats(newStats);
  };

  const refreshSlugList = async () => {
    const overview = await getContentMappingOverview();
    setSlugs(overview.slugs);
    setOrphanedSlugs(overview.orphanedSlugs);
  };

  const refreshFiles = async () => {
    if (!selectedSlug) return;
    setLoadingFiles(true);
    const result = await getSlugFiles(selectedSlug);
    if (result.success && result.files) {
      setFiles(result.files);
    } else {
      setFiles([]);
    }
    setLoadingFiles(false);
  };

  const handleRemoveMapping = async (productCode: string) => {
    const result = await updateProductContentSlug(productCode, null);
    if (result.success) {
      setMappedProducts((prev) =>
        prev.filter((p) => p.product_code !== productCode)
      );
      setSlugs((prev) =>
        prev.map((s) =>
          s.slug === selectedSlug ? { ...s, mappedCount: s.mappedCount - 1 } : s
        )
      );
      await refreshStats();
      alert(`Removed mapping for ${productCode}`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleAddProduct = async (productCode: string) => {
    if (!selectedSlug) return;

    const result = await updateProductContentSlug(productCode, selectedSlug);
    if (result.success) {
      const products = await getMappedProducts(selectedSlug);
      setMappedProducts(products);
      setSlugs((prev) =>
        prev.map((s) =>
          s.slug === selectedSlug ? { ...s, mappedCount: s.mappedCount + 1 } : s
        )
      );
      await refreshStats();
      setAddDialogOpen(false);
      setProductSearch("");
      setSearchResults([]);
      alert(`Added mapping for ${productCode}`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleUploadFiles = async () => {
    if (!selectedSlug || !fileInputRef.current?.files?.length) return;

    setUploading(true);
    const formData = new FormData();
    formData.set("slug", selectedSlug);
    formData.set("subfolder", uploadSubfolder === "__root__" ? "" : uploadSubfolder);
    const inputFiles = fileInputRef.current.files;
    for (let i = 0; i < inputFiles.length; i++) {
      formData.append("files", inputFiles[i]);
    }

    const result = await uploadContentFiles(formData);
    setUploading(false);

    if (result.success) {
      alert(`Uploaded ${result.uploadedCount} file(s)`);
      setUploadDialogOpen(false);
      setUploadSubfolder("__root__");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshFiles();
      await refreshSlugList();
    } else {
      alert(`Upload error: ${result.error}`);
    }
  };

  const handleDeleteFile = async (file: SerializedR2ContentFile) => {
    setDeletingFile(file.key);
    const result = await deleteContentFileAction(file.key);
    setDeletingFile(null);

    if (result.success) {
      setFiles((prev) => prev.filter((f) => f.key !== file.key));
      alert(`Deleted ${file.fileName}`);
    } else {
      alert(`Delete error: ${result.error}`);
    }
  };

  const handleDeleteSlug = async () => {
    if (!selectedSlug) return;

    setDeletingSlug(true);
    const result = await deleteSlugContents(selectedSlug);
    setDeletingSlug(false);

    if (result.success) {
      alert(`Deleted ${result.deletedCount} files and cleared mappings`);
      setSelectedSlug(null);
      setFiles([]);
      setMappedProducts([]);
      await refreshSlugList();
      await refreshStats();
    } else {
      alert(`Delete error: ${result.error}`);
    }
  };

  const handleCreateSlug = async () => {
    const trimmed = newSlugName.trim();
    if (!trimmed) return;

    if (slugs.some((s) => s.slug === trimmed)) {
      alert("This slug already exists");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.set("slug", trimmed);
    formData.set("subfolder", "");
    const placeholder = new File([new Uint8Array(0)], ".keep", {
      type: "application/octet-stream",
    });
    formData.append("files", placeholder);

    const result = await uploadContentFiles(formData);
    setUploading(false);

    if (result.success) {
      alert(`Created content slug: ${trimmed}`);
      setCreateSlugDialogOpen(false);
      setNewSlugName("");
      await refreshSlugList();
      setSelectedSlug(trimmed);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleRenameSlugFiles = async () => {
    if (!selectedSlug) return;
    setRenamingSlug(true);
    const result = await renameSlugFiles(selectedSlug);
    setRenamingSlug(false);

    if (result.success) {
      alert(`Renamed ${result.renamed} files, skipped ${result.skipped}`);
    } else {
      alert(`Renamed ${result.renamed}, failed ${result.failed}: ${result.errors.join(", ")}`);
    }
    await refreshFiles();
  };

  const handleRenameAllSlugs = async () => {
    setRenamingAll(true);
    const allSlugs = slugs.map((s) => s.slug);
    let totalRenamed = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (let i = 0; i < allSlugs.length; i++) {
      setRenameAllProgress({ current: i + 1, total: allSlugs.length, currentSlug: allSlugs[i] });
      const result = await renameSlugFiles(allSlugs[i]);
      totalRenamed += result.renamed;
      totalSkipped += result.skipped;
      totalFailed += result.failed;
    }

    setRenamingAll(false);
    setRenameAllProgress(null);
    alert(`Complete: renamed ${totalRenamed}, skipped ${totalSkipped}, failed ${totalFailed}`);

    if (selectedSlug) await refreshFiles();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
        <span className="text-sm font-medium">
          Total: <span className="text-foreground">{stats.total}</span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm font-medium">
          Mapped: <span className="text-foreground">{stats.mapped}</span>{" "}
          <span className="text-muted-foreground">({stats.percentage}%)</span>
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm font-medium">
          Unmapped: <span className="text-foreground">{stats.unmapped}</span>
        </span>
        <div className="ml-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={renamingAll || slugs.length === 0}
              >
                {renamingAll ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    {renameAllProgress
                      ? `${renameAllProgress.currentSlug} (${renameAllProgress.current}/${renameAllProgress.total})`
                      : "Renaming..."}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Rename All Files
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rename all files across all slugs?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will rename files in all {slugs.length} content slugs to follow the naming convention.
                  Files already following the convention will be skipped.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRenameAllSlugs}>
                  Rename All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">R2 Content Slugs</CardTitle>
              <Dialog
                open={createSlugDialogOpen}
                onOpenChange={setCreateSlugDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <FolderPlus className="mr-1 h-4 w-4" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Content Slug</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="e.g. FJFC010"
                      value={newSlugName}
                      onChange={(e) => setNewSlugName(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={handleCreateSlug}
                      disabled={!newSlugName.trim() || uploading}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FolderPlus className="mr-2 h-4 w-4" />
                      )}
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search slugs..."
                value={slugSearch}
                onChange={(e) => setSlugSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1">
                {filteredSlugs.map((slugItem) => (
                  <button
                    key={slugItem.slug}
                    onClick={() => handleSelectSlug(slugItem.slug)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedSlug === slugItem.slug
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{slugItem.slug}</span>
                    <Badge
                      variant={
                        slugItem.mappedCount === 0 ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {slugItem.mappedCount === 0 && (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      {slugItem.mappedCount}
                    </Badge>
                  </button>
                ))}
                {filteredSlugs.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No slugs found
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Mapped Products
                  {selectedSlug && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({selectedSlug})
                    </span>
                  )}
                </CardTitle>
                {selectedSlug && (
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="mr-1 h-4 w-4" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Product Mapping</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by code or name..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-1">
                            {searchingProducts ? (
                              <p className="py-4 text-center text-sm text-muted-foreground">
                                Searching...
                              </p>
                            ) : searchResults.length > 0 ? (
                              searchResults.map((product) => (
                                <button
                                  key={product.id}
                                  onClick={() =>
                                    handleAddProduct(product.product_code)
                                  }
                                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {product.product_code}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {product.product_name}
                                    </div>
                                  </div>
                                  <div className="text-right text-xs text-muted-foreground">
                                    <div>{product.brand}</div>
                                    {product.content_slug && (
                                      <div className="text-orange-500">
                                        Current: {product.content_slug}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              ))
                            ) : productSearch.trim() ? (
                              <p className="py-4 text-center text-sm text-muted-foreground">
                                No products found
                              </p>
                            ) : (
                              <p className="py-4 text-center text-sm text-muted-foreground">
                                Type to search products
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingProducts ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Loading...
                </p>
              ) : !selectedSlug ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Select a slug to view mapped products
                </p>
              ) : mappedProducts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No products mapped to this slug
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {mappedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {product.product_code}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {product.product_name}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {product.brand}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleRemoveMapping(product.product_code)
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Content Files
                  {selectedSlug && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({files.length} files)
                    </span>
                  )}
                </CardTitle>
                {selectedSlug && (
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={files.length === 0 || renamingSlug}
                        >
                          {renamingSlug ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-4 w-4" />
                          )}
                          Rename
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rename files in {selectedSlug}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Files will be renamed to {selectedSlug}_category_001.ext format.
                            Files already following this convention will be skipped.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRenameSlugFiles}>
                            Rename Files
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Dialog
                      open={uploadDialogOpen}
                      onOpenChange={setUploadDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Upload className="mr-1 h-4 w-4" />
                          Upload
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Upload to {selectedSlug}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="mb-1.5 block text-sm font-medium">
                              Subfolder
                            </label>
                            <Select
                              value={uploadSubfolder}
                              onValueChange={setUploadSubfolder}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select subfolder" />
                              </SelectTrigger>
                              <SelectContent>
                                {SUBFOLDER_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium">
                              Files
                            </label>
                            <Input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept="image/*,.pdf,.psd,.ai,.eps"
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={handleUploadFiles}
                            disabled={uploading}
                          >
                            {uploading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="mr-2 h-4 w-4" />
                            )}
                            {uploading ? "Uploading..." : "Upload Files"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={files.length === 0}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete All
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete all content for {selectedSlug}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all {files.length} files
                            and remove all product mappings for this slug. This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteSlug}
                            disabled={deletingSlug}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingSlug ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete Everything
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingFiles ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Loading...
                </p>
              ) : !selectedSlug ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Select a slug to preview content
                </p>
              ) : files.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No files in this folder
                </p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {files.map((file) => (
                      <div
                        key={file.key}
                        className="group relative flex flex-col items-center gap-1 rounded-md border p-2"
                      >
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              className="absolute right-1 top-1 rounded bg-destructive/80 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                              disabled={deletingFile === file.key}
                            >
                              {deletingFile === file.key ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete file?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete &quot;{file.fileName}&quot; (
                                {formatFileSize(file.size)})? This cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteFile(file)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {isImageFile(file.fileName) ? (
                          <img
                            src={file.publicUrl}
                            alt={file.fileName}
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="w-full text-center">
                          <p className="truncate text-xs font-medium">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {orphanedSlugs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="flex items-center gap-2 py-3">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-700 dark:text-orange-300">
              Orphaned slugs in DB (not in R2): {orphanedSlugs.join(", ")}
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
