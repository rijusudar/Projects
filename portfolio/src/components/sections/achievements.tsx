"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { achievements } from "@/lib/data";

/** Counts up to the numeric part of a metric like "40+" when scrolled into view. */
function CountUp({ metric }: { metric: string }) {
  const target = parseInt(metric, 10);
  const suffix = metric.replace(String(target), "");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView || Number.isNaN(target)) return;
    const duration = 1400;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return (
    <span ref={ref} className="text-gradient text-5xl font-bold tabular-nums">
      {Number.isNaN(target) ? metric : `${value}${suffix}`}
    </span>
  );
}

export function Achievements() {
  return (
    <section id="achievements" className="relative py-28">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary/[0.06] to-transparent"
      />
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Achievements"
          title="Numbers that tell the story"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((a, i) => (
            <motion.div
              key={a.label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <Card className="h-full text-center hover:-translate-y-1 hover:border-primary/40">
                <CardContent className="flex h-full flex-col items-center gap-3 p-8">
                  <CountUp metric={a.metric} />
                  <h3 className="font-semibold">{a.label}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{a.detail}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
