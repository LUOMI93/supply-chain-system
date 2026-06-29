"use client";

interface LightboxProps {
  images: string[];
  onClose: () => void;
}

export function Lightbox({ images, onClose }: LightboxProps) {
  if (images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-6 text-white text-2xl hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center"
        onClick={onClose}
      >
        ×
      </button>
      <div
        className="flex flex-wrap gap-3 justify-center p-5 max-w-[90vw] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt=""
            className="max-w-[90vw] max-h-[80vh] object-contain rounded"
          />
        ))}
      </div>
    </div>
  );
}
