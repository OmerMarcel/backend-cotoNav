const supabase = require('../config/supabase');

class ZoneService {
  /**
   * Crée une nouvelle zone
   */
  async create(zoneData) {
    try {
      const { data, error } = await supabase
        .from('zones')
        .insert({
          nom: zoneData.nom,
          type: zoneData.type,
          parent_id: zoneData.parent_id || null,
          limites: zoneData.limites || null,
          actif: zoneData.actif !== undefined ? zoneData.actif : true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur dans zoneService.create:', error);
      throw error;
    }
  }

  /**
   * Récupère une zone par ID
   */
  async findById(id) {
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*, parent:parent_id(*), children:zones!zones_parent_id_fkey(*)')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur dans zoneService.findById:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les zones
   */
  async findAll(filters = {}) {
    try {
      let query = supabase.from('zones').select('*, parent:parent_id(nom, type)');

      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.parent_id !== undefined) {
        if (filters.parent_id === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', filters.parent_id);
        }
      }
      if (filters.actif !== undefined) {
        query = query.eq('actif', filters.actif);
      }
      if (filters.nom) {
        query = query.ilike('nom', `%${filters.nom}%`);
      }

      query = query.order('nom', { ascending: true });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erreur dans zoneService.findAll:', error);
      throw error;
    }
  }

  /**
   * Met à jour une zone
   */
  async update(id, updates) {
    try {
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur dans zoneService.update:', error);
      throw error;
    }
  }

  /**
   * Supprime une zone (soft delete en désactivant)
   */
  async delete(id) {
    try {
      return await this.update(id, { actif: false });
    } catch (error) {
      console.error('Erreur dans zoneService.delete:', error);
      throw error;
    }
  }

  /**
   * Récupère les utilisateurs assignés à une zone
   */
  async getZoneUsers(zoneId, role = null) {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .eq('zone_id', zoneId)
        .eq('actif', true);

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erreur dans zoneService.getZoneUsers:', error);
      throw error;
    }
  }

  /**
   * Détermine dans quelle zone se trouve un point géographique
   */
  async findZoneByCoordinates(longitude, latitude) {
    try {
      // Cette fonction nécessiterait PostGIS pour des calculs géospatiaux avancés
      // Pour l'instant, on peut utiliser le champ 'quartier' ou 'commune' de la localisation
      // Implémentation simplifiée - à améliorer avec PostGIS
      
      // Pour l'instant, retourner null
      // Une vraie implémentation utiliserait ST_Contains avec les limites GeoJSON
      return null;
    } catch (error) {
      console.error('Erreur dans zoneService.findZoneByCoordinates:', error);
      return null;
    }
  }

  /**
   * Vérifie si un utilisateur a accès à une zone
   */
  async hasAccess(userId, zoneId) {
    try {
      const user = await supabase
        .from('users')
        .select('role, zone_id')
        .eq('id', userId)
        .single();

      if (!user.data) {
        return false;
      }

      // Super admin a accès à toutes les zones
      if (user.data.role === 'super_admin') {
        return true;
      }

      // Admin et Agent ont accès uniquement à leur zone
      return user.data.zone_id === zoneId;
    } catch (error) {
      console.error('Erreur dans zoneService.hasAccess:', error);
      return false;
    }
  }
}

module.exports = new ZoneService();

