import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-3xl",
        align === "center" ? "text-center" : "mx-0 text-left",
        className,
      )}
    >
      <p className="font-mono text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/80">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-pretty text-base leading-7 text-zinc-400 sm:text-lg">
        {description}
      </p>
    </div>
  );
}

