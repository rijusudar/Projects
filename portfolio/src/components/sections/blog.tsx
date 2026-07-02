"use client";

import { ArrowUpRight, CalendarDays } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { PlaceholderNote } from "@/components/placeholder-note";
import { Stagger, StaggerItem } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { blogPosts } from "@/lib/data";

export function Blog() {
  return (
    <section id="blog" className="relative mx-auto max-w-6xl px-5 py-28">
      <SectionHeading
        eyebrow="Blog & Writing"
        title="Thoughts on engineering"
      />

      <PlaceholderNote text="No blog was listed on the resume. These are suggested article topics based on your expertise — swap them for real posts in src/lib/data.ts." />

      <Stagger className="grid gap-5 md:grid-cols-3">
        {blogPosts.map((post) => (
          <StaggerItem key={post.title} className="h-full">
            <Card className="group h-full cursor-not-allowed border-dashed hover:border-primary/40">
              <CardContent className="flex h-full flex-col gap-4 p-7">
                <div className="flex items-center justify-between">
                  <Badge>{post.tag}</Badge>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-soft" />
                </div>
                <h3 className="font-semibold leading-snug">{post.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {post.date}
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
