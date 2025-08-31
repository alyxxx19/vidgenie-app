import { supabase } from '../client';
import { supabaseAdmin } from '../server';
import type { Tables, TablesInsert, TablesUpdate } from '../types';

type _User = Tables<'users'>;
type UserInsert = TablesInsert<'users'>;
type UserUpdate = TablesUpdate<'users'>;

export class UsersService {
  // Get current user profile
  static async getCurrentProfile() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        organizations!users_current_organization_id_fkey (
          id,
          name,
          slug,
          plan_id,
          credits_balance
        )
      `)
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (error) throw error;
    return data;
  }

  // Update user profile
  static async updateProfile(updates: UserUpdate) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Switch current organization
  static async switchOrganization(organizationId: string) {
    // Verify user is member of this organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('organization_id', organizationId)
      .single();

    if (membershipError || !membership) {
      throw new Error('Not a member of this organization');
    }

    const { data, error } = await supabase
      .from('users')
      .update({ current_organization_id: organizationId })
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get user's organizations
  static async getUserOrganizations() {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organizations (
          id,
          name,
          slug,
          plan_id,
          credits_balance,
          created_at
        )
      `)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Server-side: Get user by ID (admin only)
  static async getUserById(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  // Server-side: Create user profile (used by auth hooks)
  static async createUserProfile(userData: UserInsert) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get user statistics
  static async getUserStats(organizationId?: string) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const orgFilter = organizationId ? { organization_id: organizationId } : {};

    // Get parallel stats
    const [
      { count: assetsCount },
      { count: jobsCount },
      { count: postsCount },
      { data: creditBalance }
    ] = await Promise.all([
      supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .match(orgFilter),
      
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .match(orgFilter),
      
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .match(orgFilter),

      supabase
        .from('credit_ledger')
        .select('amount')
        .eq('user_id', userId)
        .match(orgFilter)
    ]);

    const totalCreditsUsed = creditBalance?.reduce((sum, entry) => {
      return sum + (entry.amount < 0 ? Math.abs(entry.amount) : 0);
    }, 0) || 0;

    return {
      assetsCount: assetsCount || 0,
      jobsCount: jobsCount || 0,
      postsCount: postsCount || 0,
      creditsUsed: totalCreditsUsed,
    };
  }
}