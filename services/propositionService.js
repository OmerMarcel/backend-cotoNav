const supabase = require('../config/supabase');
const notificationService = require('./notificationService');

class PropositionService {
  // Transformer les données Supabase au format attendu par Flutter
  transformToFlutterFormat(proposition) {
    if (!proposition) return null;
    
    const localisation = proposition.localisation || {};
    const coordinates = localisation.coordinates || [];
    const photos = proposition.photos || proposition.images || [];
    const horaires = proposition.horaires || proposition.openingHours || {};
    const equipements = proposition.equipements || proposition.equipments || [];
    
    return {
      id: proposition.id,
      userId: proposition.propose_par?.id || proposition.propose_par || '',
      name: proposition.nom || '',
      description: proposition.description || '',
      category: proposition.type || '',
      latitude: coordinates[1] || 0,
      longitude: coordinates[0] || 0,
      address: localisation.adresse || localisation.address || '',
      photos,
      images: photos,
      openingHours: horaires,
      horaires,
      equipements,
      phone: proposition.contact?.telephone || null,
      website: proposition.contact?.website || null,
      createdAt: proposition.created_at || new Date().toISOString(),
      updatedAt: proposition.updated_at || proposition.created_at || new Date().toISOString(),
      // Garder aussi les champs originaux pour compatibilité
      ...proposition
    };
  }
  async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from('propositions')
        .select('*, propose_par:users!propose_par(*), modere_par:users!modere_par(*)', { count: 'exact' });

      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }

      if (pagination.page && pagination.limit) {
        const from = (pagination.page - 1) * pagination.limit;
        const to = from + pagination.limit - 1;
        query = query.range(from, to);
      }

      query = query.order('created_at', { ascending: false });

      let data, error, count;
      try {
        const result = await query;
        data = result.data;
        error = result.error;
        count = result.count;
      } catch (fetchError) {
        console.error('❌ Erreur de connexion Supabase dans findAll:', fetchError.message);
        throw new Error(`Erreur de connexion à Supabase: ${fetchError.message}`);
      }

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      // Transformer les données pour Flutter
      const transformedData = (data || []).map(prop => this.transformToFlutterFormat(prop));

      return { data: transformedData, count: transformedData.length };
    } catch (error) {
      console.error('❌ Erreur dans propositionService.findAll:', error.message);
      throw error;
    }
  }

  async findById(id) {
    try {
      let data, error;
      try {
        const result = await supabase
          .from('propositions')
          .select('*, propose_par:users!propose_par(*), modere_par:users!modere_par(*)')
          .eq('id', id)
          .single();
        data = result.data;
        error = result.error;
      } catch (fetchError) {
        console.error('❌ Erreur de connexion Supabase dans findById:', fetchError.message);
        throw new Error(`Erreur de connexion à Supabase: ${fetchError.message}`);
      }

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      return this.transformToFlutterFormat(data);
    } catch (error) {
      console.error('❌ Erreur dans propositionService.findById:', error.message);
      throw error;
    }
  }

  // Récupérer les données brutes (sans transformation) pour l'approbation
  async findByIdRaw(id) {
    try {
      let data, error;
      try {
        const result = await supabase
          .from('propositions')
          .select('*, propose_par:users!propose_par(*), modere_par:users!modere_par(*)')
          .eq('id', id)
          .single();
        data = result.data;
        error = result.error;
      } catch (fetchError) {
        console.error('❌ Erreur de connexion Supabase dans findByIdRaw:', fetchError.message);
        throw new Error(`Erreur de connexion à Supabase: ${fetchError.message}`);
      }

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur dans propositionService.findByIdRaw:', error.message);
      throw error;
    }
  }

  async create(propositionData) {
    try {
      console.log('📤 Insertion dans Supabase - Table: propositions');
      console.log('📋 Données à insérer:', JSON.stringify(propositionData, null, 2));
      
      let data, error;
      try {
        const result = await supabase
          .from('propositions')
          .insert(propositionData)
          .select('*, propose_par:users!propose_par(*), modere_par:users!modere_par(*)')
          .single();
        data = result.data;
        error = result.error;
      } catch (fetchError) {
        console.error('❌ Erreur de connexion Supabase dans create:', fetchError.message);
        throw new Error(`Erreur de connexion à Supabase: ${fetchError.message}`);
      }

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        console.error('❌ Détails de l\'erreur:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Proposition insérée avec succès dans Supabase');
      console.log('🆔 ID de la proposition:', data?.id);
      console.log('👤 ID utilisateur (propose_par):', data?.propose_par);

      // Push + notification Firestore (admin/super_admin/agent_communal)
      try {
        await notificationService.notify({
          type: 'proposition',
          title: `Nouvelle proposition d'infrastructure`,
          message: `${data?.nom || 'Infrastructure'} • ${data?.type || ''}`.trim(),
          href: `/dashboard/propositions`,
          targetRoles: ['super_admin', 'admin', 'agent_communal'],
        })
      } catch (e) {
        console.warn('⚠️ Notification push proposition échouée:', e.message)
      }

      return this.transformToFlutterFormat(data);
    } catch (error) {
      console.error('❌ Erreur dans propositionService.create:', error.message);
      throw error;
    }
  }

  async findByUserId(userId) {
    try {
      let data, error;
      try {
        const result = await supabase
          .from('propositions')
          .select('*, propose_par:users!propose_par(*), modere_par:users!modere_par(*)')
          .eq('propose_par', userId)
          .order('created_at', { ascending: false });
        data = result.data;
        error = result.error;
      } catch (fetchError) {
        console.error('❌ Erreur de connexion Supabase dans findByUserId:', fetchError.message);
        throw new Error(`Erreur de connexion à Supabase: ${fetchError.message}`);
      }

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      // Transformer les données pour Flutter
      const transformedData = (data || []).map(prop => this.transformToFlutterFormat(prop));

      return { data: transformedData };
    } catch (error) {
      console.error('❌ Erreur dans propositionService.findByUserId:', error.message);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      let data, error;
      try {
        const result = await supabase
          .from('propositions')
          .update(updates)
          .eq('id', id)
          .select('*, propose_par:users!propose_par(*), modere_par:users!modere_par(*)')
          .single();
        data = result.data;
        error = result.error;
      } catch (fetchError) {
        console.error('❌ Erreur de connexion Supabase dans update:', fetchError.message);
        throw new Error(`Erreur de connexion à Supabase: ${fetchError.message}`);
      }

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      return this.transformToFlutterFormat(data);
    } catch (error) {
      console.error('❌ Erreur dans propositionService.update:', error.message);
      throw error;
    }
  }

  // Récupérer les propositions validées par un utilisateur
  async findByValidator(validatorId) {
    try {
      const { data, error } = await supabase
        .from('propositions')
        .select('*, propose_par:users!propose_par(*), modere_par:users!modere_par(*)')
        .eq('modere_par', validatorId)
        .in('statut', ['approuve', 'rejete'])
        .order('modere_le', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(prop => this.transformToFlutterFormat(prop)).filter(Boolean);
    } catch (error) {
      console.error('❌ Erreur dans propositionService.findByValidator:', error);
      throw error;
    }
  }
}

module.exports = new PropositionService();

