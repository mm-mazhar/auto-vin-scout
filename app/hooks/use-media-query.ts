// // app/hooks/use-media-query.ts

// 'use client'

// import { useEffect, useState } from 'react'

// export function useMediaQuery(query: string) {
//   const [value, setValue] = useState(false)

//   useEffect(() => {
//     function onChange(event: MediaQueryListEvent) {
//       setValue(event.matches)
//     }

//     const result = window.matchMedia(query)
//     result.addEventListener('change', onChange)
//     setValue(result.matches)

//     return () => result.removeEventListener('change', onChange)
//   }, [query])

//   return value
// }

// app/hooks/use-media-query.ts
'use client'

import { useSyncExternalStore, useCallback } from 'react'

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const matchMedia = window.matchMedia(query)
      matchMedia.addEventListener('change', callback)
      return () => matchMedia.removeEventListener('change', callback)
    },
    [query]
  )

  const getSnapshot = () => window.matchMedia(query).matches
  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}