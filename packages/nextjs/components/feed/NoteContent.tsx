"use client";

import { useState } from "react";
import Image from "next/image";
import { extractImageUrls } from "~~/utils/nostr/parsing";

interface NoteContentProps {
  content: string;
}

export function NoteContent({ content }: NoteContentProps) {
  const images = extractImageUrls(content);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  let displayText = content;
  images.forEach(url => {
    displayText = displayText.replace(url, "").trim();
  });

  return (
    <div>
      {displayText && (
        <p className="text-sm text-base-content/90 whitespace-pre-wrap break-words leading-relaxed">
          {displayText.split(/(https?:\/\/[^\s<]+)/g).map((part, i) => {
            if (part.match(/^https?:\/\//)) {
              return (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline underline-offset-2"
                >
                  {part.length > 50 ? part.slice(0, 47) + "..." : part}
                </a>
              );
            }
            return part;
          })}
        </p>
      )}
      {images.length > 0 && (
        <div className={`mt-3 ${images.length === 1 ? "" : "grid grid-cols-2 gap-2"}`}>
          {images.slice(0, 4).map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl"
            >
              <Image
                src={url}
                alt=""
                width={500}
                height={300}
                className={`w-full object-cover max-h-80 transition-all duration-300 hover:scale-[1.02] ${
                  loadedImages.has(i) ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setLoadedImages(prev => new Set(prev).add(i))}
                unoptimized
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
