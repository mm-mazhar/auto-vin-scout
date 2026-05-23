// app/(dashboard)/_components/powertrain-badge.tsx

'use client'

interface PowertrainBadgeProps {
  electrificationLevel: string | null
  fuelTypePrimary: string | null
  fuelTypeSecondary: string | null
}

export function PowertrainBadge({ electrificationLevel, fuelTypePrimary, fuelTypeSecondary }: PowertrainBadgeProps) {
  const { label, description, bgClass, textClass } = getPowertrainInfo(
    electrificationLevel,
    fuelTypePrimary,
    fuelTypeSecondary
  )

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`text-3xl font-bold px-4 py-2 rounded-lg ${bgClass} ${textClass}`}>
        {label}
      </span>
      <p className="text-xs text-foreground">{description}</p>
    </div>
  )
}

function getPowertrainInfo(
  electrificationLevel: string | null,
  fuelTypePrimary: string | null,
  fuelTypeSecondary: string | null
): { label: string; description: string; bgClass: string; textClass: string } {
  const elLevel = electrificationLevel?.toLowerCase() ?? ''
  const primary = fuelTypePrimary?.toLowerCase() ?? ''

  // BEV — Battery Electric Vehicle
  if (elLevel.includes('bev') || elLevel.includes('battery') || primary.includes('electric')) {
    return {
      label: 'BEV',
      description: 'Battery Electric Vehicle — zero tailpipe emissions',
      bgClass: 'bg-blue-500/15',
      textClass: 'text-blue-400',
    }
  }

  // PHEV — Plug-in Hybrid
  if (elLevel.includes('phev') || elLevel.includes('plug')) {
    return {
      label: 'PHEV',
      description: 'Plug-in Hybrid — electric + gasoline with charging capability',
      bgClass: 'bg-cyan-500/15',
      textClass: 'text-cyan-400',
    }
  }

  // Hybrid (non-plug-in)
  if (elLevel.includes('hybrid') || elLevel.includes('hev') || fuelTypeSecondary?.toLowerCase().includes('electric')) {
    return {
      label: 'Hybrid',
      description: 'Hybrid Electric — gasoline + electric assist',
      bgClass: 'bg-teal-500/15',
      textClass: 'text-teal-400',
    }
  }

  // Diesel
  if (primary.includes('diesel')) {
    return {
      label: 'Diesel',
      description: 'Diesel — compression ignition engine',
      bgClass: 'bg-amber-500/15',
      textClass: 'text-amber-400',
    }
  }

  // Default: ICE (Internal Combustion Engine)
  return {
    label: 'ICE',
    description: `Internal Combustion — ${fuelTypePrimary || 'Gasoline'}`,
    bgClass: 'bg-zinc-500/15',
    textClass: 'text-zinc-400',
  }
}
