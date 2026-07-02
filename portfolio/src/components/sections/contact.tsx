"use client";

import {
  Globe,
  Mail,
  MapPin,
  MessageSquareCode,
  Phone,
  Send,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons";
import { SectionHeading } from "@/components/section-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { profile } from "@/lib/data";

const channels = [
  {
    icon: Mail,
    label: "Email",
    values: profile.emails,
    href: (v: string) => `mailto:${v}`,
  },
  {
    icon: Phone,
    label: "Phone",
    values: profile.phones,
    href: (v: string) => `tel:${v.replace(/\s/g, "")}`,
  },
  {
    icon: MapPin,
    label: "Location",
    values: [profile.location],
    href: () => undefined,
  },
];

const socials = [
  { icon: GithubIcon, label: "GitHub — rijusudar", href: profile.github },
  { icon: MessageSquareCode, label: "Stack Overflow — riju", href: profile.stackoverflow },
  { icon: Globe, label: "rijusudar-tech.github.io", href: profile.website },
];

export function Contact() {
  return (
    <section id="contact" className="relative mx-auto max-w-6xl px-5 py-28">
      <SectionHeading
        eyebrow="Contact"
        title="Let's build something exceptional"
        description="Open to architecture consulting, leadership roles, and ambitious front-end challenges."
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <Stagger className="flex flex-col gap-4">
          {channels.map(({ icon: Icon, label, values, href }) => (
            <StaggerItem key={label}>
              <Card className="hover:-translate-y-0.5 hover:border-primary/40">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </h3>
                    {values.map((v) => {
                      const link = href(v);
                      return link ? (
                        <a
                          key={v}
                          href={link}
                          className="block truncate text-sm text-foreground transition-colors hover:text-accent"
                        >
                          {v}
                        </a>
                      ) : (
                        <p key={v} className="text-sm text-foreground">
                          {v}
                        </p>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}

          <StaggerItem>
            <div className="flex flex-wrap gap-3 pt-2">
              {socials.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:text-foreground"
                >
                  <Icon className="size-4 text-primary-soft" />
                  {label}
                </a>
              ))}
            </div>
          </StaggerItem>
        </Stagger>

        <Reveal delay={0.15}>
          <Card className="relative overflow-hidden">
            <div
              aria-hidden
              className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/20 blur-[90px]"
            />
            <CardContent className="relative p-8">
              <h3 className="mb-2 text-xl font-semibold">Send a message</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                This form opens your mail client — no backend required. Or wire it
                up to your favourite form service later.
              </p>
              <form
                className="flex flex-col gap-4"
                action={`mailto:${profile.emails[0]}`}
                method="get"
                encType="text/plain"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Your name"
                    className="glass w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60"
                  />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Your email"
                    className="glass w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60"
                  />
                </div>
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject"
                  className="glass w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60"
                />
                <textarea
                  name="body"
                  required
                  rows={5}
                  placeholder="Tell me about your project…"
                  className="glass w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60"
                />
                <Button type="submit" size="lg" className="self-start">
                  <Send /> Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
