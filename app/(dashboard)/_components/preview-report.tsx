import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Car, Gauge, Info, MapPin, Wrench } from 'lucide-react'
import type { VehicleDetails } from '@/lib/orpc/routers/vin'

interface PreviewReportProps {
  vehicle: VehicleDetails
  showUpgradePrompt: boolean
  showInsufficientCredits: boolean
}

export function PreviewReport({ 
  vehicle, 
  showUpgradePrompt, 
  showInsufficientCredits 
}: PreviewReportProps) {
  return (
    <div className="space-y-6">
      {/* Vehicle Identity Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            <CardTitle>Vehicle Identity</CardTitle>
          </div>
          <CardDescription>
            Basic vehicle information decoded from VIN
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">VIN</label>
              <p className="font-mono text-sm mt-1">{vehicle.vin}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Make</label>
              <p className="font-semibold mt-1">{vehicle.make}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Model</label>
              <p className="font-semibold mt-1">{vehicle.model}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Year</label>
              <p className="font-semibold mt-1">{vehicle.year}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Trim</label>
              <p className="font-semibold mt-1">{vehicle.trim || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Configuration Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            <CardTitle>Vehicle Configuration</CardTitle>
          </div>
          <CardDescription>
            Technical specifications and configuration details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Engine Information */}
            {(vehicle.engine || vehicle.engineModel || vehicle.engineCylinders) && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Gauge className="h-8 w-8 text-primary" />
                  Engine
                </h4>
                {vehicle.engine && (
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <p className="text-sm">{vehicle.engine}</p>
                  </div>
                )}
                {vehicle.engineModel && (
                  <div>
                    <label className="text-sm text-muted-foreground">Model</label>
                    <p className="text-sm">{vehicle.engineModel}</p>
                  </div>
                )}
                {vehicle.engineCylinders && (
                  <div>
                    <label className="text-sm text-muted-foreground">Cylinders</label>
                    <p className="text-sm">{vehicle.engineCylinders}</p>
                  </div>
                )}
              </div>
            )}

            {/* Drive & Fuel Information */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Car className="h-8 w-8 text-primary" />
                Drive & Fuel
              </h4>
              {vehicle.driveType && (
                <div>
                  <label className="text-sm text-muted-foreground">Drive Type</label>
                  <p className="text-sm">{vehicle.driveType}</p>
                </div>
              )}
              {vehicle.fuelTypePrimary && (
                <div>
                  <label className="text-sm text-muted-foreground">Primary Fuel</label>
                  <p className="text-sm">{vehicle.fuelTypePrimary}</p>
                </div>
              )}
              {vehicle.fuelTypeSecondary && (
                <div>
                  <label className="text-sm text-muted-foreground">Secondary Fuel</label>
                  <p className="text-sm">{vehicle.fuelTypeSecondary}</p>
                </div>
              )}
              {vehicle.electrificationLevel && (
                <div>
                  <label className="text-sm text-muted-foreground">Electrification</label>
                  <p className="text-sm">{vehicle.electrificationLevel}</p>
                </div>
              )}
            </div>

            {/* Manufacturing Information */}
            {(vehicle.manufacturer || vehicle.plantCity || vehicle.plantCountry) && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-8 w-8 text-primary" />
                  Manufacturing
                </h4>
                {vehicle.manufacturer && (
                  <div>
                    <label className="text-sm text-muted-foreground">Manufacturer</label>
                    <p className="text-sm">{vehicle.manufacturer}</p>
                  </div>
                )}
                {(vehicle.plantCity || vehicle.plantCountry) && (
                  <div>
                    <label className="text-sm text-muted-foreground">Plant Location</label>
                    <p className="text-sm">
                      {[vehicle.plantCity, vehicle.plantCountry].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Additional Technical Details */}
            {(vehicle.vehicleType || vehicle.fuelInjectionType) && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Additional Details
                </h4>
                {vehicle.vehicleType && (
                  <div>
                    <label className="text-sm text-muted-foreground">Vehicle Type</label>
                    <p className="text-sm">{vehicle.vehicleType}</p>
                  </div>
                )}
                {vehicle.fuelInjectionType && (
                  <div>
                    <label className="text-sm text-muted-foreground">Fuel Injection</label>
                    <p className="text-sm">{vehicle.fuelInjectionType}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conditional Messages */}
      {showUpgradePrompt && <UpgradePromptCard />}
      {showInsufficientCredits && <InsufficientCreditsCard />}
    </div>
  )
}

function UpgradePromptCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">
              Unlock Full Vehicle Intelligence
            </h3>
            <p className="text-muted-foreground text-lg">
              Get AI-powered risk assessment, market analysis, and buyer guidance
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
            <FeatureHighlight 
              icon="🔍"
              title="Risk Assessment"
              description="AI-powered analysis of potential issues"
            />
            <FeatureHighlight 
              icon="📈"
              title="Market Analysis"
              description="Pricing insights and listing behavior"
            />
            <FeatureHighlight 
              icon="🛡️"
              title="Safety Reports"
              description="Recalls and environmental hazards"
            />
          </div>

          <div className="mt-6">
            <a 
              href="/dashboard/billing"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              View All Plans
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InsufficientCreditsCard() {
  return (
    <Card className="bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20 dark:from-destructive/20 dark:to-destructive/10 dark:border-destructive/30">
      <CardContent className="p-8">
        <div className="text-center space-y-4">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-destructive-foreground">
            {/* <h3 className="text-xl font-bold text-foreground"> */}
              Insufficient Credits
            </h3>
            <p className="text-muted-foreground">
              You need more credits to perform a full vehicle analysis
            </p>
          </div>
          
          <div className="mt-6">
            <a 
              href="/dashboard/billing"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2"
            >
              Purchase Credits
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface FeatureHighlightProps {
  icon: string
  title: string
  description: string
}

function FeatureHighlight({ icon, title, description }: FeatureHighlightProps) {
  return (
    <div className="text-center space-y-2">
      <div className="h-8 w-8 flex items-center justify-center text-2xl mx-auto">{icon}</div>
      <h4 className="font-medium">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}