// app/(marketing)/_components/ui/animated-shiny-text.tsx

'use client'
import React from 'react'

type AnimatedShinyTextProps = {
  children?: React.ReactNode
  className?: string
}

export default function AnimatedShinyText({ className, children }: AnimatedShinyTextProps) {
  return (
    <span
      className={
        'bg-linear-to-r from-background to-muted bg-clip-text text-transparent dark:from-foreground dark:to-muted-foreground [--shiny-width:200px] [--animation-duration:2s] inline-block max-w-xs animate-shimmer bg-no-repeat [background-position:-100%_0] [background-size:var(--shiny-width)_100%] md:max-w-lg' +
        (className ? ` ${className}` : '')
      }
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent, var(--linear), transparent)',
      }}
    >
      {children}
    </span>
  )
}
