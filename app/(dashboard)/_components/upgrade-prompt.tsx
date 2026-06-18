// app/(dashboard)/_components/upgrade-prompt.tsx

import Link from 'next/link'
import { AlertCircle, TrendingUp, Shield, ArrowRight, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PRICING_PLANS, PLAN_IDS, formatPrice } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface UpgradePromptCardProps {
  className?: string
}

interface FeatureHighlightProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureHighlight({ icon, title, description }: FeatureHighlightProps) {
  return (
    <div className="text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

interface PlanCardProps {
  plan: {
    id: string
    title: string
    price: string
    priceSuffix: string
    description: string
    credits: number
    features: string[]
  }
  popular?: boolean
}

function PlanCard({ plan, popular = false }: PlanCardProps) {
  return (
    <div className={cn(
      "relative p-4 rounded-lg border transition-all duration-200 hover:scale-105",
      popular 
        ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
        : "bg-background/60 backdrop-blur-sm border-border/50"
    )}>
      {popular && (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
          Most Popular
        </Badge>
      )}
      
      <div className="text-center space-y-3">
        <div>
          <h4 className="font-semibold text-foreground">{plan.title}</h4>
          <div className="flex items-baseline justify-center gap-1 mt-1">
            <span className="text-2xl font-bold text-foreground">
              ${plan.price}
            </span>
            <span className="text-sm text-muted-foreground">
              {plan.priceSuffix}
            </span>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {plan.credits} credits included
        </p>
        
        <div className="space-y-2">
          {plan.features.slice(0, 2).map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <Check className="h-3 w-3 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </div>
          ))}
          {plan.features.length > 2 && (
            <p className="text-xs text-muted-foreground">
              +{plan.features.length - 2} more features
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function UpgradePromptCard({ className }: UpgradePromptCardProps) {
  // Get the 3 most popular plans for display
  const popularPlans = [
    PRICING_PLANS.find(p => p.id === PLAN_IDS.basic)!,
    PRICING_PLANS.find(p => p.id === PLAN_IDS.pro)!,
    PRICING_PLANS.find(p => p.id === PLAN_IDS.core)!,
  ]

  return (
    <Card className={cn(
      "bg-gradient-to-br from-primary/5 via-background/60 to-primary/10 backdrop-blur-md border-primary/20 ring-1 ring-primary/10",
      className
    )}>
      <CardContent className="p-8">
        <div className="text-center space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-foreground">
              Unlock Full Vehicle Intelligence
            </h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get AI-powered risk assessment, market analysis, and comprehensive buyer guidance
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureHighlight 
              icon={<AlertCircle className="h-6 w-6" />}
              title="Risk Assessment"
              description="AI-powered analysis of potential issues and red flags"
            />
            <FeatureHighlight 
              icon={<TrendingUp className="h-6 w-6" />}
              title="Market Analysis"
              description="Pricing insights and listing behavior patterns"
            />
            <FeatureHighlight 
              icon={<Shield className="h-6 w-6" />}
              title="Safety Reports"
              description="Recalls, flood zones, and environmental hazards"
            />
          </div>

          {/* Popular plans */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">
              Choose Your Plan
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PlanCard plan={popularPlans[0]} />
              <PlanCard plan={popularPlans[1]} popular />
              <PlanCard plan={popularPlans[2]} />
            </div>
          </div>

          {/* Call to action */}
          <div className="pt-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/billing">
                View All Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              No commitment • Cancel anytime • 30-day money-back guarantee
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}