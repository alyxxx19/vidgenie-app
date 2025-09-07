/**
 * Configuration d'authentification simple
 * Stub pour éviter les erreurs de build
 */

export const authOptions = {
  // Configuration d'authentification placeholder
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
  providers: [],
  callbacks: {
    async jwt({ token }: { token: any }) {
      return token;
    },
    async session({ session }: { session: any }) {
      return session;
    },
  },
};

// Stub de getServerSession pour éviter les erreurs
export const getServerSession = async (): Promise<{ user?: { id?: string; email?: string } } | null> => {
  return null; // Pas de session en mode stub
};

export default authOptions;