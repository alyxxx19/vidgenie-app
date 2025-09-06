'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen relative" style={{
      background: 'linear-gradient(180deg, #000000 0%, #111111 100%)'
    }}>
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 39px,
          rgba(38, 38, 38, 0.3) 39px,
          rgba(38, 38, 38, 0.3) 40px
        ),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 39px,
          rgba(38, 38, 38, 0.3) 39px,
          rgba(38, 38, 38, 0.3) 40px
        )`
      }} />
      
      {/* Header Skeleton */}
      <header className="relative z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="animate-pulse">
              <div className="h-5 w-24 bg-secondary" />
              <div className="h-3 w-32 bg-secondary mt-2" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-secondary animate-pulse" />
              <div className="h-8 w-8 bg-secondary animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="h-3 w-32 bg-secondary animate-pulse" />
                <div className="w-9 h-9 bg-secondary border border-border animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-secondary mb-2 animate-pulse" />
                <div className="h-3 w-full bg-secondary mb-4 animate-pulse" />
                <div className="h-2 w-full bg-secondary animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <Card className="bg-card border border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-10 w-64 bg-secondary animate-pulse" />
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-20 bg-secondary animate-pulse" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}