/**
 * Single source of truth for all portfolio content.
 * Everything here is taken verbatim from Riju Sudar's resume.
 * Items marked `placeholder: true` are NOT in the resume and must be
 * replaced with real content before publishing.
 */

export const profile = {
  name: "Riju Sudar",
  title: "UI / React / Angular / Ember / Node Architect",
  roles: [
    "UI Lead Engineer",
    "Technical Architect",
    "React Expert",
    "Frontend Architect",
    "AI-First UI Engineer",
  ],
  location: "Trivandrum, Kerala, India",
  emails: ["rijusrj@gmail.com", "rijusrjtech@gmail.com"],
  phones: ["+91 9746149190", "+91 8848389775"],
  website: "https://rijusudar-tech.github.io/",
  github: "https://github.com/rijusudar",
  stackoverflow: "https://stackoverflow.com/users/riju", // handle from resume: "riju"
  yearsOfExperience: 14,
  workingSince: 2012,
  summary:
    "Expertise in technical architecture with strong capabilities in front-end development, interaction design, information architecture, accessibility, coding, and modern web standards.",
  about: [
    "I have been working on the web since 2012. I am a data-driven designer, shaping user experiences based on user research and analysis of quantitative and qualitative data.",
    "I combine this analytical approach to design with strong visual design skills and natural artistic ability. This enables me to develop products that are both visually engaging and highly usable.",
    "I hand-code HTML and CSS to W3C standards and have a strong understanding of WCAG 2.0 and front-end best practices. I build solid user interfaces using progressive enhancement and strive for consistent user experiences across browsers and devices.",
  ],
  lifecycle: [
    "Gathering business and user requirements",
    "HTML prototyping",
    "Usability testing",
    "Front-end development with React and related libraries for the last 5 years",
    "Website deployment",
  ],
};

export type SkillGroup = {
  category: string;
  skills: string[];
};

export const skillGroups: SkillGroup[] = [
  {
    category: "Core Web",
    skills: [
      "HTML 4.01 / HTML5",
      "CSS2 / CSS3",
      "CSS Animations",
      "Sass / SCSS",
      "BEM Methodology",
      "Webpack 2",
      "Responsive Design",
      "WCAG 2.0 Accessibility",
      "Progressive Enhancement",
    ],
  },
  {
    category: "React Ecosystem",
    skills: [
      "React",
      "Redux",
      "Redux-Saga",
      "Redux Thunk",
      "Redux Toolkit",
      "Storybook",
      "Next.js (SSR / SSG / ISR)",
      "React Testing Library",
      "Jest",
    ],
  },
  {
    category: "Frameworks & Languages",
    skills: [
      "JavaScript (ES6+)",
      "TypeScript",
      "Angular 2/4+ & 12+",
      "Angular Universal",
      "Ember.js",
      "jQuery",
      "AJAX / JSON",
      "JS Render",
      "PhantomJS",
    ],
  },
  {
    category: "Backend & Cloud",
    skills: [
      "Node.js",
      "Express.js",
      "MongoDB / Mongoose",
      "AWS Lambda",
      "AWS S3",
      "Progress SQL",
      "Microservices",
      "Micro Frontends",
      "Docker",
    ],
  },
  {
    category: "Healthcare Tech",
    skills: [
      "DICOM",
      "PACS",
      "RIS / HIS Integration",
      "OHIF Viewer",
      "HL7 Interoperability",
      "FHIR",
    ],
  },
  {
    category: "AI Engineering",
    skills: [
      "ChatGPT",
      "Claude",
      "Gemini",
      "GitHub Copilot",
      "AI Agents",
      "Generative AI Workflows",
      "AI-Assisted Development",
      "Conversational Interfaces",
      "Prompt-Driven Workflows",
    ],
  },
  {
    category: "Data Viz & Integrations",
    skills: [
      "NVD3",
      "Chart.js",
      "AMCharts",
      "HighCharts",
      "AG-Grid",
      "Google Maps API",
      "Twitter API",
      "Canvas Graphs",
    ],
  },
  {
    category: "Design & UX",
    skills: [
      "Photoshop",
      "Illustrator",
      "GIMP",
      "Wireframing & Prototyping",
      "Usability Testing",
      "Bootstrap",
      "Foundation",
      "Drupal 7 Theming",
      "PWA / Service Workers / Lighthouse",
    ],
  },
];

