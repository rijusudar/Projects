"use client";

import {
  Accessibility,
  BarChart3,
  Boxes,
  BrainCircuit,
  Cloud,
  Code2,
  HeartPulse,
  Layers,
} from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Stagger, StaggerItem } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { marqueeSkills, skillGroups } from "@/lib/data";

const groupIcons = [
  Code2, // Core Web
  Boxes, // React Ecosystem
  Layers, // Frameworks & Languages
  Cloud, // Backend & Cloud
  HeartPulse, // Healthcare Tech
  BrainCircuit, // AI Engineering
  BarChart3, // Data Viz
  Accessibility, // Design & UX
];

function MarqueeStrip() {
  const doubled = [...marqueeSkills, ...marqueeSkills];
  return (
    <div className="relative mb-16 overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max gap-3 animate-marquee hover:[animation-play-state:paused]">
        {doubled.map((skill, i) => (
          <span
            key={`${skill}-${i}`}
            className="glass whitespace-nowrap rounded-full px-5 py-2.5 font-mono text-sm text-secondary-foreground"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Skills() {
  return (
    <section id="skills" className="relative py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Skills & Technical Expertise"
          title="A full-spectrum front-end arsenal"
          description="From hand-coded, standards-compliant HTML and CSS to AI-driven engineering workflows — every layer of the modern web stack."
        />
      </div>

      <MarqueeStrip />

      <div className="mx-auto max-w-6xl px-5">
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((group, i) => {
            const Icon = groupIcons[i % groupIcons.length];
            return (
              <StaggerItem key={group.category} className="h-full">
                <Card className="group h-full hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_20px_50px_-20px_rgba(139,92,246,0.35)]">
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-accent/15 text-primary-soft transition-transform duration-300 group-hover:scale-110">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="font-semibold leading-tight">{group.category}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="px-2.5 py-0.5">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
