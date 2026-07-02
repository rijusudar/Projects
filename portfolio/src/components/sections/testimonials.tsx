"use client";

import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { PlaceholderNote } from "@/components/placeholder-note";
import { Stagger, StaggerItem } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { testimonials } from "@/lib/data";

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-28">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-accent/[0.04] to-transparent"
      />
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading eyebrow="Testimonials" title="What people say" />

        <PlaceholderNote text="Testimonials were not part of the resume. Replace these cards in src/lib/data.ts with real quotes from colleagues, managers, or clients." />

        <Stagger className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <StaggerItem key={i} className="h-full">
              <Card className="h-full border-dashed hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-4 p-7">
                  <Quote className="size-7 text-primary-soft/50" />
                  <p className="flex-1 text-sm italic leading-relaxed text-muted-foreground">
                    {t.quote}
                  </p>
                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary-soft">
                      ?
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
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
