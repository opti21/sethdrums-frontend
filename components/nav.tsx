"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useSession } from "./session";
import { cn } from "@/lib/client/cn";

export function Nav() {
  const { user, role } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Suggestions" },
    { href: "/previously-played", label: "Played" },
    ...(user ? [{ href: "/my-songs", label: "My Songs" }] : []),
    ...(role !== "viewer" ? [{ href: "/mod", label: "Mod" }] : []),
    ...(role === "seth" ? [{ href: "/seth", label: "Seth" }] : []),
  ];

  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(pathname || "/")}`;

  const linkList = (
    <>
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold transition",
              active ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );

  const account = user ? (
    <div className="flex items-center gap-3">
      {user.picture && (
        <Image
          src={user.picture}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-full ring-2 ring-neon-pink/50"
          unoptimized
        />
      )}
      <span className="text-sm font-semibold">{user.username}</span>
      {/* A plain link: logout is a full page navigation through Auth0. */}
      <a href="/api/auth/logout" className="text-sm text-ink-300 hover:text-white">
        Sign out
      </a>
    </div>
  ) : (
    <a
      href={loginHref}
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#9146ff] px-4 text-sm font-semibold text-white hover:brightness-110"
    >
      Sign in with Twitch
    </a>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/SD_Logo_Neon.png" alt="SethDrums" width={78} height={40} priority className="h-9 w-auto" />
          <span className="hidden font-display text-sm font-bold tracking-widest text-white uppercase sm:inline">
            Song Panel
          </span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">{linkList}</nav>
        <div className="ml-auto hidden md:block">{account}</div>
        <button
          className="ml-auto rounded-lg p-2 text-ink-300 hover:bg-white/5 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/5 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">{linkList}</nav>
          <div className="mt-3 border-t border-white/5 pt-3">{account}</div>
        </div>
      )}
    </header>
  );
}
