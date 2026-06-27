import { useCallback, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

async function getCroppedBlob(src: string, area: Area, mime = "image/jpeg"): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  const size = Math.min(1600, Math.round(area.width));
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Crop failed"))), mime, 0.9)
  );
}

type Props = {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
  onUseOriginal: (file: File) => void;
};

export function ImageCropDialog({ file, open, onCancel, onConfirm, onUseOriginal }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleConfirm = async () => {
    if (!file || !url || !area) return;
    try {
      setBusy(true);
      const blob = await getCroppedBlob(url, area, "image/jpeg");
      const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      onConfirm(new File([blob], name, { type: "image/jpeg" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop your photo</DialogTitle>
          <DialogDescription>Square crops look best on provider cards. Drag to reposition, pinch or slide to zoom.</DialogDescription>
        </DialogHeader>
        <div className="relative w-full aspect-square bg-muted rounded-md overflow-hidden">
          {url && (
            <Cropper
              image={url}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
            />
          )}
        </div>
        <div className="px-1">
          <label className="text-[11px] text-muted-foreground">Zoom</label>
          <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0])} />
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="ghost" onClick={() => file && onUseOriginal(file)} disabled={busy}>
            Skip cropping
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={handleConfirm} disabled={busy || !area}>
            {busy ? "Preparing…" : "Use this crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
