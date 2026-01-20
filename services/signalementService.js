const supabase = require('../config/supabase');
const notificationService = require('./notificationService');

class SignalementService {
  async create({ infrastructureId, type, description, photos = [], signalePar }) {
    const { data, error } = await supabase
      .from('signalements')
      .insert({
        infrastructure_id: infrastructureId,
        type,
        description,
        photos,
        signale_par: signalePar,
        statut: 'nouveau',
      })
      .select('*, infrastructure:infrastructures(*), signale_par:users!signale_par(*), traite_par:users!traite_par(*)')
      .single();

    if (error) {
      throw error;
    }

    // Push + notification Firestore (admin/super_admin/agent_communal)
    try {
      const infraName = data?.infrastructure?.nom || 'Infrastructure'
      await notificationService.notify({
        type: 'signalement',
        title: `Nouveau signalement`,
        message: `${infraName} • ${type}`,
        href: `/dashboard/signalements`,
        targetRoles: ['super_admin', 'admin', 'agent_communal'],
      })
    } catch (e) {
      console.warn('⚠️ Notification push signalement échouée:', e.message)
    }

    return data;
  }

  async findAll(filters = {}, pagination = {}) {
    let query = supabase
      .from('signalements')
      .select('*, infrastructure:infrastructures(*), signale_par:users!signale_par(*), traite_par:users!traite_par(*)', { count: 'exact' });

    if (filters.statut) {
      query = query.eq('statut', filters.statut);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (pagination.page && pagination.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return { data, count };
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from('signalements')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, infrastructure:infrastructures(*), signale_par:users!signale_par(*), traite_par:users!traite_par(*)')
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // Récupérer les signalements traités par un utilisateur
  async findByHandler(handlerId) {
    const { data, error } = await supabase
      .from('signalements')
      .select('*, infrastructure:infrastructures(*), signale_par:users!signale_par(*), traite_par:users!traite_par(*)')
      .eq('traite_par', handlerId)
      .order('traite_le', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  // Récupérer les signalements assignés à un agent (nouveau et en_cours)
  async findAssigned(agentId) {
    const { data, error } = await supabase
      .from('signalements')
      .select('*, infrastructure:infrastructures(*), signale_par:users!signale_par(*), traite_par:users!traite_par(*)')
      .eq('traite_par', agentId)
      .in('statut', ['nouveau', 'en_cours'])
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  // Récupérer un signalement par ID
  async findById(id) {
    const { data, error } = await supabase
      .from('signalements')
      .select('*, infrastructure:infrastructures(*), signale_par:users!signale_par(*), traite_par:users!traite_par(*)')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}

module.exports = new SignalementService();

