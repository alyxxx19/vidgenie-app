'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  ArrowLeft 
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';

export default function BillingPage() {
  const { user, isLoading } = useAuth();
  const { data: subscription, refetch: refetchSubscription } = api.stripe.getSubscription.useQuery();
  const { data: paymentHistory } = api.stripe.getPaymentHistory.useQuery({ limit: 10 });
  const createPortal = api.stripe.createPortalSession.useMutation();
  const cancelSubscription = api.stripe.cancelSubscription.useMutation();
  const reactivateSubscription = api.stripe.reactivateSubscription.useMutation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    redirect('/auth/signin');
  }

  const handlePortalAccess = async () => {
    try {
      const { url } = await createPortal.mutateAsync({
        returnUrl: `${window.location.origin}/account/billing`,
      });
      window.location.href = url;
    } catch (error) {
      toast.error('Erreur lors de l\'accès au portail client');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription.mutateAsync();
      await refetchSubscription();
      toast.success('Abonnement programmé pour annulation');
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      await reactivateSubscription.mutateAsync();
      await refetchSubscription();
      toast.success('Abonnement réactivé');
    } catch (error) {
      toast.error('Erreur lors de la réactivation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Impayé</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Annulé</Badge>;
      case 'incomplete':
        return <Badge className="bg-orange-100 text-orange-800">Incomplet</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
            </Button>
            <h1 className="font-mono text-lg">Facturation</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CreditCard className="w-5 h-5" />
              Abonnement actuel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg capitalize">{subscription.planName}</h3>
                    <p className="text-muted-foreground text-sm">
                      Plan {subscription.planName}
                    </p>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Prochaine facturation</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription.currentPeriodEnd.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  
                  {subscription.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Annulation programmée</p>
                        <p className="text-sm text-muted-foreground">
                          Se termine le {subscription.currentPeriodEnd.toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handlePortalAccess}
                    disabled={createPortal.isPending}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Gérer l'abonnement
                  </Button>
                  
                  {subscription.cancelAtPeriodEnd ? (
                    <Button 
                      variant="outline"
                      onClick={handleReactivateSubscription}
                      disabled={reactivateSubscription.isPending}
                    >
                      Réactiver l'abonnement
                    </Button>
                  ) : (
                    <Button 
                      variant="destructive"
                      onClick={handleCancelSubscription}
                      disabled={cancelSubscription.isPending}
                    >
                      Annuler l'abonnement
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Aucun abonnement actif</p>
                <Button asChild>
                  <Link href="/pricing">
                    Voir les plans
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" />
              Historique des paiements
            </CardTitle>
            <CardDescription>
              Vos dernières transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentHistory && paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium">{payment.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.createdAt.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {(payment.amount / 100).toFixed(2)}€
                      </p>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  onClick={handlePortalAccess}
                  className="w-full mt-4"
                >
                  Voir toutes les factures
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucun paiement trouvé
              </p>
            )}
          </CardContent>
        </Card>

        {/* Plan Upgrade */}
        {(!subscription || subscription.planName === 'free') && (
          <Card>
            <CardHeader>
              <CardTitle>Passez au niveau supérieur</CardTitle>
              <CardDescription>
                Débloquez plus de fonctionnalités avec un plan payant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/pricing">
                  Découvrir les plans payants
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}