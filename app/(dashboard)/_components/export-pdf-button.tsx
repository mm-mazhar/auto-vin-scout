// app/(dashboard)/_components/export-pdf-button.tsx

'use client'

import { useCallback } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportPdfButtonProps {
  vehicleLabel: string
}

/**
 * Triggers browser print dialog with print-optimized styles.
 * The @media print rules in globals.css handle:
 * - Hiding sidebar/topbar
 * - Showing all tab content (not just active tab)
 * - Switching to light theme for readability
 */
export function ExportPdfButton({ vehicleLabel }: ExportPdfButtonProps) {
  const handleExport = useCallback(() => {
    // Set document title temporarily for the PDF filename
    const originalTitle = document.title
    document.title = `AutoVinScout Report - ${vehicleLabel}`
    
    window.print()

    // Restore original title after print dialog closes
    // Use a small delay since print is blocking in some browsers
    setTimeout(() => {
      document.title = originalTitle
    }, 100)
  }, [vehicleLabel])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="no-print flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Export PDF
    </Button>
  )
}
