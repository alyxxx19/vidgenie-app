import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Play, Sparkles, Wand2, Calendar, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const features = [
    {
      icon: Wand2,
      title: 'Génération IA avancée',
      description: 'Créez des vidéos uniques avec GPT-4, MidJourney et Sora.',
    },
    {
      icon: Calendar,
      title: 'Planification intelligente',
      description: 'Programmez vos publications aux meilleurs moments.',
    },
    {
      icon: BarChart3,
      title: 'Analytics poussées',
      description: 'Suivez vos performances en temps réel.',
    },
  ];

  return (
    <div className="min-h-screen bg-cyber-gradient relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="relative z-20 max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card/80 backdrop-blur-sm border border-secondary mb-12 animate-fade-in-up">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-white uppercase tracking-wide">
              TECHNOLOGIE IA DE POINTE
            </span>
          </div>

          <h1 className="font-[var(--font-poppins)] text-6xl md:text-8xl lg:text-9xl font-bold mb-8 tracking-tight animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <span className="text-white">CRÉEZ DU</span>
            <br />
            <span className="bg-accent-gradient bg-clip-text text-transparent animate-glow-pulse">
              CONTENU VIRAL
            </span>
            <br />
            <span className="text-white">INSTANTANÉMENT</span>
          </h1>

          <p className="text-xl md:text-2xl text-cyber-textMuted max-w-4xl mx-auto mb-16 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <span className="text-primary font-semibold">DOMINEZ</span> les réseaux sociaux avec des vidéos générées par IA ultra-performantes.
            <br />
            TikTok, YouTube Shorts, Instagram Reels - <span className="text-accent font-semibold">UNE PLATEFORME, TOUS LES RÉSEAUX</span> 
            grâce à l'IA. Planifiez, créez et publiez automatiquement.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-10 py-4 h-14 rounded-xl shadow-glow hover:shadow-glow-strong transform hover:scale-105 transition-all duration-300">
              <Link href="/auth/signin">
                <Sparkles className="w-5 h-5 mr-3" />
                COMMENCER MAINTENANT
                <ArrowRight className="w-5 h-5 ml-3" />
              </Link>
            </Button>
            
            <Button variant="outline" className="border-2 border-secondary/50 text-white hover:bg-secondary/50 hover:border-primary/50 font-semibold text-lg px-8 py-4 h-14 rounded-xl backdrop-blur-sm transition-all duration-300">
              <Play className="w-5 h-5 mr-3" />
              VOIR LA DÉMO
            </Button>
          </div>

          <div className="flex flex-col items-center gap-6 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <p className="text-cyber-textMuted text-sm font-medium uppercase tracking-wide">
              Rejoint par <span className="text-primary font-bold">50,000+</span> créateurs d'élite
            </p>
            <div className="flex items-center gap-12 opacity-80">
              <div className="text-2xl font-[var(--font-poppins)] font-bold text-white hover:text-primary transition-colors cursor-default">TIKTOK</div>
              <div className="text-2xl font-[var(--font-poppins)] font-bold text-white hover:text-primary transition-colors cursor-default">YOUTUBE</div>
              <div className="text-2xl font-[var(--font-poppins)] font-bold text-white hover:text-primary transition-colors cursor-default">INSTAGRAM</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-card/30 backdrop-blur-sm border-t border-secondary relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="font-[var(--font-poppins)] text-5xl md:text-6xl font-bold mb-8 text-white">
              ARSENAL COMPLET
              <br />
              <span className="bg-accent-gradient bg-clip-text text-transparent">
                D'OUTILS IA
              </span>
            </h2>
            <p className="text-xl text-cyber-textMuted max-w-4xl mx-auto leading-relaxed">
              Dominez chaque aspect de votre stratégie de contenu avec notre technologie de pointe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-card/80 backdrop-blur-sm border-secondary hover:border-primary/50 hover:shadow-glow transition-all duration-500 group animate-fade-in-up" style={{ animationDelay: `${index * 0.2}s` }}>
                  <CardContent className="p-10">
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-primary/30 transition-colors duration-300 animate-glow-pulse">
                      <Icon className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-[var(--font-poppins)] font-semibold mb-6 text-white group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-cyber-textMuted text-lg leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-16">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-4 h-auto">
                <Link href="/auth/signin">
                  Commencer maintenant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-4 h-auto">
                <Link href="/auth/dev-login">
                  Accès développeur
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
