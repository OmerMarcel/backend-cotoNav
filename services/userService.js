const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const notificationService = require('./notificationService');

class UserService {
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }

  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  async create(userData) {
    const hashedPassword = userData.password 
      ? await bcrypt.hash(userData.password, 10)
      : null;

    const insertData = {
      nom: userData.nom,
      prenom: userData.prenom,
      email: userData.email.toLowerCase(),
      telephone: userData.telephone,
      password: hashedPassword,
      auth_provider: userData.authProvider || 'email',
      role: userData.role || 'citoyen',
      avatar: userData.avatar,
      actif: userData.actif !== undefined ? userData.actif : true,
      contributions: userData.contributions || {
        infrastructuresProposees: 0,
        avisLaisses: 0,
        signalements: 0
      }
    };

    // Ajouter zone_id et cree_par si fournis (zone_id peut être null pour Super Admin)
    if (userData.zone_id !== undefined) {
      insertData.zone_id = userData.zone_id; // Peut être null
    }
    // cree_par peut être null, donc on vérifie avec !== undefined
    if (userData.cree_par !== undefined) {
      insertData.cree_par = userData.cree_par || null;
    }

    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Push + notification Firestore (admin/super_admin uniquement)
    try {
      await notificationService.notify({
        type: 'utilisateur',
        title: `Nouvel utilisateur`,
        message: `${data?.prenom || ''} ${data?.nom || ''}`.trim() || data?.email || 'Un utilisateur a été créé',
        href: `/dashboard/utilisateurs`,
        targetRoles: ['super_admin', 'admin'],
      })
    } catch (e) {
      console.warn('⚠️ Notification push utilisateur échouée:', e.message)
    }

    return data;
  }

  async update(id, updates) {
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // Ajouter updated_at si ce n'est pas déjà présent
    if (!updates.updated_at) {
      updates.updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // Trouver l'utilisateur par email pour obtenir son UID Firebase
  async findByEmailForFirebaseSync(email) {
    const user = await this.findByEmail(email);
    return user;
  }

  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async delete(id) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async findAll(filters = {}, pagination = {}) {
    let query = supabase.from('users').select('*', { count: 'exact' });

    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.actif !== undefined) {
      query = query.eq('actif', filters.actif);
    }
    if (filters.zone_id !== undefined) {
      if (filters.zone_id === null) {
        query = query.is('zone_id', null);
      } else {
        query = query.eq('zone_id', filters.zone_id);
      }
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
}

module.exports = new UserService();

