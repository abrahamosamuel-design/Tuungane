import * as React from "react";
import { cn } from "@/lib/utils";

const AvatarContext = React.createContext<{
  hasImage: boolean;
  setHasImage: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  hasImage: false,
  setHasImage: () => {},
});

export function Avatar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [hasImage, setHasImage] = React.useState(false);

  return (
    <AvatarContext.Provider value={{ hasImage, setHasImage }}>
      <div
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  );
}

export function AvatarImage({
  className,
  src,
  onError,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { setHasImage } = React.useContext(AvatarContext);

  React.useEffect(() => {
    if (src) {
      setHasImage(true);
    } else {
      setHasImage(false);
    }
  }, [src, setHasImage]);

  const handleLoadError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasImage(false);
    if (onError) onError(e);
  };

  if (!src) return null;

  return (
    <img
      src={src}
      onError={handleLoadError}
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  );
}

export function AvatarFallback({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { hasImage } = React.useContext(AvatarContext);

  if (hasImage) return null;

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
