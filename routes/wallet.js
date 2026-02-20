/**
 * Routes API pour la gestion du portefeuille utilisateur
 * Endpoints pour afficher le solde, les transactions et traiter les retraits
 */

const express = require("express");
const router = express.Router();
const WalletService = require("../services/walletService");
const { auth } = require("../middleware/auth");
const supabase = require("../config/supabase");

/**
 * GET /api/wallet/my-wallet
 * Récupérer le portefeuille de l'utilisateur connecté
 * Authentification requise
 */
router.get("/my-wallet", auth, async (req, res) => {
  try {
    const wallet = await WalletService.getUserWallet(req.user.id);

    res.json({
      status: "success",
      data: wallet,
    });
  } catch (error) {
    console.error("❌ Erreur wallet:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur lors de la récupération du portefeuille",
      error: error.message,
    });
  }
});

/**
 * GET /api/wallet/available-balance
 * Récupérer le solde disponible
 * Authentification requise
 */
router.get("/available-balance", auth, async (req, res) => {
  try {
    const wallet = await WalletService.getUserWallet(req.user.id);

    res.json({
      status: "success",
      data: {
        available_balance: wallet.available_balance,
        pending_balance: wallet.pending_balance,
        total_balance: wallet.total_balance,
      },
    });
  } catch (error) {
    console.error("❌ Erreur balance:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur lors de la récupération du solde",
      error: error.message,
    });
  }
});

/**
 * POST /api/wallet/generate-withdrawal-qr
 * Générer un code QR pour retrait
 * Authentification requise
 * Body: { amount: number }
 */
router.post("/generate-withdrawal-qr", auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Montant invalide",
      });
    }

    const qrData = await WalletService.generateWithdrawalQR(
      req.user.id,
      amount,
    );

    res.json({
      status: "success",
      data: qrData,
    });
  } catch (error) {
    console.error("❌ Erreur QR:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur lors de la génération du code QR",
      error: error.message,
    });
  }
});

/**
 * POST /api/wallet/request-withdrawal
 * Demander un retrait (mobile money, virement bancaire)
 * Authentification requise
 * Body: { amount, method, phone?, accountNumber?, bankCode? }
 */
router.post("/request-withdrawal", auth, async (req, res) => {
  try {
    const { amount, method, phone, accountNumber, bankCode } = req.body;

    if (!amount || !method) {
      return res.status(400).json({
        status: "error",
        message: "Montant et méthode requis",
      });
    }

    const withdrawal = await WalletService.requestWithdrawal(req.user.id, {
      amount,
      method,
      phone,
      accountNumber,
      bankCode,
    });

    res.json({
      status: "success",
      data: withdrawal,
    });
  } catch (error) {
    console.error("❌ Erreur retrait:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      error: error.message,
    });
  }
});

/**
 * GET /api/wallet/transactions
 * Récupérer l'historique des transactions
 * Authentification requise
 * Query: ?page=1&limit=20&type=contribution
 */
router.get("/transactions", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || null;

    const result = await WalletService.getTransactionHistory(
      req.user.id,
      page,
      limit,
      type,
    );

    res.json({
      status: "success",
      data: result.transactions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error) {
    console.error("❌ Erreur historique:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur lors de la récupération de l'historique",
      error: error.message,
    });
  }
});

/**
 * GET /api/wallet/transactions/:transactionId
 * Récupérer le statut d'une transaction
 * Authentification requise
 */
router.get("/transactions/:transactionId", auth, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const { data: transaction, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("user_id", req.user.id)
      .single();

    if (error || !transaction) {
      return res.status(404).json({
        status: "error",
        message: "Transaction non trouvée",
      });
    }

    res.json({
      status: "success",
      data: transaction,
    });
  } catch (error) {
    console.error("❌ Erreur transaction:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur lors de la récupération de la transaction",
      error: error.message,
    });
  }
});

/**
 * POST /api/wallet/process-withdrawal-qr
 * Traiter un retrait via code QR
 * Utilisé par le guichet de retrait
 * Body: { qr_data }
 */
router.post("/process-withdrawal-qr", auth, async (req, res) => {
  try {
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({
        status: "error",
        message: "Données QR requises",
      });
    }

    const result = await WalletService.processWithdrawalQR(
      req.user.id,
      qr_data,
    );

    res.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("❌ Erreur traitement QR:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      error: error.message,
    });
  }
});

/**
 * POST /api/wallet/cancel-withdrawal/:withdrawalId
 * Annuler une demande de retrait
 * Authentification requise
 */
router.post("/cancel-withdrawal/:withdrawalId", auth, async (req, res) => {
  try {
    const { withdrawalId } = req.params;

    const result = await WalletService.cancelWithdrawal(
      req.user.id,
      withdrawalId,
    );

    res.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("❌ Erreur annulation:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      error: error.message,
    });
  }
});

module.exports = router;