/** Flat list used for the marquee strip. */
export const marqueeSkills = [
  "React",
  "Next.js",
  "TypeScript",
  "Angular",
  "Ember.js",
  "Node.js",
  "Redux",
  "Storybook",
  "CSS Animations",
  "SCSS / BEM",
  "Jest",
  "AWS Lambda",
  "MongoDB",
  "DICOM / PACS",
  "OHIF Viewer",
  "AI Agents",
  "GitHub Copilot",
  "PWA",
  "Micro Frontends",
  "WCAG 2.0",
];

export type Experience = {
  company: string;
  role: string;
  period: string;
  start: string;
  current?: boolean;
  highlights: string[];
};

export const experiences: Experience[] = [
  {
    company: "Prevalent AI",
    role: "UI Lead Engineer",
    period: "Apr 2026 — Present",
    start: "2026",
    current: true,
    highlights: [
      "Leading and mentoring front-end and AI engineering teams, providing architectural direction and technical leadership.",
      "Designing scalable AI-driven enterprise applications using React, Next.js, Angular, Node.js and TypeScript.",
      "Architecting intelligent UI platforms integrated with LLMs, AI Agents, copilots, and Generative AI workflows.",
      "Driving AI-first UI engineering: conversational interfaces, prompt-driven workflows, intelligent automation.",
      "Building reusable component libraries and AI-enabled design systems for enterprise scalability.",
      "Ensuring best practices in CI/CD pipelines, Git workflows, automated testing, and cloud-native engineering.",
    ],
  },
  {
    company: "Quest Global",
    role: "Technical Architect",
    period: "Aug 2022 — Mar 2026",
    start: "2022",
    highlights: [
      "Head and mentor a team of 40+ front-end developers and designers, providing architectural direction.",
      "Design scalable front-end architectures for enterprise-grade applications using React, Angular and Ember.js.",
      "Leverage AI tools (ChatGPT, Claude, Gemini, GitHub Copilot) to accelerate development and improve code quality.",
      "Integrate AI-powered workflows and agent-based systems to enhance developer productivity.",
      "Build data-driven modules for processing and visualizing large datasets using Node.js and React.",
      "Lead code reviews and drive performance optimization initiatives with AI-assisted insights.",
    ],
  },
  {
    company: "Ernst & Young",
    role: "Supervising Associate",
    period: "Mar 2022 — Aug 2022",
    start: "2022",
    highlights: [
      "Headed a team of front-end developers and designers, providing architectural solutions.",
      "Created a new architecture for brand unification.",
      "Built reusable and scalable components using Angular.",
      "Worked on integration of authentication modules for SSO.",
    ],
  },
  {
    company: "QBurst Technologies",
    role: "Associate Architect",
    period: "Mar 2019 — May 2022",
    start: "2019",
    highlights: [
      "Headed a team of front-end developers and designers, providing architectural solutions to clients.",
      "Created a new architecture for brand unification.",
      "Revamped the existing UI, introduced Storybook for component showcasing, and added multiple brands.",
      "Worked extensively with React, its related libraries, and Redux.",
    ],
  },
  {
    company: "IBS Software Solutions",
    role: "Technical Lead Engineer",
    period: "Jun 2017 — Feb 2019",
    start: "2017",
    highlights: [
      "Headed a team of front-end developers and designers, taking the role of Scrum Master.",
      "Built custom JS plugins and worked with Angular 2/4 and Ember.js.",
      "Worked with TypeScript, Node.js and build tools like Webpack 2.",
      "Expert in UX fundamentals — prototyping and usability testing; client communication and requirements gathering.",
    ],
  },
  {
    company: "QBurst Technologies",
    role: "Senior Software Engineer",
    period: "Jul 2014 — May 2017",
    start: "2014",
    highlights: [
      "Headed a team of front-end developers and designers.",
      "UI design and development, HTML/CSS production and CMS integration.",
      "Built custom JS plugins and JS frameworks.",
      "Prototyping, usability testing, client communication and requirements gathering.",
    ],
  },
  {
    company: "Solutino Technologies",
    role: "UI/UX Developer · PHP Developer",
    period: "Jul 2013 — Jul 2014",
    start: "2013",
    highlights: [
      "Produced both low and high-fidelity wireframes and HTML prototypes.",
      "Helped develop the in-house content management system.",
      "Back-end development and PHP coding; product and strategy development.",
    ],
  },
  {
    company: "BrizGo Technologies",
    role: "Junior Software Developer · UI/UX",
    period: "Apr 2012 — Apr 2013",
    start: "2012",
    highlights: [
      "Responsible for the design and front-end build of multi-language event sites.",
      "Involved in back-end development and PHP coding.",
    ],
  },
];

export type Project = {
  name: string;
  client: string;
  domain: "Healthcare" | "Industrial" | "Enterprise" | "E-Commerce & Travel" | "Web & CMS";
  description: string;
  tech: string[];
  featured?: boolean;
};

