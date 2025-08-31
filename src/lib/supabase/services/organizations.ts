import { supabase } from '../client';
import { supabaseAdmin } from '../server';
import type { Database, Tables, TablesInsert, TablesUpdate } from '../types';

type Organization = Tables<'organizations'>;
type OrganizationInsert = TablesInsert<'organizations'>;
type OrganizationUpdate = TablesUpdate<'organizations'>;
type OrganizationMember = Tables<'organization_members'>;

export class OrganizationsService {
  // Get current organization
  static async getCurrentOrganization() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile.current_organization_id) return null;

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members (
          id,
          role,
          user_id,
          users (
            id,
            name,
            email,
            avatar
          )
        )
      `)
      .eq('id', profile.current_organization_id)
      .single();

    if (error) throw error;
    return data;
  }

  // Create organization
  static async createOrganization(data: Omit<OrganizationInsert, 'owner_id'>) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Check if slug is available
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', data.slug)
      .single();

    if (existing) {
      throw new Error('Organization slug already taken');
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        ...data,
        owner_id: user.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Add user as owner
    await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.user.id,
        role: 'owner',
      });

    // Set as current organization
    await supabase
      .from('users')
      .update({ current_organization_id: organization.id })
      .eq('id', user.user.id);

    return organization;
  }

  // Update organization
  static async updateOrganization(id: string, updates: OrganizationUpdate) {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Invite user to organization
  static async inviteUser(organizationId: string, email: string, role: 'admin' | 'member' | 'viewer' = 'member') {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        throw new Error('User is already a member');
      }

      // Add to organization
      const { data, error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: existingUser.id,
          role,
        })
        .select(`
          *,
          users (
            id,
            name,
            email,
            avatar
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } else {
      // TODO: Send invitation email
      throw new Error('User not found. Invitation emails not yet implemented.');
    }
  }

  // Remove user from organization
  static async removeUser(organizationId: string, userId: string) {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Update user role
  static async updateUserRole(organizationId: string, userId: string, role: 'admin' | 'member' | 'viewer') {
    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select(`
        *,
        users (
          id,
          name,
          email,
          avatar
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Get organization members
  static async getMembers(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        users (
          id,
          name,
          email,
          avatar
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get organization usage stats
  static async getUsageStats(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      { count: totalAssets },
      { count: totalJobs },
      { count: totalPosts },
      { data: creditUsage },
      { data: recentActivity }
    ] = await Promise.all([
      supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString()),

      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString()),

      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString()),

      supabase
        .from('credit_ledger')
        .select('amount, type, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),

      supabase
        .from('usage_events')
        .select('event, created_at, metadata')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    const creditsUsed = creditUsage?.reduce((sum, entry) => {
      return sum + (entry.amount < 0 ? Math.abs(entry.amount) : 0);
    }, 0) || 0;

    const creditsAdded = creditUsage?.reduce((sum, entry) => {
      return sum + (entry.amount > 0 ? entry.amount : 0);
    }, 0) || 0;

    return {
      totalAssets: totalAssets || 0,
      totalJobs: totalJobs || 0,
      totalPosts: totalPosts || 0,
      creditsUsed,
      creditsAdded,
      recentActivity: recentActivity || [],
      creditUsage: creditUsage || [],
    };
  }

  // Deduct credits safely
  static async deductCredits(organizationId: string, amount: number, description: string, jobId?: string) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Call the database function
    const { data, error } = await supabase.rpc('deduct_credits', {
      user_uuid: user.user.id,
      org_uuid: organizationId,
      amount,
      description,
      job_uuid: jobId,
    });

    if (error) throw error;
    if (!data) throw new Error('Insufficient credits');
    
    return data;
  }

  // Add credits
  static async addCredits(organizationId: string, amount: number, type: string, description: string) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('add_credits', {
      user_uuid: user.user.id,
      org_uuid: organizationId,
      amount,
      credit_type: type,
      description,
    });

    if (error) throw error;
  }
}