// Example usage of PreviewReport component
// This file demonstrates how to use the PreviewReport component

import { PreviewReport } from './preview-report'
import type { VehicleDetails } from '@/lib/orpc/routers/vin'

// Example vehicle data for demonstration
const exampleVehicle: VehicleDetails = {
  id: 'example-vehicle-1',
  vin: '1HGBH41JXMN109186',
  make: 'Honda',
  model: 'Civic',
  year: 2022,
  trim: 'LX',
  engine: '2.0L 4-Cylinder',
  driveType: 'FWD',
  vehicleType: 'Passenger Car',
  manufacturer: 'Honda Motor Co.',
  plantCity: 'Marysville',
  plantCountry: 'United States',
  engineModel: 'K20C2',
  engineCylinders: '4',
  fuelInjectionType: 'Direct Injection',
  fuelTypePrimary: 'Gasoline',
  fuelTypeSecondary: null,
  electrificationLevel: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

// Example 1: Free tier user (shows upgrade prompt)
export function FreeTierExample() {
  return (
    <PreviewReport 
      vehicle={exampleVehicle}
      showUpgradePrompt={true}
      showInsufficientCredits={false}
    />
  )
}

// Example 2: Zero credits user (shows insufficient credits message)
export function ZeroCreditsExample() {
  return (
    <PreviewReport 
      vehicle={exampleVehicle}
      showUpgradePrompt={false}
      showInsufficientCredits={true}
    />
  )
}

// Example 3: Basic preview without any prompts
export function BasicPreviewExample() {
  return (
    <PreviewReport 
      vehicle={exampleVehicle}
      showUpgradePrompt={false}
      showInsufficientCredits={false}
    />
  )
}