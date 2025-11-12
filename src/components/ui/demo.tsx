import { BackgroundPaths } from "@/components/ui/background-paths";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function DemoBackgroundPaths() {
  return <BackgroundPaths title="Background Paths" />;
}

export function DefaultToggle() {
  return (
    <div className="space-y-2 text-center">
      <div className="flex justify-center">
        <ThemeToggle />
      </div>
    </div>
  );
}

