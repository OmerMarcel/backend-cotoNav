const supabase = require('../config/supabase');

class StatisticsService {
  async getGeneralStats() {
    try {
      const [
        { count: totalInfrastructures },
        { count: infrastructuresValidees },
        { count: infrastructuresEnAttente },
        { count: totalPropositions },
        { count: propositionsEnAttente },
        { count: totalSignalements },
        { count: signalementsNouveaux },
        { count: totalUsers },
        { count: totalAvis },
        { count: totalFavoris }
      ] = await Promise.all([
        supabase.from('infrastructures').select('*', { count: 'exact', head: true }),
        supabase.from('infrastructures').select('*', { count: 'exact', head: true }).eq('valide', true),
        supabase.from('infrastructures').select('*', { count: 'exact', head: true }).eq('valide', false),
        supabase.from('propositions').select('*', { count: 'exact', head: true }),
        supabase.from('propositions').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
        supabase.from('signalements').select('*', { count: 'exact', head: true }),
        supabase.from('signalements').select('*', { count: 'exact', head: true }).eq('statut', 'nouveau'),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('avis').select('*', { count: 'exact', head: true }),
        supabase.from('user_favorites').select('*', { count: 'exact', head: true })
      ]);

      return {
        totalInfrastructures: totalInfrastructures || 0,
        infrastructuresValidees: infrastructuresValidees || 0,
        infrastructuresEnAttente: infrastructuresEnAttente || 0,
        totalPropositions: totalPropositions || 0,
        propositionsEnAttente: propositionsEnAttente || 0,
        totalSignalements: totalSignalements || 0,
        signalementsNouveaux: signalementsNouveaux || 0,
        totalUsers: totalUsers || 0,
        totalAvis: totalAvis || 0,
        totalFavoris: totalFavoris || 0
      };
    } catch (error) {
      console.error('❌ Erreur dans getGeneralStats:', error.message);
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        totalInfrastructures: 0,
        infrastructuresValidees: 0,
        infrastructuresEnAttente: 0,
        totalPropositions: 0,
        propositionsEnAttente: 0,
        totalSignalements: 0,
        signalementsNouveaux: 0,
        totalUsers: 0,
        totalAvis: 0,
        totalFavoris: 0
      };
    }
  }

  async getInfrastructuresByType() {
    try {
      const { data, error } = await supabase
        .from('infrastructures')
        .select('type');

      if (error) throw error;

    const grouped = data.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('❌ Erreur dans getInfrastructuresByType:', error.message);
      return [];
    }
  }

  async getInfrastructuresByQuartier() {
    try {
      const { data, error } = await supabase
        .from('infrastructures')
        .select('localisation');

      if (error) throw error;

    const grouped = data.reduce((acc, item) => {
      const quartier = item.localisation?.quartier || 'Non spécifié';
      acc[quartier] = (acc[quartier] || 0) + 1;
      return acc;
    }, {});

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } catch (error) {
      console.error('❌ Erreur dans getInfrastructuresByQuartier:', error.message);
      return [];
    }
  }

  async getInfrastructuresByEtat() {
    try {
      const { data, error } = await supabase
        .from('infrastructures')
        .select('etat');

      if (error) throw error;

    const grouped = data.reduce((acc, item) => {
      acc[item.etat] = (acc[item.etat] || 0) + 1;
      return acc;
    }, {});

      return Object.entries(grouped).map(([_id, count]) => ({ _id, count }));
    } catch (error) {
      console.error('❌ Erreur dans getInfrastructuresByEtat:', error.message);
      return [];
    }
  }

  async getEvolution() {
    try {
      const sixMoisAgo = new Date();
      sixMoisAgo.setMonth(sixMoisAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from('infrastructures')
        .select('created_at')
        .gte('created_at', sixMoisAgo.toISOString());

      if (error) throw error;

    const grouped = data.reduce((acc, item) => {
      const date = new Date(item.created_at);
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

      return Object.entries(grouped)
        .map(([key, count]) => {
          const [month, year] = key.split('/');
          return {
            _id: { year: parseInt(year), month: parseInt(month) },
            count
          };
        })
        .sort((a, b) => {
          if (a._id.year !== b._id.year) return a._id.year - b._id.year;
          return a._id.month - b._id.month;
        });
    } catch (error) {
      console.error('❌ Erreur dans getEvolution:', error.message);
      return [];
    }
  }

  async getTopInfrastructures() {
    try {
      const { data, error } = await supabase
        .from('infrastructures')
        .select('nom, type, note_moyenne, nombre_avis')
        .order('note_moyenne', { ascending: false })
        .order('nombre_avis', { ascending: false })
        .limit(5);

      if (error) throw error;

      return data.map(item => ({
        nom: item.nom,
        type: item.type,
        noteMoyenne: parseFloat(item.note_moyenne) || 0,
        nombreAvis: item.nombre_avis || 0
      }));
    } catch (error) {
      console.error('❌ Erreur dans getTopInfrastructures:', error.message);
      return [];
    }
  }
}

module.exports = new StatisticsService();

