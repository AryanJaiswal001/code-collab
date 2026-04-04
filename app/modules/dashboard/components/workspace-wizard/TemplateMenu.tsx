"use client";

import { useMemo, useState } from "react";
import {
  Code,
  Globe,
  Search,
  Server,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { WorkspaceTemplate } from "./types";

type TemplateCategory = "all" | "frontend" | "backend" | "fullstack";

type TemplateOption = {
  id: WorkspaceTemplate;
  name: string;
  description: string;
  icon: LucideIcon;
  category: Exclude<TemplateCategory, "all">;
  popularity: number;
  tags: string[];
  features: string[];
};

const templates: TemplateOption[] = [
  {
    id: "REACT",
    name: "React",
    description:
      "A JavaScript library for building user interfaces with component-based architecture.",
    icon: Zap,
    category: "frontend",
    popularity: 5,
    tags: ["UI", "Frontend", "JavaScript"],
    features: ["Component-based", "Virtual DOM", "JSX support"],
  },
  {
    id: "NEXTJS",
    name: "Next.js",
    description:
      "The React framework for production apps with routing, SSR, and server components.",
    icon: Globe,
    category: "fullstack",
    popularity: 5,
    tags: ["React", "SSR", "Fullstack"],
    features: ["App Router", "Server Components", "API routes"],
  },
  {
    id: "EXPRESS",
    name: "Express",
    description:
      "Fast and minimal Node.js framework for APIs and backend services.",
    icon: Server,
    category: "backend",
    popularity: 4,
    tags: ["Node.js", "API", "Backend"],
    features: ["Middleware", "Routing", "HTTP utilities"],
  },
  {
    id: "VUE",
    name: "Vue.js",
    description:
      "Progressive framework for interfaces with an approachable learning curve.",
    icon: Code,
    category: "frontend",
    popularity: 4,
    tags: ["UI", "Frontend", "JavaScript"],
    features: ["Reactive bindings", "Components", "Virtual DOM"],
  },
  {
    id: "HONO",
    name: "Hono",
    description:
      "Fast lightweight framework built on web standards and runtime portability.",
    icon: Zap,
    category: "backend",
    popularity: 3,
    tags: ["Node.js", "TypeScript", "Backend"],
    features: ["Web standards", "Type safety", "High performance"],
  },
  {
    id: "ANGULAR",
    name: "Angular",
    description:
      "A platform and framework for building robust full-featured web applications.",
    icon: Globe,
    category: "fullstack",
    popularity: 3,
    tags: ["TypeScript", "Framework", "Fullstack"],
    features: ["Dependency injection", "Signals", "CLI tooling"],
  },
];

type TemplateMenuProps = {
  value: WorkspaceTemplate | null;
  onChange: (template: WorkspaceTemplate) => void;
};

function renderStars(count: number) {
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={`star-${count}-${index}`}
      className={cn(
        "h-3.5 w-3.5",
        index < count
          ? "fill-yellow-400 text-yellow-400"
          : "text-muted-foreground",
      )}
    />
  ));
}

export function TemplateMenu({ value, onChange }: TemplateMenuProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("all");

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesCategory =
        category === "all" || template.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [category, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search templates..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
        <Tabs
          value={category}
          onValueChange={(nextValue) =>
            setCategory(nextValue as TemplateCategory)
          }
          className="w-full md:w-auto"
        >
          <TabsList className="grid h-11 w-full grid-cols-4 rounded-2xl md:w-105">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="frontend">Frontend</TabsTrigger>
            <TabsTrigger value="backend">Backend</TabsTrigger>
            <TabsTrigger value="fullstack">Fullstack</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredTemplates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTemplates.map((template) => {
            const Icon = template.icon;
            const isSelected = value === template.id;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onChange(template.id)}
                className={cn(
                  "flex flex-col gap-4 rounded-[1.5rem] border p-4 text-left transition-all",
                  "hover:border-primary/40 hover:bg-primary/3",
                  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  isSelected
                    ? "border-primary bg-primary/6"
                    : "border-border/70 bg-card/70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{template.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {template.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {renderStars(template.popularity)}
                  </div>
                </div>

                <p className="text-sm leading-6 text-muted-foreground">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <Badge key={`${template.id}-${tag}`} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {isSelected ? (
                  <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/4 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                      Selected Template Features
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {template.features.map((feature) => (
                        <div
                          key={`${template.id}-${feature}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed p-8 text-center text-sm text-muted-foreground">
          No template matches your search.
        </div>
      )}
    </div>
  );
}
