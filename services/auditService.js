const supabase = require('../config/supabase');

class AuditService {
  /**
   * Enregistre une action dans les logs d'audit
   */
  async log(logData) {
    try {
      // Vérifier si la table existe en tentant une requête simple
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: logData.user_id || null,
          action: logData.action,
          resource_type: logData.resource_type,
          resource_id: logData.resource_id || null,
          details: logData.details || {},
          ip_address: logData.ip_address || null,
          user_agent: logData.user_agent || null,
          zone_id: logData.zone_id || null,
        })
        .select()
        .single();

      if (error) {
        // Si l'erreur indique que la table n'existe pas, loguer un avertissement
        if (error.code === 'PGRST205' || error.message?.includes('audit_logs')) {
          console.warn('⚠️  Table audit_logs non trouvée dans Supabase. Exécutez le script create_audit_logs.sql pour la créer.');
          console.warn('   L\'action a été effectuée mais n\'a pas été loguée.');
          return null; // Ne pas bloquer l'opération principale
        }
        
        // Pour les autres erreurs, logger mais ne pas bloquer
        console.error('Erreur lors de l\'enregistrement de l\'audit:', error.message || error);
        return null;
      }

      return data;
    } catch (error) {
      // Catch toutes les erreurs pour ne jamais bloquer l'opération principale
      console.warn('Erreur dans auditService.log (non bloquant):', error.message || error);
      return null;
    }
  }

  /**
   * Récupère les logs d'audit avec filtres
   */
  async getLogs(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, users:user_id(id, nom, prenom, email, role)', { count: 'exact' });

      // Filtres
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters.resource_id) {
        query = query.eq('resource_id', filters.resource_id);
      }
      if (filters.zone_id) {
        query = query.eq('zone_id', filters.zone_id);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Pagination
      if (pagination.page && pagination.limit) {
        const from = (pagination.page - 1) * pagination.limit;
        const to = from + pagination.limit - 1;
        query = query.range(from, to);
      }

      // Tri
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return { data, count };
    } catch (error) {
      console.error('Erreur dans auditService.getLogs:', error);
      throw error;
    }
  }

  /**
   * Récupère les logs pour une zone spécifique
   */
  async getZoneLogs(zoneId, filters = {}, pagination = {}) {
    return this.getLogs({ ...filters, zone_id: zoneId }, pagination);
  }

  /**
   * Récupère les logs d'un utilisateur spécifique
   */
  async getUserLogs(userId, filters = {}, pagination = {}) {
    return this.getLogs({ ...filters, user_id: userId }, pagination);
  }

  /**
   * Récupère les logs pour une ressource spécifique
   */
  async getResourceLogs(resourceType, resourceId, pagination = {}) {
    return this.getLogs(
      { resource_type: resourceType, resource_id: resourceId },
      pagination
    );
  }
}

module.exports = new AuditService();

