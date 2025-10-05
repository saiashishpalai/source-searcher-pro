
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EnhancedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  icon?: LucideIcon;
  buttonText?: string;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const EnhancedInput: React.FC<EnhancedInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Type something...",
  icon: Icon,
  buttonText = "Submit",
  isLoading = false,
  loadingText = "Loading...",
  disabled = false,
  className = "",
  inputClassName = "",
  buttonClassName = "",
  size = 'lg'
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const sizeClasses = {
    sm: {
      container: 'p-3 lg:p-4',
      icon: 'w-4 h-4 lg:w-5 lg:h-5',
      input: 'text-sm sm:text-base',
      button: 'px-4 lg:px-6 py-2 lg:py-2.5 text-sm lg:text-base',
      gap: 'gap-2 lg:gap-3'
    },
    md: {
      container: 'p-4 lg:p-5',
      icon: 'w-5 h-5 lg:w-6 lg:h-6',
      input: 'text-sm sm:text-base md:text-lg',
      button: 'px-5 lg:px-8 py-2 lg:py-3 text-sm lg:text-base',
      gap: 'gap-3 lg:gap-4'
    },
    lg: {
      container: 'p-4 lg:p-6',
      icon: 'w-5 h-5 lg:w-6 lg:h-6',
      input: 'text-sm sm:text-base md:text-lg lg:text-xl',
      button: 'px-6 lg:px-10 py-2 lg:py-3 text-sm lg:text-base',
      gap: 'gap-3 lg:gap-4'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <form onSubmit={onSubmit} className={`relative ${className}`}>
      <div 
        className={`
          relative transition-all duration-500 
          ${isFocused ? 'transform scale-102' : ''}
        `}
      >
        <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${isFocused ? 'shadow-[0_0_50px_hsl(262_83%_70%_/_0.3)]' : 'shadow-[var(--shadow-elegant)]'}`} />
        <div className={`relative bg-card/90 backdrop-blur-md border border-border/50 rounded-2xl ${currentSize.container} shadow-2xl`}>
          <div className={`flex items-center ${currentSize.gap}`}>
            {Icon && (
              <Icon className={`${currentSize.icon} text-muted-foreground flex-shrink-0`} />
            )}
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className={`flex-1 border-0 bg-transparent ${currentSize.input} placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 font-light ${inputClassName}`}
              disabled={disabled || isLoading}
            />
            <Button 
              type="submit" 
              variant="search"
              size={size === 'md' ? 'default' : size}
              className={`${currentSize.button} font-medium rounded-xl ${buttonClassName}`}
              disabled={!value.trim() || isLoading || disabled}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  {loadingText}
                </>
              ) : (
                buttonText
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default EnhancedInput;
