import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2, ImagePlus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PhotoUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "rounded";
  placeholder?: string;
  helperText?: string;
}

/** Compress an image file to a target max dimension and JPEG quality */
const compressImage = (file: File, maxDim = 1200, quality = 0.8): Promise<File> =>
  new Promise((resolve) => {
    // Skip non-image or already small files
    if (!file.type.startsWith("image/") || file.size < 100_000) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && file.size < 500_000) {
        resolve(file);
        return;
      }
      if (width > height) {
        if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
      } else {
        if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

export const PhotoUpload = ({
  value,
  onChange,
  folder = "photos",
  className,
  size = "md",
  shape = "rounded",
  placeholder = "Add Photo",
  helperText,
}: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMobile = useIsMobile();

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setOptionsOpen(false);
    if (isMobile) {
      // On mobile, use native camera input for best UX
      cameraInputRef.current?.click();
      return;
    }
    setCameraOpen(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      toast.error("Camera access denied", {
        description: "Please allow camera access in your browser settings and try again.",
      });
      setCameraOpen(false);
    }
  }, [isMobile]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      setCameraOpen(false);
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      await processAndUpload(file);
    }, "image/jpeg", 0.9);
  }, [stopCamera]);

  const handleCloseCameraDialog = useCallback((open: boolean) => {
    if (!open) {
      stopCamera();
      setCameraOpen(false);
    }
  }, [stopCamera]);

  const processAndUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setUploading(true);

    try {
      // Compress before upload
      const compressed = await compressImage(file);

      if (compressed.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB after compression");
        setLocalPreview(null);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        toast.error("Please sign in to upload photos");
        setLocalPreview(null);
        return;
      }

      const userId = sessionData.session.user.id;
      const fileExt = compressed.name.split(".").pop();
      const fileName = `${userId}/${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, compressed, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      onChange(urlData.publicUrl);
      toast.success("Photo uploaded");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo", { description: error.message });
      setLocalPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(previewUrl);
      setLocalPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processAndUpload(file);
  };

  const handleRemove = () => {
    onChange(null);
    setLocalPreview(null);
    setOptionsOpen(false);
  };

  const handleChooseLibrary = () => {
    setOptionsOpen(false);
    fileInputRef.current?.click();
  };

  const displayUrl = localPreview || value;
  const hasPhoto = !!displayUrl;

  const optionsSheet = (
    <Sheet open={optionsOpen} onOpenChange={setOptionsOpen}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="text-left pb-3">
          <SheetTitle className="text-base">Container Photo</SheetTitle>
          <p className="text-xs text-muted-foreground">Optional — helps visually identify containers.</p>
        </SheetHeader>
        <div className="flex flex-col gap-2 pb-2">
          <Button
            type="button"
            variant="outline"
            className="h-14 justify-start gap-3 rounded-xl text-base font-normal"
            onClick={startCamera}
          >
            <Camera className="h-5 w-5 text-primary" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-14 justify-start gap-3 rounded-xl text-base font-normal"
            onClick={handleChooseLibrary}
          >
            <ImagePlus className="h-5 w-5 text-primary" />
            Choose From Library
          </Button>
          {hasPhoto && (
            <Button
              type="button"
              variant="outline"
              className="h-14 justify-start gap-3 rounded-xl text-base font-normal text-destructive hover:text-destructive"
              onClick={handleRemove}
            >
              <Trash2 className="h-5 w-5" />
              Remove Photo
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className={cn("relative group", className)}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Photo display / trigger */}
      {hasPhoto ? (
        <div className={cn("relative", sizeClasses[size])}>
          <img
            src={displayUrl!}
            alt="Uploaded photo"
            className={cn(
              "object-cover w-full h-full border-2 border-muted",
              shape === "circle" ? "rounded-full" : "rounded-lg"
            )}
          />
          {uploading && (
            <div className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/40",
              shape === "circle" ? "rounded-full" : "rounded-lg"
            )}>
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
          {!uploading && (
            <>
              {/* Desktop: hover X button */}
              <button
                type="button"
                onClick={handleRemove}
                className={cn(
                  "absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground shadow-md",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  "md:block hidden"
                )}
              >
                <X className="h-3 w-3" />
              </button>
              {/* Tap overlay to open options */}
              <button
                type="button"
                onClick={() => setOptionsOpen(true)}
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/40 text-white cursor-pointer",
                  isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  "transition-opacity",
                  shape === "circle" ? "rounded-full" : "rounded-lg"
                )}
              >
                <Camera className={iconSizes[size]} />
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => setOptionsOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 border-2 border-dashed border-muted-foreground/25 bg-muted/30",
            "hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer",
            sizeClasses[size],
            shape === "circle" ? "rounded-full" : "rounded-lg"
          )}
        >
          {uploading ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin text-muted-foreground")} />
          ) : (
            <>
              <Camera className={cn(iconSizes[size], "text-muted-foreground")} />
              {size !== "sm" && (
                <span className="text-[10px] text-muted-foreground leading-tight text-center px-1">{placeholder}</span>
              )}
            </>
          )}
        </button>
      )}

      {/* Helper text */}
      {helperText && !hasPhoto && (
        <p className="text-[10px] text-muted-foreground/50 mt-1 text-center max-w-[8rem]">{helperText}</p>
      )}

      {/* Mobile bottom sheet options */}
      {optionsSheet}

      {/* Desktop camera capture dialog */}
      <Dialog open={cameraOpen} onOpenChange={handleCloseCameraDialog}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Take Photo</DialogTitle>
          </DialogHeader>
          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex justify-center gap-3 p-4">
            <Button variant="outline" onClick={() => handleCloseCameraDialog(false)}>
              Cancel
            </Button>
            <Button onClick={capturePhoto} disabled={!cameraReady}>
              <Camera className="h-4 w-4 mr-2" />
              Capture
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
