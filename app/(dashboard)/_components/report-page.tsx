// app/(dashboard)/_components/report-actions-menu.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Car, Gauge, Info, MapPin, Wrench, FileText, TrendingUp, Shield, ShieldCheck, CheckSquare, Scale, Zap, Bell, MessageSquare, Copy, Droplets, Lock, Search, Users, Cog, CircleDot, RefreshCw } from 'lucide-react'
import type { ReportWithVehicle, VehicleDetails } from '@/lib/orpc/routers/vin'
import { PreviewReport } from './preview-report'
import { RecallsSection } from './recalls-section'
import { ExecutiveOverviewTab } from './executive-overview-tab'
import { MarketBehaviorTab } from './market-behavior-tab'
import { NhtsaSafetyTab } from './nhtsa-safety-tab'
import { BuyerGuidanceInsights } from './buyer-guidance-insights'
import { PowertrainBadge } from './powertrain-badge'
import { ExportPdfButton } from './export-pdf-button'
// Type for preview reports (from analyze output)
type PreviewReportType = {
  reportId: string | null
  status: 'FREE_PREVIEW' | 'ZERO_CREDITS'
  vehicle: VehicleDetails
  isPreview: true
}

interface ReportPageProps {
  report: ReportWithVehicle | PreviewReportType
  projectId: string
}

