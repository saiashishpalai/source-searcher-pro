import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Circle, Layers2, Boxes } from 'lucide-react';

export type PRDClassification = 'small' | 'medium' | 'large';

interface ClassificationBadgeProps {
  classification: PRDClassification | null;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
}

const classificationConfig: Record<PRDClassification, {
  label: string;
  description: string;
  structure: string;
  icon: typeof Circle;
  className: string;
}> = {
  small: {
    label: 'Small',
    description: '1-2 screens, low logic, <10 acceptance criteria',
    structure: 'Stories only (no Epic)',
    icon: Circle,
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  medium: {
    label: 'Medium',
    description: 'Multiple flows, moderate logic, single team',
    structure: '1 Epic → Stories',
    icon: Layers2,
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  large: {
    label: 'Large',
    description: 'Multi-team, phased delivery, 4+ weeks',
    structure: 'Multiple Epics → Stories',
    icon: Boxes,
    className: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  },
};

export function ClassificationBadge({ 
  classification, 
  showTooltip = true,
  size = 'md' 
}: ClassificationBadgeProps) {
  if (!classification) {
    return (
      <Badge variant="secondary" className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
        Not Classified
      </Badge>
    );
  }

  const config = classificationConfig[classification];
  const Icon = config.icon;

  const badge = (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        size === 'sm' && 'text-xs px-2 py-0.5'
      )}
    >
      <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium">{config.label} PRD</p>
          <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Jira Structure:</span> {config.structure}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

