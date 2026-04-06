// app/(marketing)/_components/ui/text-effect.tsx

'use client'

import { cn } from '@/lib/utils'
import { motion, type Variants } from 'motion/react'
import React from 'react'

type TextEffectProps = {
  children?: React.ReactNode
  text?: string
  className?: string
  preset?: 'fade-in-blur' | 'fade'
  speedSegment?: number
  delay?: number
  as?: 'h1' | 'p' | 'div' | 'span'
}

export default function TextEffect({
  children,
  text,
  className,
  preset = 'fade-in-blur',
  speedSegment = 0.03,
  delay = 0,
  as = 'span',
}: TextEffectProps) {
  const raw = (typeof children === 'string' ? children : undefined) ?? text ?? ''
  const words = String(raw).split(' ')

  const itemVariants: Variants =
    preset === 'fade-in-blur'
      ? {
          hidden: { opacity: 0, filter: 'blur(8px)', y: 12 },
          visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: { type: 'spring', bounce: 0.3, duration: 0.8 },
          },
        }
      : {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        }

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: speedSegment, delayChildren: delay },
    },
  }

  const MotionComp =
    as === 'h1'
      ? motion.h1
      : as === 'p'
        ? motion.p
        : as === 'div'
          ? motion.div
          : motion.span

  return (
    <MotionComp
      initial='hidden'
      animate='visible'
      variants={containerVariants}
      className={cn(
        'text-foreground',
        className,
      )}
    >
      {words.map((word, i) => (
        <motion.span key={`${word}-${i}`} variants={itemVariants}>
          {word}{' '}
        </motion.span>
      ))}
    </MotionComp>
  )
}