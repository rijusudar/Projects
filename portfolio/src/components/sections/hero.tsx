"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  Download,
  Globe,
  Mail,
  MapPin,
  MessageSquareCode,
  Sparkles,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import { profile } from "@/lib/data";

/** Cycles through the roles from the resume with a typewriter effect. */
function useTypewriter(words: string[], typeMs = 65, holdMs = 1800) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index % words.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && text === word) {
      timeout = setTimeout(() => setDeleting(true), holdMs);
    } else if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
    } else {
      timeout = setTimeout(
        () => setText(word.slice(0, text.length + (deleting ? -1 : 1))),
        deleting ? typeMs / 2 : typeMs
      );
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, index, words, typeMs, holdMs]);

  return text;
}

const socials = [
  { href: profile.github, icon: GithubIcon, label: "GitHub" },
  { href: profile.stackoverflow, icon: MessageSquareCode, label: "Stack Overflow" },
  { href: profile.website, icon: Globe, label: "Website" },
  { href: `mailto:${profile.emails[0]}`, icon: Mail, label: "Email" },
];

export function Hero() {
  const typed = useTypewriter(profile.roles);

  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden pt-16"
    >
      {/* Ambient background: aurora blobs + dotted grid */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -top-40 left-1/4 size-[34rem] rounded-full bg-primary/25 blur-[130px] animate-aurora" />
        <div
          className="absolute top-1/3 -right-32 size-[28rem] rounded-full bg-accent/15 blur-[120px] animate-aurora"
          style={{ animationDelay: "-6s" }}
        />
        <div className="absolute bottom-0 left-0 h-40 w-full bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start gap-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
            <Sparkles className="size-3.5" />
            {profile.yearsOfExperience}+ years crafting the web · since {profile.workingSince}
          </span>

          <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Hi, I&apos;m <span className="text-gradient">{profile.name}</span>
            <span className="text-accent">.</span>
          </h1>

          <p className="font-mono text-lg text-muted-foreground sm:text-xl">
            <span className="text-primary-soft">&gt;</span> {typed}
            <span className="ml-0.5 inline-block h-5 w-[2px] translate-y-1 bg-accent animate-pulse-glow" />
          </p>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {profile.summary} I architect AI-driven enterprise UIs with React,
            Next.js, Angular and Node — shaping experiences that are visually
            engaging, accessible, and built to scale.
          </p>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-primary-soft" />
            {profile.location}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4">
            <a href="#projects">
              <Button size="lg">
                View My Work <ArrowDown />
              </Button>
            </a>
            <a href="/resume">
              <Button size="lg" variant="outline">
                <Download /> Download Resume
              </Button>
            </a>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {socials.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="glass flex size-11 items-center justify-center rounded-full text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary-soft"
              >
                <Icon className="size-5" />
              </a>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.a
        href="#about"
        aria-label="Scroll to About"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-muted-foreground sm:block"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ArrowDown className="size-5" />
      </motion.a>
    </section>
  );
}
