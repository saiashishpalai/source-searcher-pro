import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative h-10 w-10 rounded-full border border-border/40 bg-card/70 backdrop-blur-sm hover:bg-accent/50 transition-colors"
          aria-label={`Activate ${isDark ? "light" : "dark"} mode`}
        >
          <Sun className={`h-5 w-5 transition-all ${isDark ? "scale-0 opacity-0" : "scale-100 opacity-100"}`} />
          <Moon className={`absolute h-5 w-5 transition-all ${isDark ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center">
        <span>{isDark ? "Switch to light mode" : "Switch to dark mode"}</span>
      </TooltipContent>
    </Tooltip>
  );
};

export default ThemeToggle;

