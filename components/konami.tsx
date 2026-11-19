"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "./ui/dialog";

const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Up Up Down Down Left Right Left Right B A. You know what it does. */
export function Konami() {
  const [open, setOpen] = useState(false);
  const progress = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      progress.current = key === CODE[progress.current] ? progress.current + 1 : key === CODE[0] ? 1 : 0;
      if (progress.current === CODE.length) {
        progress.current = 0;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open && audio.current) {
      audio.current.volume = 0.5;
      audio.current.currentTime = 0;
      void audio.current.play().catch(() => {});
    }
  }, [open]);

  return (
    <>
      <audio ref={audio} src="/drama_fart.ogg" preload="none" />
      <Dialog open={open} onOpenChange={setOpen} title="You found it!">
        <p>Here&apos;s your prize.</p>
      </Dialog>
    </>
  );
}
