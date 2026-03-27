"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Package, Plus, Star, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  uploadProductImage,
  deleteProductImage,
  setPrimaryProductImage,
} from "../_actions/product-image-actions";

type ProductImage = {
  url: string;
  key: string;
  fileName: string;
};

type Props = {
  productId: string;
  sku: string;
  primaryImageUrl: string | null;
  images: ProductImage[];
  isAdmin: boolean;
};

export function ProductImageManager({
  productId,
  sku,
  primaryImageUrl,
  images: initialImages,
  isAdmin,
}: Props) {
  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [primary, setPrimary] = useState<string | null>(primaryImageUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrentIndex(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrentIndex(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api],
  );

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadProductImage(productId, sku, formData);
      if (result.success && result.imageUrl) {
        const fileName = result.imageUrl.split("/").pop()!;
        const newImage: ProductImage = {
          url: result.imageUrl,
          key: `products/${sku}/${fileName}`,
          fileName,
        };
        setImages((prev) => [...prev, newImage]);
        if (!primary) {
          setPrimary(result.imageUrl);
        }
      } else {
        setError(result.error ?? "Upload failed");
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = (image: ProductImage) => {
    setDeleteTarget(image);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setError(null);

    startTransition(async () => {
      const result = await deleteProductImage(productId, target.url);
      if (result.success) {
        setImages((prev) => prev.filter((img) => img.url !== target.url));
        if (primary === target.url) {
          const remaining = images.filter((img) => img.url !== target.url);
          setPrimary(remaining.length > 0 ? remaining[0].url : null);
        }
      } else {
        setError(result.error ?? "Delete failed");
      }
    });
  };

  const handleSetPrimary = (imageUrl: string) => {
    setError(null);
    startTransition(async () => {
      const result = await setPrimaryProductImage(productId, imageUrl);
      if (result.success) {
        setPrimary(imageUrl);
      } else {
        setError(result.error ?? "Failed to set primary image");
      }
    });
  };

  if (images.length === 0) {
    return (
      <div className="flex w-full max-w-[800px] flex-col items-center gap-4">
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border bg-muted/30">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Package className="size-16" />
            <span className="text-sm">No image available</span>
          </div>
        </div>
        {isAdmin && (
          <>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              Add Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className="flex w-full max-w-[800px] flex-col gap-3">
      <div className="relative">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {images.map((image) => (
              <CarouselItem key={image.key}>
                <div className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                  <img
                    src={image.url}
                    alt={image.fileName}
                    className="max-h-full max-w-full object-contain"
                  />

                  {image.url === primary && (
                    <div className="absolute left-2 top-2">
                      <Star className="size-5 fill-yellow-400 text-yellow-400 drop-shadow" />
                    </div>
                  )}

                  {isAdmin && (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/50 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                      {image.url !== primary && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSetPrimary(image.url)}
                          disabled={isPending}
                        >
                          <Star className="mr-1.5 size-3.5" />
                          Set Primary
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(image)}
                        disabled={isPending}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {images.length > 1 && (
            <>
              <CarouselPrevious className="-left-4 size-9" />
              <CarouselNext className="-right-4 size-9" />
            </>
          )}
        </Carousel>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.key}
              type="button"
              onClick={() => scrollTo(index)}
              className={`relative size-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                index === currentIndex
                  ? "border-primary ring-1 ring-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={image.url}
                alt={image.fileName}
                className="size-full object-cover"
              />
              {image.url === primary && (
                <div className="absolute left-0.5 top-0.5">
                  <Star className="size-3 fill-yellow-400 text-yellow-400 drop-shadow" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground">
        {currentImage?.fileName}
        {images.length > 1 && ` (${currentIndex + 1} / ${images.length})`}
      </div>

      {isAdmin && (
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plus className="mr-2 size-4" />
          )}
          Add Image
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.fileName}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
