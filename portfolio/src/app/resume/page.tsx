import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "./print-button";
import {
  certifications,
  education,
  experiences,
  languages,
  profile,
  projects,
  skillGroups,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Resume — Riju Sudar",
  description:
    "Printable resume of Riju Sudar, UI / React / Angular / Ember / Node Architect.",
};

/**
 * ATS/recruiter-friendly printable resume. Use the "Save as PDF" button
 * (browser print dialog) to produce a PDF copy.
 */
export default function ResumePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-800">
      {/* Toolbar — hidden when printing */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-6 py-3 backdrop-blur print:hidden">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" /> Back to portfolio
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-3xl px-6 py-10 text-[13.5px] leading-relaxed">
        <header className="mb-8 border-b border-neutral-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            {profile.name}
          </h1>
          <p className="mt-1 text-base font-medium text-violet-700">{profile.title}</p>
          <p className="mt-3 text-neutral-500">
            {profile.location} · {profile.emails.join(" · ")} ·{" "}
            {profile.phones.join(" / ")}
          </p>
          <p className="text-neutral-500">
            {profile.website} · github.com/rijusudar · stackoverflow: riju
          </p>
        </header>

        <Section title="Profile">
          <p>{profile.summary}</p>
          {profile.about.map((p) => (
            <p key={p} className="mt-2">
              {p}
            </p>
          ))}
        </Section>

        <Section title="Skills">
          {skillGroups.map((group) => (
            <p key={group.category} className="mt-1">
              <strong className="text-neutral-900">{group.category}:</strong>{" "}
              {group.skills.join(", ")}
            </p>
          ))}
        </Section>

        <Section title={`Work History (${profile.yearsOfExperience} yrs)`}>
          {experiences.map((exp) => (
            <div key={`${exp.company}-${exp.period}`} className="mt-4 break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h3 className="font-semibold text-neutral-900">
                  {exp.role} — {exp.company}
                </h3>
                <span className="text-neutral-500">{exp.period}</span>
              </div>
              <ul className="mt-1 list-disc pl-5 text-neutral-600">
                {exp.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        <Section title="Projects">
          {projects.map((project) => (
            <div key={project.name} className="mt-3 break-inside-avoid">
              <h3 className="font-semibold text-neutral-900">
                {project.name} <span className="font-normal text-neutral-500">({project.client})</span>
              </h3>
              <p className="text-neutral-600">{project.description}</p>
              <p className="mt-0.5 text-neutral-500">
                <em>Technologies:</em> {project.tech.join(", ")}
              </p>
            </div>
          ))}
        </Section>

        <Section title="Education">
          <p>
            <strong className="text-neutral-900">{education.degree}</strong> —{" "}
            {education.institution} ({education.period})
          </p>
        </Section>

        <Section title="Training & Certification">
          {certifications.map((cert) => (
            <p key={cert.name}>
              {cert.name}, {cert.issuer}
            </p>
          ))}
        </Section>

        <Section title="Languages">
          <p>{languages.join(", ")}</p>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 border-b border-neutral-200 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
        {title}
      </h2>
      {children}
    </section>
  );
}