export function ReportPage({ report: initialReport, projectId }: ReportPageProps) {
  const [report, setReport] = useState(initialReport)
  const router = useRouter()
  const { vehicle, status } = report
  const [activeTab, setActiveTab] = useState('executive')

  // Sync local state when the server re-renders with fresh data (router.refresh())
  useEffect(() => {
    setReport(initialReport)
  }, [initialReport])

  // Check if this is a preview report
  const isPreview = 'isPreview' in report && report.isPreview

  // Determine which sections to show based on report type
  const showTabs = !isPreview && ['PENDING', 'COMPLETED', 'FAILED'].includes(status)
  const showUpgradePrompt = status === 'FREE_PREVIEW'
  const showInsufficientCredits = status === 'ZERO_CREDITS'

  // Only access these properties if it's a full report
  const riskScore = !isPreview && 'riskScore' in report ? report.riskScore : null
  const riskLabel = !isPreview && 'riskLabel' in report ? report.riskLabel : null
  const riskNarrative = !isPreview && 'riskNarrative' in report ? report.riskNarrative : null
  const isAiFallback = !isPreview && 'isAiFallback' in report ? report.isAiFallback : false

  // Polling for PENDING reports — uses router.refresh() to trigger server re-render
  // The effect re-runs whenever status changes, so it stops automatically when
  // the server returns COMPLETED/FAILED (setReport above updates status)
  useEffect(() => {
    if (isPreview || status !== 'PENDING') return

    const startTime = Date.now()
    const MAX_POLL_MS = 120_000 // stop after 2 minutes

    const pollInterval = setInterval(() => {
      if (Date.now() - startTime > MAX_POLL_MS) {
        clearInterval(pollInterval)
        return
      }
      router.refresh()
    }, 4000)

    return () => clearInterval(pollInterval)
  }, [status, isPreview, router])

  const getRiskColor = (label: string | null) => {
    switch (label) {
      case 'Low':
        return 'oklch(0.696 0.17 162.48)' // chart-2: Green
      case 'Moderate':
      case 'Medium':
        return 'oklch(0.6 0.189 55)' // Darker amber — better contrast with white text
      case 'Elevated':
      case 'High':
        return 'oklch(0.577 0.245 27.325)' // destructive: Red
      default:
        // Fallback: derive color from score if label is missing/unrecognized
        if (riskScore !== null) {
          if (riskScore <= 30) return 'oklch(0.696 0.17 162.48)' // Green
          if (riskScore <= 70) return 'oklch(0.6 0.189 55)' // Amber
          return 'oklch(0.577 0.245 27.325)' // Red
        }
        return 'oklch(0.552 0.016 285.938)' // muted-foreground: neutral gray
    }
  }

  return (
    <div className="container mx-auto py-6">
      {/* Report Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              {/* Decoder source badge */}
              {vehicle.decoderSource === 'MARKETCHECK' ? (
                <div className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  MarketCheck Enhanced
                </div>
              ) : (
                <div className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                  NHTSA vPIC Verified
                </div>
              )}
            </div>
            <p className="text-muted-foreground font-mono text-sm">
              VIN: {vehicle.vin}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Report Generated</p>
            <p>{new Date(isPreview ? new Date() : (report as ReportWithVehicle).createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            {showTabs && status === 'COMPLETED' && (
              <div className="mt-2">
                <ExportPdfButton vehicleLabel={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conditional Content */}
      {showTabs ? (
        <FullReportWithTabs 
          report={report as ReportWithVehicle} 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          riskScore={riskScore}
          riskLabel={riskLabel}
          riskNarrative={riskNarrative}
          isAiFallback={isAiFallback}
          getRiskColor={getRiskColor}
        />
      ) : (
        <PreviewReport 
          vehicle={vehicle}
          showUpgradePrompt={showUpgradePrompt}
          showInsufficientCredits={showInsufficientCredits}
        />
      )}
    </div>
  )
}

// Animated progress component shown while report is being analyzed
const ANALYSIS_STEPS = [
  { label: 'Baseline', icon: CircleDot },
  { label: 'Safety', icon: ShieldCheck },
  { label: 'Engine', icon: Cog },
  { label: 'Corrosion', icon: Wrench },
  { label: 'Flood', icon: Droplets },
  { label: 'Theft', icon: Lock },
  { label: 'Forensics', icon: Search },
  { label: 'Reliability', icon: Users },
  { label: 'Risk Synthesis', icon: Shield },
]

function AnalysisProgress() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % ANALYSIS_STEPS.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Analyzing vehicle risk factors...</p>
        <p className="text-xs text-muted-foreground">This may take up to a minute</p>
      </div>

      {/* Indeterminate progress bar — no fake percentage */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full bg-primary w-1/3 animate-[indeterminate_1.8s_ease-in-out_infinite]" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between gap-1">
        {ANALYSIS_STEPS.map((step, i) => {
          const StepIcon = step.icon
          const isActive = i === activeStep
          const isPast = i < activeStep
          return (
            <div
              key={step.label}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${
                isActive || isPast ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <StepIcon
                className={`h-5 w-5 transition-colors duration-300 ${
                  isActive ? 'text-primary' : isPast ? 'text-primary/60' : 'text-muted-foreground'
                }`}
              />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{step.label}</span>
              {isActive && (
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((dot) => (
                    <div
                      key={dot}
                      className="w-1 h-1 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${dot * 150}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        <span className="text-foreground font-medium">{ANALYSIS_STEPS[activeStep].label}</span>
      </p>

      {/* Refresh button for when results are ready but UI hasn't updated */}
      <div className="text-center pt-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => window.location.reload()}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Taking too long? Refresh page
        </Button>
      </div>
    </div>
  )
}

// Component for full reports with tabs
interface FullReportWithTabsProps {
  report: ReportWithVehicle
  activeTab: string
  setActiveTab: (tab: string) => void
  riskScore: number | null
  riskLabel: string | null
  riskNarrative: string | null
  isAiFallback: boolean
  getRiskColor: (label: string | null) => string
}

function FullReportWithTabs({ 
  report, 
  activeTab, 
  setActiveTab, 
  riskScore, 
  riskLabel, 
  riskNarrative, 
  isAiFallback,
  getRiskColor
}: FullReportWithTabsProps) {
  const { vehicle, status } = report

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger 
          value="executive" 
          className="flex items-center gap-2 data-[state=active]:border-3 data-[state=active]:border-primary data-[state=active]:-mt-0.5 data-[state=active]:-ml-0.5"
        >
          <FileText className="h-4 w-4 text-primary" />
          Executive Overview
        </TabsTrigger>
        <TabsTrigger value="market" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Market & Behavior
        </TabsTrigger>
        <TabsTrigger value="safety" className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          NHTSA Recalls
        </TabsTrigger>
        <TabsTrigger value="crash-tests" className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          NHTSA Safety
        </TabsTrigger>
        <TabsTrigger value="guidance" className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          Buyer Guidance
        </TabsTrigger>
        <TabsTrigger value="legal" className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          Legal Disclaimer
        </TabsTrigger>
      </TabsList>

      {/* Executive Overview Tab */}
      <TabsContent value="executive" data-print-title="Executive Overview" className="space-y-6 data-[state=inactive]:hidden" forceMount>
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
              {(vehicle.engineDesc || vehicle.engineModel || vehicle.engineCylinders) && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Gauge className="h-8 w-8 text-primary" />
                    Engine
                  </h4>
                  {vehicle.engineDesc && (
                    <div>
                      <label className="text-sm text-muted-foreground">Description</label>
                      <p className="text-sm">{vehicle.engineDesc}</p>
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

        {/* Enhanced Specifications — 3-card row */}
        {vehicle.decoderSource === 'MARKETCHECK' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Specifications */}
            <Card>
              <CardContent className="pt-5 pb-4">
                <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground">Specifications</span>
                </h4>
                <div className="space-y-2.5">
                  {vehicle.transmission && (
                    <div>
                      <p className="text-xs text-muted-foreground">Transmission</p>
                      <p className="text-sm font-medium">{vehicle.transmission}</p>
                    </div>
                  )}
                  {vehicle.engineSize != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Engine Size</p>
                      <p className="text-sm font-medium">{vehicle.engineSize}L</p>
                    </div>
                  )}
                  {vehicle.cylinders != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Cylinders</p>
                      <p className="text-sm font-medium">{vehicle.cylinders}</p>
                    </div>
                  )}
                  {vehicle.bodySubtype && (
                    <div>
                      <p className="text-xs text-muted-foreground">Body</p>
                      <p className="text-sm font-medium">{vehicle.bodySubtype}</p>
                    </div>
                  )}
                  {vehicle.doors != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Doors</p>
                      <p className="text-sm font-medium">{vehicle.doors}</p>
                    </div>
                  )}
                  {vehicle.stdSeating != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Seating</p>
                      <p className="text-sm font-medium">{vehicle.stdSeating} passengers</p>
                    </div>
                  )}
                  {(vehicle.overallLength != null || vehicle.overallWidth != null || vehicle.overallHeight != null) && (
                    <div>
                      <p className="text-xs text-muted-foreground">Dimensions (L × W × H)</p>
                      <p className="text-sm font-medium">
                        {vehicle.overallLength ?? '—'}&quot; × {vehicle.overallWidth ?? '—'}&quot; × {vehicle.overallHeight ?? '—'}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Key Specs */}
            <Card>
              <CardContent className="pt-5 pb-4">
                <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground">Key Specs</span>
                </h4>
                <div className="space-y-2.5">
                  {vehicle.engineDesc && (
                    <div>
                      <p className="text-xs text-muted-foreground">Engine</p>
                      <p className="text-sm font-medium">{vehicle.engineDesc}</p>
                    </div>
                  )}
                  {vehicle.driveType && (
                    <div>
                      <p className="text-xs text-muted-foreground">Drivetrain</p>
                      <p className="text-sm font-medium">{vehicle.driveType}</p>
                    </div>
                  )}
                  {vehicle.turbo && (
                    <div>
                      <p className="text-xs text-muted-foreground">Turbo</p>
                      <p className="text-sm font-medium">{vehicle.turbo}</p>
                    </div>
                  )}
                  {vehicle.highwayMpg != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Highway</p>
                      <p className="text-sm font-medium">{vehicle.highwayMpg} MPG</p>
                    </div>
                  )}
                  {vehicle.cityMpg != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">City</p>
                      <p className="text-sm font-medium">{vehicle.cityMpg} MPG</p>
                    </div>
                  )}
                  {vehicle.powertrainType && (
                    <div>
                      <p className="text-xs text-muted-foreground">Powertrain</p>
                      <p className="text-sm font-medium">{vehicle.powertrainType}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Powertrain Type Badge */}
            <Card>
              <CardContent className="pt-5 pb-4 flex flex-col items-center justify-center text-center h-full">
                <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground">Powertrain Type</span>
                </h4>
                <PowertrainBadge
                  electrificationLevel={vehicle.electrificationLevel}
                  fuelTypePrimary={vehicle.fuelTypePrimary}
                  fuelTypeSecondary={vehicle.fuelTypeSecondary}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Risk Assessment Section */}
        {status === 'PENDING' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Risk Assessment</CardTitle>
              </div>
              <CardDescription>
                AI-powered risk analysis and buyer guidance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalysisProgress />
            </CardContent>
          </Card>
        )}

        {status === 'COMPLETED' && (
          <ExecutiveOverviewTab
            report={report}
            riskScore={riskScore}
            riskLabel={riskLabel}
            riskNarrative={riskNarrative}
            isAiFallback={isAiFallback}
            getRiskColor={getRiskColor}
          />
        )}

        {status === 'FAILED' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Risk Assessment Failed</p>
                  <p className="text-sm text-muted-foreground">
                    Unable to generate risk assessment for this vehicle. Please try again or contact support.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Metadata */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Report ID: {report.id}</span>
              <span>Created: {new Date(report.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Market & Behavior Tab */}
      <TabsContent value="market" data-print-title="Market & Behavior" className="space-y-6 data-[state=inactive]:hidden" forceMount>
        <MarketBehaviorTab listings={report.vehicle.listingHistory ?? []} />
      </TabsContent>

      {/* Safety & Environment Tab */}
      <TabsContent value="safety" data-print-title="NHTSA Recalls" className="space-y-6 data-[state=inactive]:hidden" forceMount>
        <RecallsSection
          recalls={vehicle.recalls ?? []}
          vehicleLabel={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        />
      </TabsContent>

      {/* NHTSA Crash Test Ratings Tab */}
      <TabsContent value="crash-tests" data-print-title="NHTSA Safety Ratings" className="space-y-6 data-[state=inactive]:hidden" forceMount>
        <NhtsaSafetyTab safetyRating={vehicle.safetyRating ?? null} />
      </TabsContent>

      {/* Buyer Guidance Tab — AI Negotiation Script */}
      <TabsContent value="guidance" data-print-title="Buyer Guidance" className="space-y-6 data-[state=inactive]:hidden" forceMount>
        {/* Data-driven insights */}
        {vehicle.listingHistory && vehicle.listingHistory.length > 0 && (
          <BuyerGuidanceInsights
            listings={vehicle.listingHistory}
            vehicle={{
              year: vehicle.year,
              make: vehicle.make,
              model: vehicle.model,
              cityMpg: vehicle.cityMpg,
              highwayMpg: vehicle.highwayMpg,
              fuelTypePrimary: vehicle.fuelTypePrimary,
              engineSize: vehicle.engineSize,
            }}
            pricePrediction={report.pricePrediction ?? null}
          />
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              <CardTitle>Buyer Guidance & Negotiation Script</CardTitle>
            </div>
            <CardDescription>
              AI-generated talking points and inspection checklist based on risk findings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {report.negotiationScript ? (
              <div className="space-y-4">
                <div className="bg-muted/30 border-l-4 border-l-primary rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium">AI Negotiation Script</h3>
                    </div>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(report.negotiationScript!)
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                  <div className="bg-card rounded-lg p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                    {report.negotiationScript}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">
                  <p className="font-medium mb-1">How to use this script:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use these talking points when contacting the seller via text, email, or phone.</li>
                    <li>Ask questions in a non-confrontational way — you&apos;re gathering information, not accusing.</li>
                    <li>If the seller can&apos;t explain a finding, use it as leverage for a price reduction.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <div className="text-center">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Guidance Available</p>
                  <p className="text-sm">Negotiation script will appear here once the risk assessment completes.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Legal Disclaimer Tab */}
      <TabsContent value="legal" data-print-title="Legal Disclaimer" className="space-y-6 data-[state=inactive]:hidden" forceMount>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              <CardTitle>Important Legal Disclaimer</CardTitle>
            </div>
            <CardDescription>
              Please read this disclaimer carefully before using this report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-4">
              <p className="font-semibold text-base">
                <span className="font-semibold text-red-700">READ CAREFULLY:</span> This report is provided for informational purposes only and should not be considered as professional advice.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Data Accuracy</h4>
                  <p>While we strive for accuracy, vehicle information is sourced from third-party databases (NHTSA, government agencies) and may contain errors, omissions, or outdated information. We do not guarantee the completeness or accuracy of any data presented.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">AI Analysis Limitations</h4>
                  <p>Risk assessments are generated using artificial intelligence and automated systems. AI can make mistakes, produce inaccurate results, or miss critical information. {isAiFallback && <span className="font-semibold text-red-700">This report used fallback analysis due to AI service limitations and may be less comprehensive than our standard AI-powered assessment.</span>}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Not Professional Advice</h4>
                  <p>This report does not constitute professional mechanical, legal, financial, or purchasing advice. Always consult qualified professionals (certified mechanics, automotive experts, legal advisors) before making vehicle purchase decisions.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Independent Verification Required</h4>
                  <p>You must independently verify all information, including but not limited to: vehicle history, recalls, safety ratings, market values, flood damage, accident history, and mechanical condition through professional inspection.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Limitation of Liability</h4>
                  <p>AutoVinScout, its affiliates, employees, and service providers shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of this report or any decisions made based on its contents, including but not limited to financial losses, vehicle defects, safety issues, or purchase decisions.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">No Warranty</h4>
                  <p>This service is provided &quot;AS&quot;, &quot;IS&quot; without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Simulated Data Notice</h4>
                  <p>Some data points in this report may be simulated or estimated for demonstration purposes. All simulated data is clearly marked and should not be relied upon for actual purchase decisions.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Time Sensitivity</h4>
                  <p>Vehicle information, recalls, and market conditions change frequently. This report reflects information available at the time of generation and may become outdated.</p>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-6">
                <p className="font-semibold text-base">
                  By using this report, you acknowledge that you have read, understood, and agree to these terms. You assume full responsibility for any decisions made based on this information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}