'use client';
import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface ImageViewerProps {
  images: { url: string; alt?: string }[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [publicUrl, setPublicUrl] = useState<string>('');
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (images[currentIndex]) {
      // Get public URL for the image
      const { data } = supabase.storage.from('valve-photos').getPublicUrl(images[currentIndex].url);
      setPublicUrl(data.publicUrl);
    }
  }, [currentIndex, images]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, images.length]);

  if (!images.length) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
        <X className="w-8 h-8" />
      </button>
      
      <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {publicUrl && (
          <img src={publicUrl} alt={images[currentIndex].alt} className="max-h-[80vh] object-contain rounded-lg shadow-2xl" />
        )}
        
        <div className="mt-4 text-white/80 text-sm">{images[currentIndex].alt || `Image ${currentIndex + 1} of ${images.length}`}</div>
        
        {images.length > 1 && (
          <>
            <button onClick={() => setCurrentIndex((i) => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={() => setCurrentIndex((i) => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}