export const projects: Project[] = [
  {
    name: "Spark APP",
    client: "Innovxcare",
    domain: "Healthcare",
    featured: true,
    description:
      "Advanced medical imaging workflow application that streamlines radiology workflows across hospitals and diagnostic centers. Integrates with DICOM, RIS, HIS and PACS systems, enabling clinicians to access and review medical imaging data securely and in real time.",
    tech: [
      "React",
      "Redux Toolkit",
      "Redux-Saga",
      "Electron",
      "MUI",
      "Node.js",
      "Progress SQL",
      "AWS Lambda",
      "AWS S3",
      "OHIF Viewer",
      "DICOM / PACS",
      "HighCharts",
      "Jest",
    ],
  },
  {
    name: "Smart Sensor APP",
    client: "ABB",
    domain: "Industrial",
    featured: true,
    description:
      "Cutting-edge mobile and web application for ABB, a global leader in industrial automation. Records and monitors operational details of motors and drives, providing real-time insights and diagnostics for early defect detection.",
    tech: [
      "React",
      "Redux Toolkit",
      "Redux-Saga",
      "Micro Frontends",
      "Microservices",
      "Node.js",
      "HighCharts",
      "SCSS / BEM",
      "Jest",
      "Husky",
    ],
  },
  {
    name: "RadWorkStation",
    client: "Philips",
    domain: "Healthcare",
    featured: true,
    description:
      "Hospital scanning report management tool integrating HIS, RIS and PACS. Supports DICOM standards for CT, MRI and X-ray imaging with the OHIF Viewer for browser-based visualization, end-to-end radiology workflows, and HL7 interoperability.",
    tech: [
      "React",
      "Redux-Saga",
      "FHIR",
      "Node.js",
      "Express.js",
      "OHIF Viewer",
      "DICOM / PACS",
      "Docker",
      "SCSS",
    ],
  },
  {
    name: "Dematic Dashboard",
    client: "Dematic",
    domain: "Industrial",
    description:
      "Diverse UI dashboards spanning automatic, semi-automatic and manual screens. Documented Manta UI components, crafted bespoke elements, and championed a Design System across components.",
    tech: ["Ember.js", "Handlebars", "RxJS", "SCSS", "Node.js", "Responsive UI"],
  },
  {
    name: "CareManagement",
    client: "Symplr",
    domain: "Healthcare",
    description:
      "Care management software that ignites efficiency in daily healthcare operations — synthesizing data from multiple sources, tracking performance over time, and deepening data insights for better patient outcomes.",
    tech: ["Angular 12+", "RxJS", "REST", "SCSS", "Node.js", "LibreOffice Viewer", "Husky"],
  },
  {
    name: "ESG Risk",
    client: "Ernst & Young",
    domain: "Enterprise",
    description:
      "Portal-based ESG risk management tool on an ASP.NET backend with an Angular 12 UI. AG-Grid powers complex data tables, with SSO via MSAL authentication, showcasing risk for engagement tenants.",
    tech: ["Angular 12+", "AG-Grid", "SSO / MSAL", "RxJS", "REST", "Responsive CSS"],
  },
  {
    name: "ESG Oracle",
    client: "Ernst & Young",
    domain: "Enterprise",
    description:
      "Portal application visualizing organizational management data. Canvas-based radar graphs and bar charts deliver graphical representation of data across the organisation.",
    tech: ["Angular 12", "Canvas Charts", "REST", "RxJS", "Responsive CSS"],
  },
  {
    name: "Uniqlo Design System",
    client: "Fast Retailing",
    domain: "E-Commerce & Travel",
    featured: true,
    description:
      "Reusable component design system built with a Storybook library. Components handle local state, meet WCAG AA accessibility standards, and support multiple languages — with full unit test coverage.",
    tech: ["React", "Storybook", "Webpack", "Jest", "React Testing Library", "i18n", "WCAG AA"],
  },
  {
    name: "VideoDoc Patient APP",
    client: "VideoDoc",
    domain: "Healthcare",
    description:
      "Virtual consultation application connecting patients and doctors. Built with React 16 and Redux, themed with Reactstrap, fully responsive and tablet/mobile friendly.",
    tech: ["React 16", "Redux", "Reactstrap", "Webpack", "Node.js", "Jest"],
  },
  {
    name: "Car Portal",
    client: "Expedia",
    domain: "E-Commerce & Travel",
    description:
      "Web portal for online booking of prepaid and postpaid cars across models and providers, consuming product services for real-time results. Built with Ember.js, A/B tested with Optimizely.",
    tech: ["Ember.js", "SASS / BEM", "Foundation", "Grunt", "Optimizely", "Jenkins", "REST"],
  },
  {
    name: "Travel App",
    client: "JTB",
    domain: "E-Commerce & Travel",
    description:
      "Online travel booking portal for air, hotel, cruise and rail. Server-rendered with Angular Universal for an SEO-friendly, performance-optimised experience.",
    tech: ["Angular 4 Universal", "TypeScript", "Webpack 2", "Node Express", "Bootstrap", "REST"],
  },
  {
    name: "Thread Web & Mobile App",
    client: "Thread",
    domain: "Web & CMS",
    description:
      "Refined user experience replacing a legacy application, with deep Salesforce.com data integration and built-in business intelligence and analytics. Built on Drupal CMS with Bootstrap responsiveness.",
    tech: ["Drupal", "Angular 2", "Chart.js", "Bootstrap", "jQuery", "REST"],
  },
  {
    name: "Career Labs",
    client: "Big Data Careers Platform",
    domain: "Web & CMS",
    description:
      "A complete careers module with millions of job suggestions, advice, and company analysis. A Big Data project delivered across desktop and mobile by an Agile team.",
    tech: ["FTL", "JS Render", "JS Views", "NVD3 Charts", "jQuery", "Git Rebase Flow"],
  },
];

