"use client";

import { ArrowUp, Globe, Heart, Mail, MessageSquareCode } from "lucide-react";
import { GithubIcon } from "@/components/brand-icons";
import { profile } from "@/lib/data";

const socials = [
  { href: profile.github, icon: GithubIcon, label: "GitHub" },
  { href: profile.stackoverflow, icon: MessageSquareCode, label: "Stack Overflow" },
  { href: profile.website, icon: Globe, label: "Website" },
  { href: `mailto:${profile.emails[0]}`, icon: Mail, label: "Email" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-12 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="font-mono text-sm">
            <span className="text-gradient font-bold">riju</span>
            <span className="text-muted-foreground">.sudar</span>
            <span className="text-accent">()</span>
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground sm:justify-start">
            © {new Date().getFullYear()} {profile.name} · Crafted with
            <Heart className="size-3 fill-primary text-primary" />
            React, Next.js & Framer Motion
          </p>
        </div>

        <div className="flex items-center gap-3">
          {socials.map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-muted-foreground transition-colors duration-300 hover:text-primary-soft"
            >
              <Icon className="size-4.5" />
            </a>
          ))}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="glass ml-2 flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary-soft"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
