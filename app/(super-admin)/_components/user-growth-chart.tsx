// app/(super-admin)/_components/user-growth-chart.tsx

'use client';

import { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Users } from 'lucide-react'; // User Icon

export type UserDataPoint = {
  month: string;
  value: number;
};

type UserGrowthChartProps = {
  className?: string;
  data: UserDataPoint[];
};

// Blue-ish palette for Users
const BAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-sky-500', 'bg-blue-600', 'bg-indigo-400', 'bg-sky-600',
];

export const UserGrowthChart = memo(({ className, data }: UserGrowthChartProps) => {
  const [period, setPeriod] = useState<string>("6");
  const [chartType, setChartType] = useState<'bar' | 'line'>('line');

  // Filter data based on selection
  const filteredData = useMemo(() => {
    const sliceCount = parseInt(period);
    return data.slice(-sliceCount);
  }, [data, period]);

  const maxValue = Math.max(...filteredData.map((d) => d.value)) || 1;

  const chartData = useMemo(
    () =>
      filteredData.map((point, index) => {
        const prevValue = filteredData[index - 1]?.value || 0;
        let momChange = 0;
        if (prevValue === 0 && point.value > 0) momChange = 100;
        else if (prevValue > 0) momChange = ((point.value - prevValue) / prevValue) * 100;

        const ratio = filteredData.length > 1 ? index / (filteredData.length - 1) : 0.5;
        const x = ratio * 100;
        const y = 100 - (point.value / maxValue) * 100;

        return { ...point, momChange, x, y };
      }),
    [filteredData, maxValue],
  );

  // Stats Calculation
  const stats = useMemo(() => {
    const total = filteredData.reduce((acc, curr) => acc + curr.value, 0);
    const average = total / (filteredData.length || 1);
    
    const firstVal = filteredData[0]?.value || 0;
    const lastVal = filteredData[filteredData.length - 1]?.value || 0;
    let growthRate = 0;
    
    if (firstVal === 0 && lastVal > 0) growthRate = 100;
    else if (firstVal > 0) growthRate = ((lastVal - firstVal) / firstVal) * 100;
    
    return { total, average, growthRate };
  }, [filteredData]);

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            User Growth
          </CardTitle>
          <span className="text-xs font-normal text-muted-foreground">
            Monthly new signups
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={chartType} onValueChange={(v) => setChartType(v as 'bar' | 'line')}>
            <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs focus-visible:ring-0 focus-visible:border-primary">
              <SelectValue placeholder="Chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line chart</SelectItem>
              <SelectItem value="bar">Bar chart</SelectItem>
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between gap-6">
        <div className="h-52">
          {chartType === 'bar' ? (
            <div className="flex justify-between gap-3 h-full items-end">
              <TooltipProvider delayDuration={100}>
                {chartData.map((point, index) => {
                  const height = `${Math.round((point.value / maxValue) * 100)}%`;
                  const isZero = point.value === 0;
                  const colorClass = BAR_COLORS[index % BAR_COLORS.length];

                  return (
                    <div
                      key={point.month}
                      className="flex flex-1 flex-col items-center gap-2 h-full justify-end group"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative w-full flex items-end h-full">
                            <div
                              className={`w-full rounded-t-md transition-all duration-500 ease-in-out ${colorClass} hover:opacity-80 cursor-pointer`}
                              style={{ height: isZero ? '4px' : height }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover text-popover-foreground border-border shadow-xl p-2 rounded-lg text-xs font-medium">
                          <div className="text-center mb-1 text-muted-foreground">{point.month}</div>
                          <div className="text-lg font-bold text-center">
                            {point.value} Users
                          </div>
                          {index > 0 && (
                            <div
                              className={`text-center mt-1 ${
                                point.momChange >= 0 ? 'text-emerald-500' : 'text-red-500'
                              }`}
                            >
                              {point.momChange > 0 ? '+' : ''}
                              {Math.round(point.momChange)}
                              %
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-nowrap">
                          {point.month}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </TooltipProvider>
            </div>
          ) : (
            <div className="relative h-full">
              <TooltipProvider delayDuration={100}>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full text-blue-500/80"
                >
                  {chartData.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      points={chartData.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  )}
                </svg>
                {chartData.map((point) => (
                  <Tooltip key={point.month}>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      >
                        <div className="h-2 w-2 rounded-full bg-blue-500 border border-background" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border-border shadow-xl p-2 rounded-lg text-xs font-medium">
                      <div className="text-center mb-1 text-muted-foreground">{point.month}</div>
                      <div className="text-lg font-bold text-center">
                        {point.value} Users
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
              <div className="absolute inset-x-0 bottom-0 translate-y-4 flex justify-between gap-3">
                {chartData.map((point) => (
                  <span
                    key={`${point.month}-label`}
                    className="text-xs font-medium text-muted-foreground text-nowrap"
                  >
                    {point.month}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {stats.total.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              New Users
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-500">
              {stats.growthRate > 0 ? '+' : ''}{Math.round(stats.growthRate)}%
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              Growth Rate
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">
              {stats.average.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              Avg. Monthly
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
});

UserGrowthChart.displayName = 'UserGrowthChart';
