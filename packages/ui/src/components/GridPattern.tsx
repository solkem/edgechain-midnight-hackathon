import { cn } from "@/lib/utils";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";

export function InteractiveGridPatternDemo({ children }) {
  return (
    <div className="bg-background relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border">
      <InteractiveGridPattern
        className={cn(
          "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
          "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12"
        )}
      >
        {" "}
        {children}
      </InteractiveGridPattern>
      ?
    </div>
  );
}
