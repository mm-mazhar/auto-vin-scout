// app/(dashboard)/_components/report-actions-menu.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Car, Gauge, Info, MapPin, Wrench, FileText, TrendingUp, Shield, CheckSquare, TriangleAlert, Scale, Zap } from 'lucide-react'
import type { ReportWithVehicle, VehicleDetails } from '@/lib/orpc/routers/vin'
import { PreviewReport } from './preview-report'

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
  const { vehicle, status } = report
  const [activeTab, setActiveTab] = useState('executive')

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

  // Polling for PENDING reports (only for full reports)
  useEffect(() => {
    if (isPreview || status !== 'PENDING') return

    const pollInterval = setInterval(() => {
      // Simple page reload when polling
      window.location.reload()
    }, 5000) // Poll every 5 seconds

    // Cleanup on unmount or status change
    return () => clearInterval(pollInterval)
  }, [status, isPreview])

  const getRiskColor = (label: string | null) => {
    switch (label) {
      case 'Low':
        return 'oklch(0.696 0.17 162.48)' // chart-2: Green
      case 'Moderate':
        return 'oklch(0.828 0.189 84.429)' // chart-4: Yellow/Orange
      case 'Elevated':
        return 'oklch(0.577 0.245 27.325)' // destructive: Red
      case 'High':
        return 'oklch(0.577 0.245 27.325)' // destructive: Red
      default:
        return 'oklch(72.887% 0.21192 147.841)' // primary: Default
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
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger 
          value="executive" 
          className="flex items-center gap-2 data-[state=active]:border-3 data-[state=active]:border-primary data-[state=active]:-mt-0.5 data-[state=active]:-ml-0.5"
        >
          <FileText className="h-4 w-4" />
          Executive Overview
        </TabsTrigger>
        <TabsTrigger value="market" className="flex items-center gap-2" disabled>
          <TrendingUp className="h-4 w-4" />
          Market & Behavior
        </TabsTrigger>
        <TabsTrigger value="safety" className="flex items-center gap-2" disabled>
          <Shield className="h-4 w-4" />
          Safety & Environment
        </TabsTrigger>
        <TabsTrigger value="guidance" className="flex items-center gap-2" disabled>
          <CheckSquare className="h-4 w-4" />
          Buyer Guidance
        </TabsTrigger>
        <TabsTrigger value="legal" className="flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Legal Disclaimer
        </TabsTrigger>
      </TabsList>

      {/* Executive Overview Tab */}
      <TabsContent value="executive" className="space-y-6">
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

        {/* Premium Specs — only shown when MarketCheck data is available */}
        {vehicle.decoderSource === 'MARKETCHECK' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle>Specifications</CardTitle>
              </div>
              <CardDescription>
                Enhanced data — transmission, dimensions, fuel economy, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Powertrain */}
                {(vehicle.transmission || vehicle.powertrainType || vehicle.cylinders || vehicle.engineSize) && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-primary" />
                      Powertrain
                    </h4>
                    {vehicle.transmission && (
                      <div>
                        <label className="text-sm text-muted-foreground">Transmission</label>
                        <p className="text-sm">{vehicle.transmission}</p>
                      </div>
                    )}
                    {vehicle.powertrainType && (
                      <div>
                        <label className="text-sm text-muted-foreground">Powertrain Type</label>
                        <p className="text-sm">{vehicle.powertrainType}</p>
                      </div>
                    )}
                    {vehicle.engineSize != null && (
                      <div>
                        <label className="text-sm text-muted-foreground">Engine Size</label>
                        <p className="text-sm">{vehicle.engineSize}L</p>
                      </div>
                    )}
                    {vehicle.cylinders != null && (
                      <div>
                        <label className="text-sm text-muted-foreground">Cylinders</label>
                        <p className="text-sm">{vehicle.cylinders}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Body & Seating */}
                {(vehicle.bodySubtype || vehicle.doors != null || vehicle.stdSeating != null) && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Car className="h-4 w-4 text-primary" />
                      Body & Seating
                    </h4>
                    {vehicle.bodySubtype && (
                      <div>
                        <label className="text-sm text-muted-foreground">Body Subtype</label>
                        <p className="text-sm">{vehicle.bodySubtype}</p>
                      </div>
                    )}
                    {vehicle.doors != null && (
                      <div>
                        <label className="text-sm text-muted-foreground">Doors</label>
                        <p className="text-sm">{vehicle.doors}</p>
                      </div>
                    )}
                    {vehicle.stdSeating != null && (
                      <div>
                        <label className="text-sm text-muted-foreground">Standard Seating</label>
                        <p className="text-sm">{vehicle.stdSeating}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Fuel Economy */}
                {(vehicle.highwayMpg != null || vehicle.cityMpg != null) && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Fuel Economy
                    </h4>
                    {vehicle.highwayMpg != null && (
                      <div>
                        <label className="text-sm text-muted-foreground">Highway</label>
                        <p className="text-sm">{vehicle.highwayMpg} MPG</p>
                      </div>
                    )}
                    {vehicle.cityMpg != null && (
                      <div>
                        <label className="text-sm text-muted-foreground">City</label>
                        <p className="text-sm">{vehicle.cityMpg} MPG</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Dimensions */}
                {(vehicle.overallHeight != null || vehicle.overallLength != null || vehicle.overallWidth != null) && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      Dimensions
                    </h4>
                    <div className="flex gap-6">
                      {vehicle.overallLength != null && (
                        <div>
                          <label className="text-sm text-muted-foreground">Length</label>
                          <p className="text-sm">{vehicle.overallLength}&quot;</p>
                        </div>
                      )}
                      {vehicle.overallWidth != null && (
                        <div>
                          <label className="text-sm text-muted-foreground">Width</label>
                          <p className="text-sm">{vehicle.overallWidth}&quot;</p>
                        </div>
                      )}
                      {vehicle.overallHeight != null && (
                        <div>
                          <label className="text-sm text-muted-foreground">Height</label>
                          <p className="text-sm">{vehicle.overallHeight}&quot;</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        )}

        {/* Risk Assessment Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Risk Assessment</CardTitle>
            </div>
            <CardDescription>
              AI-powered risk analysis and buyer guidance. Remember AI makes mistakes. It is your responsibility to confirm the Data and Narratives
            </CardDescription>
            {isAiFallback && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Analysis based on general rules due to temporary service limitations. Enhanced AI analysis is currently unavailable. Please contact support.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {status === 'PENDING' && (
              <div className="flex items-center gap-4 p-6 bg-muted/50 rounded-lg">
                <Skeleton className="h-32 w-32 rounded-full" data-testid="skeleton" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" data-testid="skeleton" />
                  <Skeleton className="h-4 w-[300px]" data-testid="skeleton" />
                  <p className="text-sm text-muted-foreground mt-4">
                    Analyzing vehicle risk factors... This may take up to 30 seconds.
                  </p>
                </div>
              </div>
            )}

            {status === 'COMPLETED' && (
              <div className="space-y-6">
                {/* Side-by-side Layout: Risk Score + Assessment Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  
                  {/* Left Side: Circular Risk Score Display */}
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-lg font-medium text-muted-foreground mb-6 tracking-wider uppercase">
                      Overall Risk Index
                    </h3>
                    
                    {/* Circular Progress */}
                    <div className="relative w-32 h-32 mb-4">
                      {/* Background Circle */}
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-muted/20"
                        />
                        {/* Progress Circle with Dynamic Color */}
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          stroke={getRiskColor(riskLabel)}
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - (riskScore ?? 0) / 100)}`}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      
                      {/* Score Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-foreground">
                          {riskScore ?? 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          / 100
                        </div>
                      </div>
                    </div>

                    {/* Risk Label Badge */}
                    {riskLabel && (
                      <div 
                        className="text-sm px-4 py-2 rounded-full text-white font-medium"
                        style={{ backgroundColor: getRiskColor(riskLabel) }}
                      >
                        {riskLabel} Risk
                      </div>
                    )}
                  </div>

                  {/* Right Side: Assessment Details with Curved Border */}
                  {riskNarrative && (
                    <div className="relative bg-card border border-border rounded-lg p-6">
                      {/* Curved Left Border extending to corners - wider and more curved */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xl"
                        style={{
                          backgroundColor: getRiskColor(riskLabel)
                        }}
                      ></div>
                      
                      <div className="pl-6">
                        <h4 className="font-medium mb-4 capitalize tracking-wide text-sm"
                            style={{ color: getRiskColor(riskLabel) }}>
                          Assessment Details
                        </h4>
                        <div className="space-y-3">
                          {riskNarrative
                            .split(/[•·-]\s*/)
                            .filter(item => item.trim())
                            .map((item, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <TriangleAlert 
                                  className="w-4 h-4 mt-0.5 shrink-0" 
                                  style={{ color: getRiskColor(riskLabel) }}
                                />
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                  {item.trim()}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {status === 'FAILED' && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Risk Assessment Failed</p>
                  <p className="text-sm text-muted-foreground">
                    Unable to generate risk assessment for this vehicle. Please try again or contact support.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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

      {/* Market & Behavior Tab - Placeholder */}
      <TabsContent value="market" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>Market & Behavior Analysis</CardTitle>
            </div>
            <CardDescription>
              Market pricing analysis and listing behavior insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Coming Soon</p>
                <p className="text-sm">Market analysis and pricing insights will be available in a future update.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Safety & Environment Tab - Placeholder */}
      <TabsContent value="safety" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Safety & Environmental Risk</CardTitle>
            </div>
            <CardDescription>
              Safety recalls, environmental hazards, and regulatory compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Coming Soon</p>
                <p className="text-sm">Safety recalls and environmental risk analysis will be available in a future update.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Buyer Guidance Tab - Placeholder */}
      <TabsContent value="guidance" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              <CardTitle>Buyer Guidance & Inspection Checklist</CardTitle>
            </div>
            <CardDescription>
              Actionable recommendations and inspection checklist for buyers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Coming Soon</p>
                <p className="text-sm">Buyer guidance and inspection checklist will be available in a future update.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Legal Disclaimer Tab */}
      <TabsContent value="legal" className="space-y-6">
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