// scripts/vinCheck-NHTSA.ts
// Run this via: pnpm tsx scripts/vinCheck-NHTSA.ts <YOUR_VIN_HERE>

async function vinCheck() {
  // Grab the VIN from the command line arguments
  const vin = process.argv[2]

  if (!vin || vin.length !== 17) {
    console.error('❌ Error: Please provide a valid 17-character VIN.')
    console.log('👉 Usage: pnpm tsx scripts/vinCheck-NHTSA.ts 1G1RC6E45EUxxxxxx')
    process.exit(1)
  }

  const uppercaseVin = vin.toUpperCase()
  console.log(`\n🔍 Decoding VIN: ${uppercaseVin}...`)

  try {
    // Call the NHTSA API directly
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${uppercaseVin}?format=json`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const result = data?.Results?.[0]

    if (!result || !result.Make) {
      console.error('❌ No valid vehicle data found for this VIN.')
      process.exit(1)
    }

    // Print the clean results
    console.log('\n✅ Decode Successful!\n')
    console.log('--- Vehicle Details ---')
    console.log(`Year:         ${result.ModelYear}`)
    console.log(`Make:         ${result.Make}`)
    console.log(`Model:        ${result.Model}`)
    console.log(`Trim:         ${result.Trim || 'N/A'}`)
    console.log(`Engine:       ${result.DisplacementL ? `${result.DisplacementL}L` : 'N/A'} ${result.EngineConfiguration}`)
    console.log(`Drive Type:   ${result.DriveType || 'N/A'}`)
    console.log(`Vehicle Type: ${result.VehicleType || 'N/A'}`)
    console.log(`Manufacturer: ${result.Manufacturer || 'N/A'}`)
    console.log(`Plant:        ${result.PlantCity || 'N/A'}, ${result.PlantCountry}`)
    console.log(`Engine Model: ${result.EngineModel || 'N/A'}`)
    console.log(`Engine Cylinders: ${result.EngineCylinders || 'N/A'}`)
    console.log(`Fuel Injection Type: ${result.FuelInjectionType || 'N/A'}`)
    console.log(`Fuel Type Primary: ${result.FuelTypePrimary || 'N/A'}`)
    console.log(`Fuel Type Secondary: ${result.FuelTypeSecondary || 'N/A'}`)
    console.log(`Electrification Level: ${result.ElectrificationLevel || 'N/A'}`)

    // Print the raw JSON
    console.log('\n\n')
    console.log(`-------------------------`)
    console.log('--- Raw JSON Payload ---')
     console.log(`------------------------`)
    console.log(JSON.stringify(result, null, 2))

  } catch (err: any) {
    console.error('\n❌ Failed to fetch data:', err.message)
  }
}

vinCheck()