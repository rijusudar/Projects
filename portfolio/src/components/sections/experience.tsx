"use client";

import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { experiences } from "@/lib/data";
import { cn } from "@/lib/utils";

/** 14-year interactive career timeline, alternating left/right on desktop. */
export function Experience() {
  return (
    <section id="experience" className="relative mx-auto max-w-6xl px-5 py-28">
      <SectionHeading
        eyebrow="Work History · Timeline"
        title="14 years of shipping for the web"
        description="From junior developer in 2012 to UI Lead Engineer architecting AI-first platforms — every step of the journey."
      />

      <div className="relative">
        {/* Center spine */}
        <div
          aria-hidden
          className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-primary/60 via-accent/40 to-transparent lg:left-1/2"
        />

        <ol className="flex flex-col gap-10">
          {experiences.map((exp, i) => {
            const left = i % 2 === 0;
            return (
              <li key={`${exp.company}-${exp.period}`} className="relative">
                {/* Node on the spine */}
                <div
                  aria-hidden
                  className="absolute left-5 top-7 z-10 -translate-x-1/2 lg:left-1/2"
                >
                  <span
                    className={cn(
                      "block size-3.5 rounded-full border-2 border-background",
                      exp.current
                        ? "bg-accent shadow-[0_0_16px_2px_rgba(34,211,238,0.6)]"
                        : "bg-primary shadow-[0_0_12px_1px_rgba(139,92,246,0.5)]"
                    )}
                  />
                </div>

                {/* Year marker on the opposite side (desktop) */}
                <div
                  className={cn(
                    "absolute top-6 hidden font-mono text-sm text-muted-foreground lg:block",
                    left ? "left-[calc(50%+2.5rem)]" : "right-[calc(50%+2.5rem)]"
                  )}
                >
                  {exp.period}
                </div>

                <motion.div
                  initial={{ opacity: 0, x: left ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "ml-12 lg:ml-0 lg:w-[calc(50%-2.5rem)]",
                    left ? "lg:mr-auto" : "lg:ml-auto"
                  )}
                >
                  <Card
                    className={cn(
                      "group hover:-translate-y-1",
                      exp.current
                        ? "border-accent/40 hover:border-accent/70"
                        : "hover:border-primary/40"
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary-soft">
                          <Briefcase className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-tight">{exp.role}</h3>
                          <p className="text-sm text-primary-soft">{exp.company}</p>
                        </div>
                        {exp.current && (
                          <Badge variant="accent" className="ml-auto">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="mb-4 font-mono text-xs text-muted-foreground lg:hidden">
                        {exp.period}
                      </p>
                      <ul className="flex flex-col gap-2">
                        {exp.highlights.map((h) => (
                          <li
                            key={h}
                            className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
