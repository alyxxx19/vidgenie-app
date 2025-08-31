'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

const PricingCard = ({ plan, index, billingCycle }: { 
  plan: any; 
  index: number; 
  billingCycle: 'monthly' | 'yearly' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), index * 150);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div 
      ref={cardRef}
      className={`relative transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {/* Card Container */}
      <div className={`
        relative p-8 transition-all duration-300 hover:scale-[1.02] cursor-pointer
        ${plan.featured 
          ? 'bg-foreground text-background border-2 border-foreground' 
          : 'bg-background text-foreground border border-border hover:border-foreground/30'
        }
      `}>
        
        {/* Popular Badge */}
        {plan.featured && (
          <div className="absolute -top-px left-0 right-0 bg-background text-foreground py-1 text-center">
            <span className="text-xs font-mono uppercase tracking-wider">
              MOST POPULAR
            </span>
          </div>
        )}

        {/* Plan Content */}
        <div className={plan.featured ? 'mt-6' : ''}>
          {/* Plan Name */}
          <h3 className={`text-lg font-mono uppercase tracking-wider mb-6 ${
            plan.featured ? 'text-background' : 'text-foreground'
          }`}>
            {plan.name}
          </h3>

          {/* Price */}
          <div className="mb-6">
            <div className={`text-4xl font-mono tracking-tight ${
              plan.featured ? 'text-background' : 'text-foreground'
            }`}>
              {plan.price}
              <span className={`text-sm ${
                plan.featured ? 'text-background/70' : 'text-muted-foreground'
              }`}>
                /{billingCycle === 'monthly' ? 'month' : 'year'}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className={`text-sm mb-8 ${
            plan.featured ? 'text-background/80' : 'text-muted-foreground'
          }`}>
            {plan.description}
          </p>

          {/* Features */}
          <ul className="space-y-4 mb-8">
            {plan.features.map((feature: string, idx: number) => (
              <li 
                key={feature}
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  isVisible ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
                } ${plan.featured ? 'text-background/90' : 'text-muted-foreground'}`}
                style={{ transitionDelay: `${300 + (idx * 100)}ms` }}
              >
                <div className={`flex items-center justify-center w-4 h-4 ${
                  plan.featured ? 'text-background' : 'text-foreground'
                }`}>
                  <Check className="w-3 h-3" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <Button 
            asChild 
            className={`w-full transition-all duration-300 font-mono lowercase hover:scale-105 ${
              plan.featured
                ? 'bg-background text-foreground hover:bg-background/90 border border-background'
                : 'bg-foreground text-background hover:bg-foreground/90 border border-foreground'
            }`}
          >
            <Link href="/auth/signin" className="flex items-center justify-center">
              {plan.cta}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: "Starter",
      price: billingCycle === 'monthly' ? "€9" : "€72",
      description: "Perfect for getting started",
      features: [
        "30 videos/month",
        "Basic templates", 
        "2 platforms",
        "Basic analytics",
        "Email support"
      ],
      cta: "get started",
      featured: false
    },
    {
      name: "Professional", 
      price: billingCycle === 'monthly' ? "€29" : "€232",
      description: "For serious creators",
      features: [
        "150 videos/month",
        "All templates",
        "All platforms", 
        "Advanced analytics",
        "Custom AI models",
        "Priority support"
      ],
      cta: "get started",
      featured: true
    },
    {
      name: "Enterprise",
      price: billingCycle === 'monthly' ? "€99" : "€792", 
      description: "For teams and agencies",
      features: [
        "Unlimited videos",
        "Custom templates",
        "API access",
        "Team management", 
        "Dedicated training",
        "24/7 support"
      ],
      cta: "contact us",
      featured: false
    }
  ];

  return (
    <section className="py-20 px-8 bg-background" id="pricing">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-6">
            PRICING
          </p>
          <h2 className="text-4xl md:text-5xl font-normal tracking-tight mb-6">
            Choose your plan
          </h2>
          <p className="text-muted-foreground mb-12">
            Flexible options for creators at every level
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-0 bg-card border border-border mb-12">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 text-sm font-mono lowercase transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-3 text-sm font-mono lowercase transition-all duration-300 relative ${
                billingCycle === 'yearly'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              yearly
              <span className="absolute -top-2 -right-2 bg-foreground text-background text-xs px-2 py-1 font-mono">
                save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard 
              key={plan.name} 
              plan={plan} 
              index={index} 
              billingCycle={billingCycle} 
            />
          ))}
        </div>
      </div>
    </section>
  );
}