'use client'

import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface StarRatingProps {
  rating: string | null
  maxStars?: number
  size?: number
}

export function StarRating({ rating, maxStars = 5, size = 20 }: StarRatingProps) {
  if (!rating || rating === 'Not Rated' || rating === 'NR') {
    return <Badge variant="secondary">Not Rated</Badge>
  }

  const numStars = parseInt(rating, 10)

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => (
        <Star
          key={i}
          className={i < numStars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}
          size={size}
        />
      ))}
    </div>
  )
}
