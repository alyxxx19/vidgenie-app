'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-cyber-gradient relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      {/* Header Skeleton */}
      <header className="bg-card border-b border-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="animate-pulse">
              <div className="h-5 w-24 bg-secondary rounded mb-2" />
              <div className="h-3 w-32 bg-secondary rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-secondary rounded animate-pulse" />
              <div className="h-8 w-8 bg-secondary rounded animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card/80 backdrop-blur-sm border-secondary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="h-3 w-32 bg-secondary rounded animate-pulse" />
                <div className="w-9 h-9 bg-secondary rounded-lg animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-secondary rounded mb-2 animate-pulse" />
                <div className="h-3 w-full bg-secondary rounded mb-4 animate-pulse" />
                <div className="h-2 w-full bg-secondary rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <Card className="bg-card/80 backdrop-blur-sm border-secondary">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-10 w-64 bg-secondary rounded animate-pulse" />
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-20 bg-secondary rounded animate-pulse" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}