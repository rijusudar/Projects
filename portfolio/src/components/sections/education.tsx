"use client";

import { Award, GraduationCap } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { certifications, education } from "@/lib/data";

export function Education() {
  return (
    <section id="education" className="relative mx-auto max-w-6xl px-5 py-28">
      <SectionHeading eyebrow="Education & Certifications" title="Foundations" />

      <div className="grid gap-5 md:grid-cols-2">
        <Reveal>
          <Card className="h-full hover:-translate-y-1 hover:border-primary/40">
            <CardContent className="flex gap-5 p-8">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-accent/15 text-primary-soft">
                <GraduationCap className="size-7" />
              </div>
              <div>
                <Badge variant="subtle" className="mb-3 font-mono">
                  {education.period}
                </Badge>
                <h3 className="text-lg font-semibold leading-snug">{education.degree}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{education.institution}</p>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.15}>
          <Card className="h-full hover:-translate-y-1 hover:border-accent/40">
            <CardContent className="flex gap-5 p-8">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 to-primary/15 text-accent">
                <Award className="size-7" />
              </div>
              <div>
                <Badge variant="accent" className="mb-3 font-mono">
                  Certification
                </Badge>
                {certifications.map((cert) => (
                  <div key={cert.name}>
                    <h3 className="text-lg font-semibold leading-snug">{cert.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{cert.issuer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
