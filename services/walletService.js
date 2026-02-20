/**
 * Service de gestion du portefeuille utilisateur
 * Gère les soldes, transactions et les retraits via QR code
 */

const supabase = require("../config/supabase");

class WalletService {
  /**
   * Récupérer le portefeuille d'un utilisateur
   */
  static async getUserWallet(userId) {
    try {
      // Récupérer les informations de portefeuille
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select(
          `
          user_id,
          total_balance,
          available_balance,
          pending_balance,
          total_transactions,
          updated_at,
          created_at
        `,
        )
        .eq("user_id", userId)
        .single();

      if (walletError && walletError.code !== "PGRST116") {
        throw walletError;
      }

      // Si pas de portefeuille, en créer un par défaut
      if (!wallet) {
        return {
          user_id: userId,
          total_balance: 0,
          available_balance: 0,
          pending_balance: 0,
          total_transactions: 0,
          recent_transactions: [],
          last_updated: new Date().toISOString(),
        };
      }

      // Récupérer les transactions récentes
      const { data: transactions } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      return {
        ...wallet,
        recent_transactions: transactions || [],
        last_updated: wallet.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Erreur récupération portefeuille:", error);
      throw new Error(`Erreur portefeuille: ${error.message}`);
    }
  }

  /**
   * Ajouter une transaction au portefeuille
   */
  static async addTransaction(userId, transactionData) {
    try {
      const {
        type, // 'contribution', 'exchange', 'withdrawal', 'refund'
        description,
        amount,
        referenceId,
        qrCode = null,
      } = transactionData;

      // Insérer la transaction
      const { data: transaction, error } = await supabase
        .from("wallet_transactions")
        .insert([
          {
            user_id: userId,
            type,
            description,
            amount,
            status: "completed",
            reference_id: referenceId,
            qr_code: qrCode,
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour le solde du portefeuille
      if (type === "contribution" || type === "exchange" || type === "refund") {
        // Ajouter au solde
        await supabase.rpc("increment_wallet_balance", {
          p_user_id: userId,
          p_amount: amount,
        });
      } else if (type === "withdrawal") {
        // Retrait: décrémenter le solde
        await supabase.rpc("decrement_wallet_balance", {
          p_user_id: userId,
          p_amount: amount,
        });
      }

      return transaction;
    } catch (error) {
      console.error("❌ Erreur ajout transaction:", error);
      throw error;
    }
  }

  /**
   * Générer un code QR pour retrait
   */
  static async generateWithdrawalQR(userId, amount) {
    try {
      const referenceId = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Data à encoder dans le QR code
      const qrData = {
        type: "withdrawal",
        reference_id: referenceId,
        user_id: userId,
        amount,
        timestamp: Date.now(),
      };

      // Créer une transaction en attente
      const { data: transaction, error } = await supabase
        .from("wallet_transactions")
        .insert([
          {
            user_id: userId,
            type: "withdrawal",
            description: `Retrait de ${amount} F CFA`,
            amount,
            status: "pending",
            reference_id: referenceId,
            qr_code: JSON.stringify(qrData),
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        reference_id: referenceId,
        amount,
        qr_value: JSON.stringify(qrData),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      };
    } catch (error) {
      console.error("❌ Erreur génération QR:", error);
      throw error;
    }
  }

  /**
   * Demander un retrait (alternative au QR code)
   */
  static async requestWithdrawal(userId, withdrawalData) {
    try {
      const {
        amount,
        method, // 'mobile_money', 'bank_account'
        phone,
        accountNumber,
        bankCode,
      } = withdrawalData;

      // Vérifier le solde disponible
      const wallet = await WalletService.getUserWallet(userId);
      if (wallet.available_balance < amount) {
        throw new Error("Solde insuffisant pour ce retrait");
      }

      const referenceId = `WR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Créer une demande de retrait
      const { data: withdrawal, error } = await supabase
        .from("wallet_withdrawals")
        .insert([
          {
            user_id: userId,
            reference_id: referenceId,
            amount,
            method,
            phone: method === "mobile_money" ? phone : null,
            account_number: method === "bank_account" ? accountNumber : null,
            bank_code: method === "bank_account" ? bankCode : null,
            status: "pending",
            requested_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Créer une transaction
      await this.addTransaction(userId, {
        type: "withdrawal",
        description: `Demande de retrait via ${method}`,
        amount,
        referenceId,
      });

      return {
        reference_id: referenceId,
        amount,
        method,
        status: "pending",
      };
    } catch (error) {
      console.error("❌ Erreur demande retrait:", error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des transactions
   */
  static async getTransactionHistory(
    userId,
    page = 1,
    limit = 20,
    type = null,
  ) {
    try {
      let query = supabase
        .from("wallet_transactions")
        .select("*", { count: "exact" })
        .eq("user_id", userId);

      if (type) {
        query = query.eq("type", type);
      }

      const {
        data: transactions,
        error,
        count,
      } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        transactions: transactions || [],
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      console.error("❌ Erreur historique:", error);
      throw error;
    }
  }

  /**
   * Vérifier et traiter un retrait QR
   */
  static async processWithdrawalQR(userId, qrData) {
    try {
      const { reference_id, amount, user_id } = qrData;

      // Vérifier que le QR appartient à l'utilisateur
      if (user_id !== userId) {
        throw new Error("Ce QR ne vous appartient pas");
      }

      // Récupérer la transaction
      const { data: transaction, error: txError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("reference_id", reference_id)
        .single();

      if (txError) throw new Error("Transaction non trouvée");

      if (transaction.status !== "pending") {
        throw new Error("Cette transaction a déjà été traitée");
      }

      // Vérifier le solde
      const wallet = await WalletService.getUserWallet(userId);
      if (wallet.available_balance < amount) {
        throw new Error("Solde insuffisant");
      }

      // Mettre à jour la transaction
      const { error: updateError } = await supabase
        .from("wallet_transactions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("reference_id", reference_id);

      if (updateError) throw updateError;

      // Décrémenter le solde
      await supabase.rpc("decrement_wallet_balance", {
        p_user_id: userId,
        p_amount: amount,
      });

      return {
        success: true,
        message: "Retrait traité avec succès",
        reference_id,
      };
    } catch (error) {
      console.error("❌ Erreur traitement QR:", error);
      throw error;
    }
  }

  /**
   * Annuler une demande de retrait
   */
  static async cancelWithdrawal(userId, withdrawalId) {
    try {
      // Récupérer la demande
      const { data: withdrawal, error: fetchError } = await supabase
        .from("wallet_withdrawals")
        .select("*")
        .eq("id", withdrawalId)
        .eq("user_id", userId)
        .single();

      if (fetchError) throw new Error("Demande non trouvée");

      if (withdrawal.status !== "pending") {
        throw new Error("Seules les demandes en attente peuvent être annulées");
      }

      // Mettre à jour la demande
      const { error: updateError } = await supabase
        .from("wallet_withdrawals")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", withdrawalId);

      if (updateError) throw updateError;

      // Réversibilité: rien à faire car l'argent restait dans le solde

      return { success: true, message: "Demande annulée" };
    } catch (error) {
      console.error("❌ Erreur annulation:", error);
      throw error;
    }
  }
}

module.exports = WalletService;
