"use client";

import { GithubIcon } from "@/components/brand-icons";
import { SectionHeading } from "@/components/section-heading";
import { PlaceholderNote } from "@/components/placeholder-note";
import { Stagger, StaggerItem } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { githubStats, profile } from "@/lib/data";

export function GithubStats() {
  return (
    <section id="github" className="relative mx-auto max-w-6xl px-5 py-28">
      <SectionHeading
        eyebrow="GitHub"
        title="Open source footprint"
        description={`@${githubStats.username} on GitHub`}
      />

      <PlaceholderNote text={githubStats.note} />

      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {githubStats.stats.map((stat) => (
          <StaggerItem key={stat.label}>
            <Card className="border-dashed text-center hover:border-primary/40">
              <CardContent className="flex flex-col items-center gap-2 p-8">
                <span className="font-mono text-4xl font-bold text-primary-soft/60">
                  {stat.value}
                </span>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-10 flex justify-center">
        <a href={profile.github} target="_blank" rel="noopener noreferrer">
          <Button variant="outline">
            <GithubIcon /> Visit github.com/{githubStats.username}
          </Button>
        </a>
      </div>
    </section>
  );
}
