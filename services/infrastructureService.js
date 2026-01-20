const supabase = require('../config/supabase');
const notificationService = require('./notificationService');

class InfrastructureService {
  // Transformer les données Supabase au format attendu par Flutter
  transformToFlutterFormat(infra) {
    if (!infra) return null;
    
    const localisation = infra.localisation || {};
    const coordinates = localisation.coordinates || [];
    const photos = infra.photos || infra.images || [];
    const horaires = infra.horaires || infra.openingHours || {};
    const equipements = infra.equipements || infra.equipments || [];
    
    // S'assurer que localisation est toujours un objet avec une structure valide
    const safeLocalisation = {
      type: localisation.type || 'Point',
      coordinates: coordinates.length >= 2 ? coordinates : [0, 0],
      adresse: localisation.adresse || localisation.address || '',
      quartier: localisation.quartier || '',
      commune: localisation.commune || ''
    };
    
    return {
      id: infra.id,
      name: infra.nom || '',
      description: infra.description || '',
      category: infra.type || '',
      latitude: coordinates[1] || 0, // longitude, latitude dans GeoJSON
      longitude: coordinates[0] || 0,
      address: safeLocalisation.adresse,
      images: photos,
      photos: photos,
      opening_hours: horaires,
      horaires: horaires,
      equipements,
      phone: infra.contact?.telephone || null,
      website: infra.contact?.website || null,
      rating: parseFloat(infra.note_moyenne) || 0.0,
      review_count: infra.nombre_avis || 0,
      is_accessible: infra.accessibilite?.pmr || false,
      is_active: infra.valide !== false,
      created_at: infra.created_at || new Date().toISOString(),
      updated_at: infra.updated_at || new Date().toISOString(),
      submitted_by: infra.cree_par?.id || infra.cree_par || null,
      is_verified: infra.valide || false,
      // Garder aussi les champs originaux pour compatibilité
      ...infra,
      // Override avec la localisation sécurisée pour s'assurer qu'elle est toujours présente
      localisation: safeLocalisation
    };
  }
  // Calculer la distance entre deux points (formule de Haversine)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance en km
  }

  async findAll(filters = {}, pagination = {}) {
    let query = supabase.from('infrastructures').select('*, cree_par:users!cree_par(*), valide_par:users!valide_par(*)', { count: 'exact' });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.quartier) {
      query = query.eq('localisation->>quartier', filters.quartier);
    }
    if (filters.valide !== undefined) {
      query = query.eq('valide', filters.valide);
    }
    if (filters.etat) {
      query = query.eq('etat', filters.etat);
    }

    // Recherche par texte (nom, description, adresse)
    if (filters.searchQuery) {
      const searchTerm = filters.searchQuery.toLowerCase();
      // Supabase ne supporte pas directement ILIKE sur JSONB, donc on filtre après
      // On récupère toutes les données et on filtre en mémoire
    }

    // Par défaut, ne retourner que les infrastructures validées
    if (filters.valide === undefined) {
      query = query.eq('valide', true);
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
      throw new Error(`Erreur de connexion à Supabase: ${fetchError.message}. Vérifiez votre configuration dans le fichier .env`);
    }

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      throw error;
    }

    // Transformer les données pour Flutter
    let transformedData = (data || []).map(infra => this.transformToFlutterFormat(infra));

    // Recherche par texte (après transformation pour avoir accès aux champs Flutter)
    if (filters.searchQuery) {
      const searchTerm = filters.searchQuery.toLowerCase();
      transformedData = transformedData.filter(infra => {
        const name = (infra.name || '').toLowerCase();
        const description = (infra.description || '').toLowerCase();
        const address = (infra.address || '').toLowerCase();
        const category = (infra.category || '').toLowerCase();
        return name.includes(searchTerm) || 
               description.includes(searchTerm) || 
               address.includes(searchTerm) ||
               category.includes(searchTerm);
      });
    }

    // Filtrer par distance si latitude, longitude et radius sont fournis
    if (pagination.latitude && pagination.longitude && pagination.radius) {
      transformedData = transformedData.filter(infra => {
        const distance = this.calculateDistance(
          pagination.latitude,
          pagination.longitude,
          infra.latitude,
          infra.longitude
        );
        return distance <= (pagination.radius / 1000); // Convertir radius de mètres en km
      });
    }

    return { data: transformedData, count: transformedData.length };
  }

  async findById(id) {
    const { data, error } = await supabase
      .from('infrastructures')
      .select('*, cree_par:users!cree_par(*), valide_par:users!valide_par(*)')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return this.transformToFlutterFormat(data);
  }

  async create(infrastructureData) {
    try {
      // Valider les champs requis
      if (!infrastructureData.nom) {
        throw new Error('Le nom de l\'infrastructure est requis.');
      }
      if (!infrastructureData.type) {
        throw new Error('Le type de l\'infrastructure est requis.');
      }
      if (!infrastructureData.localisation) {
        throw new Error('La localisation de l\'infrastructure est requise.');
      }

      // S'assurer que localisation a le bon format
      const localisation = infrastructureData.localisation;
      if (!localisation.type || localisation.type !== 'Point') {
        localisation.type = 'Point';
      }
      if (!Array.isArray(localisation.coordinates) || localisation.coordinates.length !== 2) {
        throw new Error('Les coordonnées de localisation sont invalides.');
      }

      console.log('📤 Insertion infrastructure dans Supabase:', {
        nom: infrastructureData.nom,
        type: infrastructureData.type,
        cree_par: infrastructureData.creePar
      });

      const { data, error } = await supabase
        .from('infrastructures')
        .insert({
          nom: infrastructureData.nom,
          type: infrastructureData.type,
          description: infrastructureData.description || '',
          localisation: localisation,
          photos: Array.isArray(infrastructureData.photos) ? infrastructureData.photos : (infrastructureData.images || []),
          horaires: infrastructureData.horaires || infrastructureData.openingHours || {},
          equipements: Array.isArray(infrastructureData.equipements) ? infrastructureData.equipements : (infrastructureData.equipments || []),
          accessibilite: infrastructureData.accessibilite || { pmr: false, enfants: false },
          contact: infrastructureData.contact || {},
          etat: infrastructureData.etat || 'bon',
          niveau_frequentation: infrastructureData.niveauFrequentation || 'moyen',
          cree_par: infrastructureData.creePar,
          valide: infrastructureData.valide !== undefined ? infrastructureData.valide : false,
          valide_par: infrastructureData.validePar,
          valide_le: infrastructureData.valideLe
        })
        .select('*, cree_par:users!cree_par(*), valide_par:users!valide_par(*)')
        .single();

      if (error) {
        console.error('❌ Erreur Supabase lors de la création:', error);
        throw new Error(`Erreur lors de la création de l'infrastructure: ${error.message || JSON.stringify(error)}`);
      }

      console.log('✅ Infrastructure créée avec succès:', data?.id);
      return this.transformToFlutterFormat(data);
    } catch (error) {
      console.error('❌ Erreur dans infrastructureService.create:', error);
      throw error;
    }
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from('infrastructures')
      .update(updates)
      .eq('id', id)
      .select('*, cree_par:users!cree_par(*), valide_par:users!valide_par(*)')
      .single();

    if (error) {
      throw error;
    }

    return this.transformToFlutterFormat(data);
  }

  async delete(id) {
    const { error } = await supabase
      .from('infrastructures')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  }

  async validate(id, validatedBy) {
    return this.update(id, {
      valide: true,
      valide_par: validatedBy,
      valide_le: new Date().toISOString()
    });
  }

  async getFavoritesByUser(userId) {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('created_at, infrastructure:infrastructures(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || [])
      .map(entry => this.transformToFlutterFormat(entry.infrastructure))
      .filter(Boolean);
  }

  // Récupère tous les favoris de tous les utilisateurs (pour les admins)
  async getAllFavorites() {
    // Récupérer les favoris avec les infrastructures
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('user_favorites')
      .select('created_at, user_id, infrastructure:infrastructures(*)')
      .order('created_at', { ascending: false });

    if (favoritesError) {
      throw favoritesError;
    }

    if (!favoritesData || favoritesData.length === 0) {
      return [];
    }

    // Récupérer les IDs uniques des utilisateurs
    const userIds = [...new Set(favoritesData.map(f => f.user_id))];
    
    // Récupérer les informations des utilisateurs
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, nom, prenom, email')
      .in('id', userIds);

    if (usersError) {
      console.error('Erreur lors de la récupération des utilisateurs:', usersError);
    }

    // Créer un map pour accéder rapidement aux utilisateurs
    const usersMap = new Map();
    if (usersData) {
      usersData.forEach(user => {
        usersMap.set(user.id, user);
      });
    }

    // Retourner les favoris avec les informations de l'utilisateur
    return favoritesData
      .map(entry => {
        const infra = this.transformToFlutterFormat(entry.infrastructure);
        if (!infra) return null;
        
        const user = usersMap.get(entry.user_id);
        
        // Ajouter les informations de l'utilisateur qui a ajouté le favori
        return {
          ...infra,
          addedBy: user ? {
            id: entry.user_id,
            nom: user.nom || '',
            prenom: user.prenom || '',
            email: user.email || '',
            fullName: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || 'Utilisateur inconnu'
          } : {
            id: entry.user_id,
            nom: '',
            prenom: '',
            email: '',
            fullName: 'Utilisateur inconnu'
          },
          addedAt: entry.created_at
        };
      })
      .filter(Boolean);
  }

  async addFavorite(userId, infrastructureId) {
    // Vérifier si le favori existe déjà
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('infrastructure_id', infrastructureId)
      .single();

    if (existing) {
      // Le favori existe déjà, ne pas créer de doublon
      console.log('ℹ️  Favori déjà existant pour cet utilisateur');
      return { id: existing.id };
    }

    // Ajouter le favori
    const { data, error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        infrastructure_id: infrastructureId
      })
      .select()
      .single();

    if (error && error.code !== '23505') {
      throw error;
    }

    // Push + notification Firestore (admin/super_admin/agent_communal)
    try {
      // Récupérer le nom de l'infrastructure (best effort)
      const { data: infra } = await supabase
        .from('infrastructures')
        .select('id, nom')
        .eq('id', infrastructureId)
        .single()

      await notificationService.notify({
        type: 'favori',
        title: `Nouveau favori`,
        message: infra?.nom ? `${infra.nom} a été ajoutée en favori` : `Une infrastructure a été ajoutée en favori`,
        href: `/dashboard/favoris`,
        targetRoles: ['super_admin', 'admin', 'agent_communal'],
      })
    } catch (e) {
      console.warn('⚠️ Notification push favori échouée:', e.message)
    }

    return true;
  }

  async removeFavorite(userId, infrastructureId) {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('infrastructure_id', infrastructureId);

    if (error) {
      throw error;
    }

    return true;
  }

  // Supprime tous les favoris d'une infrastructure (pour les admins)
  async removeAllFavoritesForInfrastructure(infrastructureId) {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('infrastructure_id', infrastructureId);

    if (error) {
      throw error;
    }

    return true;
  }

  // Récupérer les infrastructures créées par un utilisateur
  async findByCreator(userId) {
    const { data, error } = await supabase
      .from('infrastructures')
      .select('*, cree_par:users!cree_par(*), valide_par:users!valide_par(*)')
      .eq('cree_par', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(infra => this.transformToFlutterFormat(infra)).filter(Boolean);
  }
}

module.exports = new InfrastructureService();