export const projectDomains = [
  "All",
  "Healthcare",
  "Industrial",
  "Enterprise",
  "E-Commerce & Travel",
  "Web & CMS",
] as const;

/** Highlights drawn directly from resume facts. */
export const achievements = [
  {
    metric: "14+",
    label: "Years on the Web",
    detail: "Building for the web since 2012 — from PHP event sites to AI-first UI platforms.",
  },
  {
    metric: "40+",
    label: "Engineers Led",
    detail: "Headed and mentored a 40+ strong team of front-end developers and designers at Quest Global.",
  },
  {
    metric: "13",
    label: "Major Projects",
    detail: "Delivered for global brands: Philips, ABB, EY, Expedia, Uniqlo, Symplr, Dematic, JTB and more.",
  },
  {
    metric: "5",
    label: "Frameworks Mastered",
    detail: "Deep, production-grade expertise across React, Next.js, Angular, Ember.js and Node.js.",
  },
];

export const education = {
  institution: "Muslim Association College of Engineering",
  degree: "B-Tech, Electronics & Communication",
  period: "2007 — 2011",
};

export const certifications = [
  {
    name: "ASP & .NET",
    issuer: "CDAC Trivandrum",
  },
];

export const languages = ["English", "Malayalam", "Hindi"];

/* ------------------------------------------------------------------ */
/* PLACEHOLDER CONTENT — not in the resume. Replace before publishing. */
/* ------------------------------------------------------------------ */

export const testimonials = [
  {
    placeholder: true,
    quote:
      "[Placeholder] Add a testimonial from a colleague, manager, or client here. e.g. “Riju transformed our front-end architecture…”",
    author: "[Name]",
    role: "[Role, Company]",
  },
  {
    placeholder: true,
    quote:
      "[Placeholder] A second testimonial — LinkedIn recommendations are a great source for these.",
    author: "[Name]",
    role: "[Role, Company]",
  },
  {
    placeholder: true,
    quote:
      "[Placeholder] A third testimonial highlighting leadership, mentoring, or delivery.",
    author: "[Name]",
    role: "[Role, Company]",
  },
];

export const blogPosts = [
  {
    placeholder: true,
    title: "[Placeholder] Architecting AI-First UI Platforms",
    excerpt: "Link your first blog post here — Medium, Dev.to, Hashnode or a personal blog.",
    date: "Coming soon",
    tag: "AI Engineering",
  },
  {
    placeholder: true,
    title: "[Placeholder] Scaling Design Systems Across 40+ Engineers",
    excerpt: "Replace with a real article URL and summary.",
    date: "Coming soon",
    tag: "Architecture",
  },
  {
    placeholder: true,
    title: "[Placeholder] DICOM in the Browser with the OHIF Viewer",
    excerpt: "Replace with a real article URL and summary.",
    date: "Coming soon",
    tag: "Healthcare Tech",
  },
];

export const githubStats = {
  placeholder: true,
  username: "rijusudar",
  note: "Live GitHub statistics integration — wire up the GitHub API or github-readme-stats to replace these placeholder values.",
  stats: [
    { label: "Public Repos", value: "——" },
    { label: "Total Stars", value: "——" },
    { label: "Contributions (yr)", value: "——" },
    { label: "Pull Requests", value: "——" },
  ],
};
