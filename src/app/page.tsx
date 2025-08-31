import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Play, Wand2, Calendar, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const features = [
    {
      icon: Wand2,
      title: 'AI Generation',
      description: 'Advanced video synthesis using GPT-4, MidJourney and Sora models.',
    },
    {
      icon: Calendar,
      title: 'Scheduling Engine',
      description: 'Automated publishing optimization based on engagement patterns.',
    },
    {
      icon: BarChart3,
      title: 'Performance Analytics',
      description: 'Real-time metrics and performance tracking across platforms.',
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Minimal background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="relative z-20 max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-card border border-border mb-8">
            <div className="w-2 h-2 border border-foreground rounded-full animate-loader-pulse" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AI Content Automation
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">Automated Video</span>
            <br />
            <span className="text-muted-foreground">
              Content Generation
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Generate, optimize and distribute video content across TikTok, YouTube Shorts, 
            and Instagram Reels using advanced AI automation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90 text-sm px-6 py-2 h-10">
              <Link href="/auth/signin">
                Start
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            
            <Button variant="outline" className="border border-border text-foreground hover:bg-muted text-sm px-6 py-2 h-10">
              <Play className="w-4 h-4 mr-2" />
              Demo
            </Button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide">
              Trusted by <span className="text-foreground">5,000+</span> content creators
            </p>
            <div className="flex items-center gap-8 opacity-60">
              <div className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default">TikTok</div>
              <div className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default">YouTube</div>
              <div className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default">Instagram</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-2xl md:text-3xl font-normal mb-4 text-foreground">
              Core Features
            </h2>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              Professional-grade tools for automated content creation and distribution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-card border-border hover:border-foreground/20 transition-colors group">
                  <CardContent className="p-6">
                    <div className="w-8 h-8 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-3 text-foreground group-hover:text-foreground transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-12">
            <div className="flex flex-col sm:flex-row gap-3 justify-start">
              <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90 text-sm px-4 py-2 h-8">
                <Link href="/auth/signin">
                  Get Started
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border border-border text-foreground hover:bg-muted text-sm px-4 py-2 h-8">
                <Link href="/auth/dev-login">
                  Developer Access
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
