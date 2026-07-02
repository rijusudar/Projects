"use client";

import { CheckCircle2, Fingerprint, Languages, Palette, Ruler } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { languages, profile } from "@/lib/data";

const traits = [
  {
    icon: Fingerprint,
    title: "Data-Driven Designer",
    text: "Shaping user experiences from user research and analysis of quantitative and qualitative data.",
  },
  {
    icon: Palette,
    title: "Visual Craft",
    text: "Strong visual design skills and natural artistic ability — products that are engaging and highly usable.",
  },
  {
    icon: Ruler,
    title: "Standards First",
    text: "Hand-coded HTML/CSS to W3C standards, WCAG 2.0 accessibility, and progressive enhancement.",
  },
];

export function About() {
  return (
    <section id="about" className="relative mx-auto max-w-6xl px-5 py-28">
      <SectionHeading
        eyebrow="About Me"
        title="Architecture, design & code — one craft"
        description={profile.summary}
      />

      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <Reveal className="flex flex-col gap-6">
          {profile.about.map((paragraph) => (
            <p key={paragraph} className="text-base leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}

          <div className="mt-2">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary-soft">
              Full project life cycle experience
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {profile.lifecycle.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <Languages className="size-4 text-primary-soft" />
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <Badge key={lang} variant="subtle">
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        </Reveal>

        <Stagger className="flex flex-col gap-4">
          {traits.map(({ icon: Icon, title, text }) => (
            <StaggerItem key={title}>
              <Card className="group hover:-translate-y-1 hover:border-primary/40">
                <CardContent className="flex gap-4 p-6">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft transition-colors duration-300 group-hover:bg-primary/25">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">{title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
