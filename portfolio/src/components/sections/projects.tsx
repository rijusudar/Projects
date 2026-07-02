"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, FolderGit2, Star } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projectDomains, projects, type Project } from "@/lib/data";
import { cn } from "@/lib/utils";

function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Card className="group relative h-full overflow-hidden hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-[0_24px_60px_-24px_rgba(139,92,246,0.45)]">
        {/* Hover sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
        <CardContent className="relative flex h-full flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-accent/15 text-primary-soft transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
              <FolderGit2 className="size-5" />
            </div>
            {project.featured && (
              <Badge variant="accent" className="gap-1">
                <Star className="size-3" /> Featured
              </Badge>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold leading-tight">{project.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-primary-soft">
              <Building2 className="size-3.5" />
              {project.client}
            </p>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {project.description}
          </p>

          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {project.tech.map((t) => (
              <Badge key={t} variant="outline" className="px-2 py-0.5 text-[11px]">
                {t}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function Projects() {
  const [domain, setDomain] = useState<(typeof projectDomains)[number]>("All");
  const filtered =
    domain === "All" ? projects : projects.filter((p) => p.domain === domain);

  return (
    <section id="projects" className="relative mx-auto max-w-6xl px-5 py-28">
      <SectionHeading
        eyebrow="Projects · Interactive Showcase"
        title="Work that shipped for global brands"
        description="Philips, ABB, EY, Expedia, Uniqlo, Symplr, Dematic, JTB — filter by domain to explore 13 production projects."
      />

      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {projectDomains.map((d) => (
          <button
            key={d}
            onClick={() => setDomain(d)}
            className={cn(
              "relative rounded-full px-5 py-2 text-sm transition-colors duration-300 cursor-pointer",
              domain === d
                ? "text-primary-foreground"
                : "glass text-muted-foreground hover:text-foreground"
            )}
          >
            {domain === d && (
              <motion.span
                layoutId="project-filter"
                className="absolute inset-0 rounded-full bg-primary shadow-[0_0_20px_-4px_var(--primary)]"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative">{d}</span>
          </button>
        ))}
      </div>

      <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
