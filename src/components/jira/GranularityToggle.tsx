import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Layers, LayoutGrid, Grid3X3 } from 'lucide-react';

export type GranularityMode = 'rolled_up' | 'balanced' | 'granular';

interface GranularityToggleProps {
  value: GranularityMode;
  onChange: (mode: GranularityMode) => void;
  disabled?: boolean;
}

const modes: Array<{
  value: GranularityMode;
  label: string;
  description: string;
  icon: typeof Layers;
}> = [
  {
    value: 'rolled_up',
    label: 'Rolled-Up',
    description: '1 story per feature area. UI details in acceptance criteria. Best for early execution.',
    icon: Layers,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: '1 story per flow or major UI surface. UI states inside ACs.',
    icon: LayoutGrid,
  },
  {
    value: 'granular',
    label: 'Granular',
    description: '1 story per UI component/state. Use only if team explicitly wants detailed tracking.',
    icon: Grid3X3,
  },
];

export function GranularityToggle({ value, onChange, disabled }: GranularityToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = value === mode.value;
          
          return (
            <Tooltip key={mode.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => !disabled && onChange(mode.value)}
                  disabled={disabled}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">{mode.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

