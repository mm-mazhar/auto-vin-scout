// app/(marketing)/_components/ui/pulse-card.tsx

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import React from 'react';

interface CardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  variant?: 'theme';
  size?: 'sm' | 'md' | 'lg';
  glowEffect?: boolean;
  hoverScale?: number;
  interactive?: boolean;
  flat?: boolean;
}

export const VARIANTS = {
  theme: {
    accent: 'primary',
    gradient: 'from-primary/20 to-primary/0',
    shine:
      '205deg, transparent 0deg, var(--primary) 20deg, var(--primary) 280deg',
    border: 'primary/20',
    color: 'var(--primary)',
  },
};

const SIZES = {
  sm: {
    padding: 'p-6 pt-12',
    iconSize: 'h-5 w-5',
    titleSize: 'text-sm',
    descSize: 'text-xs',
  },
  md: {
    padding: 'p-8 pt-16',
    iconSize: 'h-6 w-6',
    titleSize: 'text-base',
    descSize: 'text-[15px]',
  },
  lg: {
    padding: 'p-6 pt-16',
    iconSize: 'h-7 w-7',
    titleSize: 'text-lg',
    descSize: 'text-base',
  },
};

export function CardHoverEffect({
  icon,
  title,
  description,
  className,
  variant = 'theme',
  size = 'md',
  glowEffect = false,
  hoverScale = 1.02,
  interactive = true,
  flat = false,
}: CardProps) {
  const variantConfig = VARIANTS[variant];
  const sizeConfig = SIZES[size];

  const Div = interactive ? motion.div : 'div';
  const IconWrapper = interactive ? motion.span : 'span';

  return (
    <Div
      whileHover={interactive ? { scale: hoverScale } : undefined}
      transition={{ duration: 0.3, ease: 'easeInOut', type: 'keyframes' }}
      className={cn(
        'group relative z-30 w-full cursor-pointer overflow-hidden rounded-2xl',
        sizeConfig.padding,
        flat
          ? 'bg-card text-card-foreground border border-border shadow-sm'
          : [
              'bg-white/80 before:bg-linear-to-b before:from-white/5 before:to-white/20 before:backdrop-blur-3xl',
              'after:bg-linear-to-b after:from-transparent after:via-transparent after:to-white/20',
              'dark:bg-black/5 dark:before:bg-linear-to-b dark:before:from-black/5 dark:before:to-black/20',
              'dark:after:to-black/20',
              "before:absolute before:inset-0 before:rounded-[inherit] before:content-['']",
              "after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
              glowEffect && 'hover:before:bg-primary/10',
              'shadow-[0px_3px_8px_rgba(0,0,0,0.04),0px_12px_20px_rgba(0,0,0,0.08)]',
              'hover:shadow-[0px_5px_15px_rgba(0,0,0,0.03),0px_25px_35px_rgba(0,0,0,0.2)]',
              'dark:shadow-[0px_3px_8px_rgba(0,0,0,0.08),0px_12px_20px_rgba(0,0,0,0.15)]',
              'dark:hover:shadow-[0px_5px_15px_rgba(0,0,0,0.06),0px_25px_35px_rgba(0,0,0,0.4)]',
            ],
        className,
      )}
      style={
        {
          '--card-color': variantConfig.color,
        } as React.CSSProperties
      }
    >
      {flat ? null : (
        <div
          className="absolute inset-0 overflow-hidden rounded-[inherit]"
          style={{
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            padding: '2px',
          }}
        >
          <div
            className="absolute inset-[-200%] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 340deg, var(--card-color) 360deg)`,
              animation: 'spin 4s linear infinite',
            }}
          />
        </div>
      )}

      <IconWrapper
        className="relative z-50 table rounded-xl pb-2"
        whileHover={interactive ? { scale: 1.1 } : undefined}
        transition={{ duration: 0.3, ease: 'easeInOut', type: 'keyframes' }}
      >
        {flat ? (
          <span
            className={cn(
              'absolute inset-[4.5px] rounded-[inherit]',
              'bg-muted/20',
              'transition-all duration-300',
            )}
          />
        ) : (
          <span
            className={cn(
              'absolute inset-[4.5px] rounded-[inherit]',
              'bg-linear-to-b from-black/5 to-black/10 backdrop-blur-3xl',
              'dark:from-white/10 dark:to-white/5',
              'transition-all duration-300',
            )}
          />
        )}
        <span
          className={cn(
            'relative z-1 block transition-colors duration-300',
            flat ? 'text-foreground' : 'text-black/60 group-hover:text-[var(--card-color)] dark:text-zinc-400',
            sizeConfig.iconSize,
          )}
        >
          {icon}
        </span>
      </IconWrapper>

      <div className="relative z-30 mt-2">
        <h3
          className={cn(
            'font-medium transition-colors duration-300',
            flat ? 'text-foreground' : 'text-black/80 group-hover:text-[var(--card-color)] dark:text-white/80',
            sizeConfig.titleSize,
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            'mt-1 transition-colors duration-300',
            flat ? 'text-muted-foreground' : 'text-black/60 dark:text-white/40',
            sizeConfig.descSize,
          )}
        >
          {description}
        </p>
      </div>

      {flat ? null : (
        <div className="absolute inset-0 z-20 overflow-hidden rounded-[inherit] opacity-100 transition-all duration-500">
          <div
            className="absolute bottom-[55%] left-1/2 aspect-square w-[200%] -translate-x-1/2 rounded-[50%]"
            style={{
              background: `conic-gradient(from ${variantConfig.shine}, transparent 360deg)`,
              filter: 'blur(40px)',
            }}
          />
        </div>
      )}
    </Div>
  );
}
