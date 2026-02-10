const supabase = require('../config/supabase')
const firebaseAdmin = require('../config/firebase')

class NotificationService {
  async upsertFcmToken({ userId, role, platform = 'web', token }) {
    if (!token) throw new Error('Token FCM manquant')

    // Upsert par token (unique), et on maintient user_id/role/plateforme à jour
    const { data, error } = await supabase
      .from('user_fcm_tokens')
      .upsert(
        {
          user_id: userId,
          role,
          platform,
          token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getTokensForRoles(roles) {
    if (!roles?.length) return []
    const { data, error } = await supabase
      .from('user_fcm_tokens')
      .select('token')
      .in('role', roles)

    if (error) throw error
    const tokens = (data || []).map((r) => r.token).filter(Boolean)
    return [...new Set(tokens)]
  }

  async createFirestoreNotification({ type, title, message = '', href = '', targetRoles = [] }) {
    if (!firebaseAdmin) {
      console.warn('⚠️ Firebase Admin non initialisé, notification Firestore non créée')
      return null
    }

    try {
      const payload = {
        type,
        title,
        message,
        href,
        targetRoles,
        readBy: [],
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      }

      const ref = await firebaseAdmin.firestore().collection('notifications').add(payload)
      console.log('✅ Notification Firestore créée:', { id: ref.id, type, title })
      return ref.id
    } catch (error) {
      console.error('❌ Erreur lors de la création de la notification Firestore:', error)
      // Ne pas bloquer le processus si la notification Firestore échoue
      return null
    }
  }

  async sendPushToRoles({ roles, title, body, href = '', type }) {
    if (!firebaseAdmin) return { sent: 0, reason: 'firebase_admin_not_configured' }

    console.log(`📱 Envoi notification push aux rôles: ${roles.join(', ')}`);
    console.log(`📨 Titre: ${title}`);
    console.log(`📄 Corps: ${body}`);

    const tokens = await this.getTokensForRoles(roles)
    console.log(`🎯 Tokens trouvés: ${tokens.length} pour les rôles ${roles.join(', ')}`);
    
    if (!tokens.length) {
      console.log(`❌ Aucun token FCM trouvé pour les rôles: ${roles.join(', ')}`);
      return { sent: 0, reason: 'no_tokens' }
    }

    // Multicast
    const resp = await firebaseAdmin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        href: href || '',
        type: type || '',
      },
    })

    console.log(`📊 Résultat envoi: ${resp.successCount} succès, ${resp.failureCount} échecs`);

    // Nettoyage des tokens invalides
    const invalidTokens = []
    resp.responses.forEach((r, idx) => {
      if (r.success) return
      const code = r.error?.code || ''
      console.log(`❌ Token invalide ${idx}: ${code}`);
      if (
        code.includes('messaging/registration-token-not-registered') ||
        code.includes('messaging/invalid-registration-token')
      ) {
        invalidTokens.push(tokens[idx])
      }
    })

    if (invalidTokens.length) {
      console.log(`🧹 Nettoyage de ${invalidTokens.length} tokens invalides`);
      await supabase.from('user_fcm_tokens').delete().in('token', invalidTokens)
    }

    return { sent: resp.successCount, failed: resp.failureCount, invalidRemoved: invalidTokens.length }
  }

  /**
   * API haut niveau: crée la notification Firestore (pour la cloche) + envoie push aux rôles.
   */
  async notify({ type, title, message, href, targetRoles }) {
    await this.createFirestoreNotification({ type, title, message, href, targetRoles })
    return await this.sendPushToRoles({
      roles: targetRoles,
      title,
      body: message || title,
      href,
      type,
    })
  }

  /**
   * Envoie uniquement une notification push (sans créer de notification Firestore)
   * Utile pour notifier les citoyens sans polluer les notifications du dashboard
   */
  async sendPushOnly({ roles, title, body, href = '', type }) {
    return await this.sendPushToRoles({
      roles,
      title,
      body,
      href,
      type,
    })
  }
}

module.exports = new NotificationService()


