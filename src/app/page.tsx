'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import PricingSection from '@/components/pricing-section';

const StatsCounter = ({ value, label }: { value: string; label: string }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
            let current = 0;
            const increment = numericValue / 50;
            const timer = setInterval(() => {
              current += increment;
              if (current >= numericValue) {
                setCount(numericValue);
                clearInterval(timer);
              } else {
                setCount(Math.ceil(current));
              }
            }, 30);
          }
        });
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`stat-${label}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [value, label, hasAnimated]);

  const formatValue = (num: number) => {
    if (value.includes('%')) return `${num}%`;
    if (value.includes('M+')) return `${(num / 1000000).toFixed(0)}M+`;
    if (value.includes('K+')) return `${(num / 1000).toFixed(0)}K+`;
    if (value.includes('B+')) return `${(num / 1000000000).toFixed(0)}B+`;
    return num.toString();
  };

  return (
    <div className="stat-item" id={`stat-${label}`}>
      <span className="text-3xl md:text-4xl font-mono mb-2 block text-foreground">
        {hasAnimated ? value : formatValue(count)}
      </span>
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
};


export default function HomePage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 50);
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);

    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      anchorLinks.forEach(anchor => {
        anchor.removeEventListener('click', () => {});
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-border ${
        navScrolled 
          ? 'py-3 bg-background/95 backdrop-blur-md' 
          : 'py-4 bg-background/80 backdrop-blur-sm'
      }`}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <div className="text-xl font-mono uppercase tracking-wide text-foreground">
            VIDGENIE
          </div>
          <div className="md:hidden">
            <Button size="sm" variant="outline" className="border-border hover:bg-card font-mono lowercase text-xs">
              menu
            </Button>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-mono lowercase tracking-wide text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105">
              features
            </a>
            <a href="#pricing" className="text-sm font-mono lowercase tracking-wide text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105">
              pricing
            </a>
            <a href="#testimonials" className="text-sm font-mono lowercase tracking-wide text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105">
              testimonials
            </a>
            <Button asChild size="sm" className="bg-foreground text-background hover:bg-transparent hover:text-foreground hover:border-foreground border border-transparent transition-all duration-300 hover:scale-105">
              <Link href="/auth/signin">
                <span className="font-mono lowercase">get started</span>
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center" style={{
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
        
        <div className="relative z-10 max-w-6xl mx-auto px-8 text-center" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border mb-8">
            <div className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Agent AI Intelligent
            </span>
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight mb-6" style={{ lineHeight: '1', letterSpacing: '-0.02em' }}>
            <span className="text-foreground">Agent AI</span>
            <br />
            <span className="text-muted-foreground">Vidéo Intelligent</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-2xl mb-12 font-mono" style={{ lineHeight: '1.6' }}>
            Agent AI intelligent qui facilite et automatise vos workflows de création vidéo.
            Génération, optimisation et distribution automatisées sur TikTok, YouTube Shorts et Instagram Reels.
          </p>

          {/* Buttons */}
          <div className="flex gap-3 flex-wrap mb-16 justify-center">
            <Button asChild className="bg-foreground text-background hover:bg-transparent hover:text-foreground hover:border-foreground border border-transparent transition-all duration-300 hover:scale-105 hover:shadow-lg">
              <Link href="/auth/signin">
                <span className="font-mono lowercase">get started</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Video Demo */}
          <div className="max-w-4xl mx-auto">
            <div className="aspect-video bg-card border border-border flex items-center justify-center">
              <div className="w-16 h-16 bg-background border border-border flex items-center justify-center cursor-pointer hover:bg-card transition-all duration-300 hover:scale-110 hover:border-foreground">
                <Play className="w-6 h-6 text-foreground ml-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-8 border-t border-border" id="features" style={{ padding: '5rem 2rem' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Features</p>
            <h2 className="text-3xl md:text-4xl font-normal tracking-tight mb-4">Agent AI qui automatise vos workflows vidéo</h2>
            <p className="text-muted-foreground">Outils IA avancés pour faciliter et automatiser complètement votre processus de création de contenu</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {[
              { num: "01", title: "Agent IA Intelligent", desc: "Agent autonome qui orchestre vos workflows de création vidéo de bout en bout." },
              { num: "02", title: "Automation Complète", desc: "Automatise l'ensemble du processus : génération, optimisation, publication." },
              { num: "03", title: "Workflow Orchestration", desc: "Gestion intelligente des étapes : DALL-E 3 → VEO3 → distribution multiplateforme." },
              { num: "04", title: "Décisions Autonomes", desc: "L'agent prend des décisions intelligentes basées sur vos objectifs et données." },
              { num: "05", title: "Pipeline Intégré", desc: "Un seul agent gère TikTok, Instagram Reels, YouTube Shorts simultanément." },
              { num: "06", title: "Apprentissage Continu", desc: "L'agent s'améliore en analysant les performances de vos contenus." }
            ].map((feature) => (
              <div key={feature.num} className="bg-background p-8 hover:bg-card transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                <div className="font-mono text-2xl mb-4 text-foreground">{feature.num}</div>
                <h3 className="text-lg font-mono mb-3 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-8 bg-card border-y border-border" style={{ padding: '5rem 2rem' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatsCounter value="10M+" label="videos created" />
          <StatsCounter value="500K+" label="active users" />
          <StatsCounter value="2B+" label="total views" />
          <StatsCounter value="95%" label="success rate" />
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Testimonials Section */}
      <section className="py-20 px-8 bg-card border-t border-border" id="testimonials" style={{ padding: '5rem 2rem' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-normal tracking-tight mb-4">Ce que disent nos utilisateurs</h2>
            <p className="text-muted-foreground">Rejoignez plus de 500 000 créateurs qui utilisent l'agent AI VidGenie</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                content: "L'agent AI VidGenie a révolutionné ma stratégie de contenu. Il automatise complètement mon workflow vidéo de A à Z.",
                author: "sophie.chen",
                role: "@fashion_influencer",
                avatar: "SC"
              },
              {
                content: "L'agent comprend parfaitement ma marque et orchestre intelligent mes workflows. Tout se fait automatiquement.", 
                author: "marc.dubois",
                role: "@business_coach",
                avatar: "MD"
              },
              {
                content: "L'agent AI a augmenté mes vues de 300%. L'automatisation des workflows est impressionnante.",
                author: "anna.lopez", 
                role: "@fitness_creator",
                avatar: "AL"
              }
            ].map((testimonial) => (
              <div key={testimonial.author} className="bg-background p-8 border border-border transition-all duration-300 hover:bg-card">
                <div className="text-muted-foreground font-mono text-xs mb-4">
                  [★★★★★]
                </div>
                <p className="text-sm text-foreground mb-6 font-mono leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-card border border-border flex items-center justify-center text-muted-foreground font-mono text-xs">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-mono text-foreground">{testimonial.author}</div>
                    <div className="text-xs font-mono text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-8 border-t border-border" style={{ padding: '5rem 2rem', background: 'linear-gradient(180deg, #111111 0%, #000000 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-normal tracking-tight mb-6">
            Ready to revolutionize your content?
          </h2>
          <p className="text-muted-foreground font-mono mb-8 lowercase">
            join thousands of creators using vidgenie to dominate social media.
          </p>
          <Button asChild size="lg" className="bg-foreground text-background hover:bg-transparent hover:text-foreground hover:border-foreground border border-transparent transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <Link href="/auth/signin">
              <span className="font-mono lowercase">start now - it's free →</span>
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border px-8" style={{ padding: '3rem 2rem 2rem' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-8">
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-foreground mb-4">VIDGENIE</h3>
              <p className="text-muted-foreground text-sm font-mono">
                agent ai intelligent qui automatise les workflows de création vidéo.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-foreground mb-4">PRODUCT</h3>
              <ul className="space-y-1">
                {["features", "pricing", "api", "roadmap"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm font-mono lowercase text-muted-foreground hover:text-foreground transition-colors block py-1">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-foreground mb-4">RESOURCES</h3>
              <ul className="space-y-1">
                {["blog", "tutorials", "templates", "support"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm font-mono lowercase text-muted-foreground hover:text-foreground transition-colors block py-1">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-foreground mb-4">COMPANY</h3>
              <ul className="space-y-1">
                {["about", "careers", "contact", "press"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm font-mono lowercase text-muted-foreground hover:text-foreground transition-colors block py-1">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center">
            <p className="text-xs font-mono text-muted-foreground">
              © 2025 vidgenie. all rights reserved. | privacy | terms | cookies
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}