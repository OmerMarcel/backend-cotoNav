const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const userService = require("../services/userService");
const emailService = require("../services/emailService");
const verificationService = require("../services/verificationService");
const { auth } = require("../middleware/auth");
const firebaseAdmin = require("../config/firebase");

const router = express.Router();

// Connexion admin
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, role: requestedRole } = req.body;

      console.log("Tentative de connexion pour:", email, requestedRole ? `(rôle demandé: ${requestedRole})` : "");

      const user = await userService.findByEmail(email);
      if (!user) {
        console.log("Utilisateur non trouvé:", email);
        return res
          .status(401)
          .json({ message: "Email ou mot de passe incorrect." });
      }

      console.log("Utilisateur trouvé:", {
        id: user.id,
        email: user.email,
        role: user.role,
        actif: user.actif,
      });

      // Vérifier que l'utilisateur a accès au dashboard (admin, super_admin ou agent_communal)
      if (!["admin", "super_admin", "agent_communal"].includes(user.role)) {
        // Vérifier aussi l'ancien rôle 'moderateur' pour rétrocompatibilité
        if (user.role === "moderateur") {
          // Traiter comme admin pour rétrocompatibilité
        } else {
        console.log("Rôle insuffisant:", user.role);
        return res
          .status(403)
          .json({ message: "Accès refusé. Droits administrateur requis." });
        }
      }

      // Si un rôle est demandé et que l'utilisateur n'est pas super_admin,
      // vérifier que le rôle demandé correspond au rôle réel
      if (requestedRole && user.role !== "super_admin") {
        // Convertir le rôle 'moderateur' en 'admin' pour la comparaison
        const userRoleForComparison = user.role === "moderateur" ? "admin" : user.role;
        if (userRoleForComparison !== requestedRole) {
          console.log(`Rôle demandé (${requestedRole}) ne correspond pas au rôle réel (${user.role})`);
          return res
            .status(403)
            .json({ 
              message: `Vous êtes connecté en tant que ${user.role === "moderateur" ? "admin" : user.role}, pas comme ${requestedRole}. Veuillez sélectionner le bon rôle.` 
            });
        }
      }

      if (!user.password) {
        console.log("Aucun mot de passe défini pour cet utilisateur");
        return res
          .status(401)
          .json({ message: "Email ou mot de passe incorrect." });
      }

      const isMatch = await userService.comparePassword(
        password,
        user.password
      );
      if (!isMatch) {
        console.log("Mot de passe incorrect pour:", email);
        return res
          .status(401)
          .json({ message: "Email ou mot de passe incorrect." });
      }

      if (!user.actif) {
        return res.status(403).json({ message: "Compte désactivé." });
      }

      // Mettre à jour la dernière connexion
      await userService.update(user.id, {
        last_login: new Date().toISOString(),
      });

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || "secret_key_change_in_production",
        { expiresIn: "24h" }
      );

      // Créer ou récupérer l'utilisateur Firebase et générer un token personnalisé
      let firebaseToken = null;
      if (firebaseAdmin) {
        try {
          let firebaseUser;
          let userNeedsCreation = false;
          
          // 1. D'abord, essayer de récupérer l'utilisateur par UID (priorité)
          try {
            firebaseUser = await firebaseAdmin.auth().getUser(user.id);
            console.log('✅ Utilisateur Firebase trouvé par UID:', user.id);
            
            // Vérifier si l'email correspond, sinon mettre à jour
            if (firebaseUser.email !== user.email) {
              console.log(`⚠️ Email différent détecté. Mise à jour de ${firebaseUser.email} vers ${user.email}`);
              await firebaseAdmin.auth().updateUser(firebaseUser.uid, {
                email: user.email,
              });
              firebaseUser.email = user.email;
            }
          } catch (uidNotFoundError) {
            // 2. Si l'UID n'existe pas, essayer de récupérer par email
            if (uidNotFoundError.code === 'auth/user-not-found') {
              try {
                firebaseUser = await firebaseAdmin.auth().getUserByEmail(user.email);
                console.log('✅ Utilisateur Firebase trouvé par email:', user.email);
                console.log(`⚠️ UID différent détecté. Firebase UID: ${firebaseUser.uid}, Supabase ID: ${user.id}`);
                // Note: On ne peut pas changer l'UID d'un utilisateur existant
                // On utilisera l'UID existant de Firebase
              } catch (emailNotFoundError) {
                // 3. Si ni l'UID ni l'email n'existent, marquer pour création
                if (emailNotFoundError.code === 'auth/user-not-found') {
                  userNeedsCreation = true;
                  console.log('⚠️ Utilisateur Firebase non trouvé, création en cours...');
                } else {
                  throw emailNotFoundError;
                }
              }
            } else {
              throw uidNotFoundError;
            }
          }
          
          // 4. Créer l'utilisateur si nécessaire
          if (userNeedsCreation) {
            // Construire le nom complet
            const displayName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email;
            
            try {
              // Créer l'utilisateur Firebase avec l'UID de Supabase pour la cohérence
              firebaseUser = await firebaseAdmin.auth().createUser({
                uid: user.id, // Utiliser l'ID Supabase comme UID Firebase
                email: user.email,
                displayName: displayName,
                emailVerified: false, // Les admins peuvent ne pas avoir vérifié leur email
                disabled: !user.actif, // Synchroniser l'état actif
              });
              
              console.log('✅ Utilisateur Firebase créé avec succès:', user.email);
            } catch (createError) {
              // Si la création échoue car l'UID existe déjà, essayer de le récupérer
              if (createError.code === 'auth/uid-already-exists') {
                console.log('⚠️ UID existe déjà, récupération de l\'utilisateur...');
                firebaseUser = await firebaseAdmin.auth().getUser(user.id);
                
                // Mettre à jour l'email si différent
                if (firebaseUser.email !== user.email) {
                  await firebaseAdmin.auth().updateUser(firebaseUser.uid, {
                    email: user.email,
                  });
                  firebaseUser.email = user.email;
                }
              } else {
                throw createError;
              }
            }
          }
          
          // 5. Synchroniser les informations (claims, displayName, état actif)
          const displayName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email;
          const needsUpdate = 
            firebaseUser.displayName !== displayName ||
            firebaseUser.customClaims?.role !== user.role ||
            firebaseUser.disabled !== !user.actif;
          
          if (needsUpdate) {
            const updateData = {};
            
            if (firebaseUser.displayName !== displayName) {
              updateData.displayName = displayName;
            }
            
            if (firebaseUser.disabled !== !user.actif) {
              updateData.disabled = !user.actif;
            }
            
            if (Object.keys(updateData).length > 0) {
              await firebaseAdmin.auth().updateUser(firebaseUser.uid, updateData);
            }
            
            // Mettre à jour les claims personnalisés pour le rôle
            if (firebaseUser.customClaims?.role !== user.role) {
              await firebaseAdmin.auth().setCustomUserClaims(firebaseUser.uid, {
                role: user.role,
              });
              console.log('✅ Claims personnalisés mis à jour pour:', user.email);
            }
            
            console.log('✅ Profil Firebase synchronisé pour:', user.email);
          }
          
          // 6. Générer le token personnalisé avec l'UID Firebase
          firebaseToken = await firebaseAdmin.auth().createCustomToken(firebaseUser.uid, {
            role: user.role,
            email: user.email,
          });
          
          console.log('✅ Token Firebase personnalisé créé pour:', user.email);
        } catch (firebaseError) {
          console.error('❌ Erreur lors de la gestion Firebase:', firebaseError);
          console.warn('⚠️ La connexion continue sans Firebase Auth');
          // Ne pas bloquer la connexion si Firebase échoue
        }
      }

      res.json({
        token,
        firebaseToken, // Token Firebase pour l'accès Firestore
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Erreur de connexion:", error);
      res.status(500).json({ message: "Erreur serveur lors de la connexion." });
    }
  }
);

// Connexion mobile (pour utilisateurs Firebase)
router.post(
  "/login/mobile",
  [
    body("email").isEmail().normalizeEmail(),
    body("firebaseAuth").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, firebaseAuth } = req.body;

      console.log("📱 Tentative de connexion mobile pour:", email);

      const user = await userService.findByEmail(email);
      if (!user) {
        console.log("❌ Utilisateur non trouvé:", email);
        return res
          .status(401)
          .json({ message: "Utilisateur non trouvé. Veuillez vous inscrire." });
      }

      if (!user.actif) {
        return res.status(403).json({ message: "Compte désactivé." });
      }

      // Mettre à jour la dernière connexion
      await userService.update(user.id, {
        last_login: new Date().toISOString(),
      });

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || "secret_key_change_in_production",
        { expiresIn: "24h" }
      );

      console.log("✅ Token généré pour utilisateur mobile:", user.email);

      res.json({
        token,
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("❌ Erreur de connexion mobile:", error);
      res.status(500).json({ message: "Erreur serveur lors de la connexion." });
    }
  }
);

// Envoyer un code de vérification par email
router.post(
  "/send-verification-code",
  [body("email").isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const emailLower = email.toLowerCase();

      console.log(`📧 Demande d'envoi de code de vérification pour: ${emailLower}`);

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await userService.findByEmail(emailLower);
      if (existingUser) {
        // Permettre quand même l'envoi du code (pour réinitialisation, etc.)
        console.log(`⚠️  Utilisateur existant, mais envoi du code autorisé`);
      }

      // Générer et stocker le code
      const code = verificationService.createVerificationCode(emailLower, 10);

      // Envoyer l'email
      try {
        await emailService.sendVerificationCode(emailLower, code);
        console.log(`✅ Code de vérification envoyé à ${emailLower}`);
        
        res.status(200).json({
          message: "Code de vérification envoyé avec succès",
        });
      } catch (emailError) {
        console.error("❌ Erreur lors de l'envoi de l'email:", emailError);
        
        // Supprimer le code si l'email n'a pas pu être envoyé
        verificationService.deleteCode(emailLower);
        
        // Retourner une erreur détaillée
        const errorMessage = emailError.code === 'EAUTH' 
          ? "Erreur d'authentification SMTP. Vérifiez que vous utilisez un mot de passe d'application Gmail (App Password) et non votre mot de passe normal."
          : "Erreur lors de l'envoi de l'email de vérification";
        
        res.status(500).json({
          message: errorMessage,
          error: process.env.NODE_ENV === 'development' ? emailError.message : undefined,
        });
      }
    } catch (error) {
      console.error("❌ Erreur send-verification-code:", error);
      res.status(500).json({ 
        message: "Erreur serveur lors de l'envoi du code de vérification." 
      });
    }
  }
);

// Vérifier un code de vérification
router.post(
  "/verify-code",
  [
    body("email").isEmail().normalizeEmail(),
    body("code").isLength({ min: 6, max: 6 }).matches(/^\d+$/),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, code } = req.body;
      const emailLower = email.toLowerCase();

      console.log(`🔍 Vérification du code pour: ${emailLower}`);

      // Vérifier le code
      const isValid = verificationService.verifyCode(emailLower, code);

      if (isValid) {
        console.log(`✅ Code de vérification valide pour ${emailLower}`);
        res.status(200).json({
          message: "Code de vérification valide",
          verified: true,
        });
      } else {
        console.log(`❌ Code de vérification invalide pour ${emailLower}`);
        res.status(400).json({
          message: "Code de vérification invalide ou expiré",
          verified: false,
        });
      }
    } catch (error) {
      console.error("❌ Erreur verify-code:", error);
      res.status(500).json({ 
        message: "Erreur serveur lors de la vérification du code." 
      });
    }
  }
);

// Inscription (pour mobile)
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("name").notEmpty().trim(),
    // Le mot de passe est optionnel pour les utilisateurs Firebase
    body("password").optional().isLength({ min: 6 }),
    // Le code de vérification est optionnel pour rétrocompatibilité
    body("verificationCode").optional().isLength({ min: 6, max: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, firebaseAuth, verificationCode } = req.body;
      const emailLower = email.toLowerCase();

      // Si un code de vérification est fourni, le vérifier (optionnel maintenant)
      if (verificationCode) {
        const isCodeValid = verificationService.verifyCode(emailLower, verificationCode);
        if (!isCodeValid) {
          return res.status(400).json({
            message: "Code de vérification invalide ou expiré. Veuillez demander un nouveau code.",
          });
        }
        console.log(`✅ Code de vérification validé pour ${emailLower}`);
      }
      // Le code de vérification est maintenant optionnel - on peut créer le compte directement

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await userService.findByEmail(emailLower);
      if (existingUser) {
        // Si l'utilisateur existe déjà, générer un token pour lui
        console.log("Utilisateur existant trouvé, génération du token...");
        const token = jwt.sign(
          { userId: existingUser.id, role: existingUser.role },
          process.env.JWT_SECRET || "secret_key_change_in_production",
          { expiresIn: "24h" }
        );

        return res.status(200).json({
          token,
          user: {
            id: existingUser.id,
            nom: existingUser.nom,
            prenom: existingUser.prenom,
            email: existingUser.email,
            role: existingUser.role,
          },
        });
      }

      // Créer l'utilisateur
      const nameParts = name.split(" ");
      const nom = nameParts[0] || name;
      const prenom = nameParts.slice(1).join(" ") || "";

      const user = await userService.create({
        nom,
        prenom,
        email: emailLower,
        password: password || null, // Mot de passe optionnel pour Firebase
        authProvider: firebaseAuth ? "firebase" : "email",
        role: "citoyen",
        actif: true,
      });

      // Générer le token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || "secret_key_change_in_production",
        { expiresIn: "24h" }
      );

      console.log(`✅ Compte créé avec succès pour ${emailLower}`);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      res
        .status(500)
        .json({ message: "Erreur serveur lors de l'inscription." });
    }
  }
);

// Obtenir le profil de l'utilisateur connecté
router.get("/me", auth, async (req, res) => {
  try {
    const user = await userService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const { password, ...userWithoutPassword } = user;
    
    // Créer ou récupérer l'utilisateur Firebase et générer un token personnalisé
    let firebaseToken = null;
    if (firebaseAdmin) {
      try {
        let firebaseUser;
        let userNeedsCreation = false;
        
        // 1. D'abord, essayer de récupérer l'utilisateur par UID (priorité)
        try {
          firebaseUser = await firebaseAdmin.auth().getUser(user.id);
          console.log('✅ Utilisateur Firebase trouvé par UID pour /me:', user.id);
          
          // Vérifier si l'email correspond, sinon mettre à jour
          if (firebaseUser.email !== user.email) {
            console.log(`⚠️ Email différent détecté. Mise à jour de ${firebaseUser.email} vers ${user.email}`);
            await firebaseAdmin.auth().updateUser(firebaseUser.uid, {
              email: user.email,
            });
            firebaseUser.email = user.email;
          }
        } catch (uidNotFoundError) {
          // 2. Si l'UID n'existe pas, essayer de récupérer par email
          if (uidNotFoundError.code === 'auth/user-not-found') {
            try {
              firebaseUser = await firebaseAdmin.auth().getUserByEmail(user.email);
              console.log('✅ Utilisateur Firebase trouvé par email pour /me:', user.email);
              console.log(`⚠️ UID différent détecté. Firebase UID: ${firebaseUser.uid}, Supabase ID: ${user.id}`);
              // Note: On ne peut pas changer l'UID d'un utilisateur existant
              // On utilisera l'UID existant de Firebase
            } catch (emailNotFoundError) {
              // 3. Si ni l'UID ni l'email n'existent, marquer pour création
              if (emailNotFoundError.code === 'auth/user-not-found') {
                userNeedsCreation = true;
                console.log('⚠️ Utilisateur Firebase non trouvé pour /me, création en cours...');
              } else {
                throw emailNotFoundError;
              }
            }
          } else {
            throw uidNotFoundError;
          }
        }
        
        // 4. Créer l'utilisateur si nécessaire
        if (userNeedsCreation) {
          // Construire le nom complet
          const displayName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email;
          
          try {
            // Créer l'utilisateur Firebase avec l'UID de Supabase pour la cohérence
            firebaseUser = await firebaseAdmin.auth().createUser({
              uid: user.id, // Utiliser l'ID Supabase comme UID Firebase
              email: user.email,
              displayName: displayName,
              emailVerified: false,
              disabled: !user.actif,
            });
            
            console.log('✅ Utilisateur Firebase créé avec succès pour /me:', user.email);
          } catch (createError) {
            // Si la création échoue car l'UID existe déjà, essayer de le récupérer
            if (createError.code === 'auth/uid-already-exists') {
              console.log('⚠️ UID existe déjà, récupération de l\'utilisateur pour /me...');
              firebaseUser = await firebaseAdmin.auth().getUser(user.id);
              
              // Mettre à jour l'email si différent
              if (firebaseUser.email !== user.email) {
                await firebaseAdmin.auth().updateUser(firebaseUser.uid, {
                  email: user.email,
                });
                firebaseUser.email = user.email;
              }
            } else {
              throw createError;
            }
          }
        }
        
        // 5. Synchroniser les informations (claims, displayName, état actif)
        const displayName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email;
        const needsUpdate = 
          firebaseUser.displayName !== displayName ||
          firebaseUser.customClaims?.role !== user.role ||
          firebaseUser.disabled !== !user.actif;
        
        if (needsUpdate) {
          const updateData = {};
          
          if (firebaseUser.displayName !== displayName) {
            updateData.displayName = displayName;
          }
          
          if (firebaseUser.disabled !== !user.actif) {
            updateData.disabled = !user.actif;
          }
          
          if (Object.keys(updateData).length > 0) {
            await firebaseAdmin.auth().updateUser(firebaseUser.uid, updateData);
          }
          
          // Mettre à jour les claims personnalisés pour le rôle
          if (firebaseUser.customClaims?.role !== user.role) {
            await firebaseAdmin.auth().setCustomUserClaims(firebaseUser.uid, {
              role: user.role,
            });
            console.log('✅ Claims personnalisés mis à jour pour /me:', user.email);
          }
          
          console.log('✅ Profil Firebase synchronisé pour /me:', user.email);
        }
        
        // 6. Générer le token personnalisé avec l'UID Firebase
        firebaseToken = await firebaseAdmin.auth().createCustomToken(firebaseUser.uid, {
          role: user.role,
          email: user.email,
        });
        
        console.log('✅ Token Firebase personnalisé créé pour /me:', user.email);
      } catch (firebaseError) {
        console.error('❌ Erreur lors de la gestion Firebase pour /me:', firebaseError);
        // Ne pas bloquer la réponse si Firebase échoue
      }
    }
    
    res.json({
      user: userWithoutPassword,
      firebaseToken, // Token Firebase pour l'accès Firestore
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Endpoint pour obtenir un token Firebase personnalisé
router.get("/firebase-token", auth, async (req, res) => {
  try {
    if (!firebaseAdmin) {
      return res.status(503).json({ message: "Firebase Admin non configuré." });
    }

    const user = await userService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    let firebaseUser;
    let userNeedsCreation = false;
    
    // 1. D'abord, essayer de récupérer l'utilisateur par UID (priorité)
    try {
      firebaseUser = await firebaseAdmin.auth().getUser(user.id);
      console.log('✅ Utilisateur Firebase trouvé par UID pour token:', user.id);
      
      // Vérifier si l'email correspond, sinon mettre à jour
      if (firebaseUser.email !== user.email) {
        console.log(`⚠️ Email différent détecté. Mise à jour de ${firebaseUser.email} vers ${user.email}`);
        await firebaseAdmin.auth().updateUser(firebaseUser.uid, {
          email: user.email,
        });
        firebaseUser.email = user.email;
      }
    } catch (uidNotFoundError) {
      // 2. Si l'UID n'existe pas, essayer de récupérer par email
      if (uidNotFoundError.code === 'auth/user-not-found') {
        try {
          firebaseUser = await firebaseAdmin.auth().getUserByEmail(user.email);
          console.log('✅ Utilisateur Firebase trouvé par email pour token:', user.email);
          console.log(`⚠️ UID différent détecté. Firebase UID: ${firebaseUser.uid}, Supabase ID: ${user.id}`);
          // Note: On ne peut pas changer l'UID d'un utilisateur existant
          // On utilisera l'UID existant de Firebase
        } catch (emailNotFoundError) {
          // 3. Si ni l'UID ni l'email n'existent, marquer pour création
          if (emailNotFoundError.code === 'auth/user-not-found') {
            userNeedsCreation = true;
            console.log('⚠️ Utilisateur Firebase non trouvé, création en cours pour token...');
          } else {
            throw emailNotFoundError;
          }
        }
      } else {
        throw uidNotFoundError;
      }
    }
    
    // 4. Créer l'utilisateur si nécessaire
    if (userNeedsCreation) {
      // Construire le nom complet
      const displayName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email;
      
      try {
        // Créer l'utilisateur Firebase avec l'UID de Supabase pour la cohérence
        firebaseUser = await firebaseAdmin.auth().createUser({
          uid: user.id, // Utiliser l'ID Supabase comme UID Firebase
          email: user.email,
          displayName: displayName,
          emailVerified: false,
          disabled: !user.actif,
        });
        
        console.log('✅ Utilisateur Firebase créé avec succès pour token:', user.email);
      } catch (createError) {
        // Si la création échoue car l'UID existe déjà, essayer de le récupérer
        if (createError.code === 'auth/uid-already-exists') {
          console.log('⚠️ UID existe déjà, récupération de l\'utilisateur pour token...');
          firebaseUser = await firebaseAdmin.auth().getUser(user.id);
          
          // Mettre à jour l'email si différent
          if (firebaseUser.email !== user.email) {
            await firebaseAdmin.auth().updateUser(firebaseUser.uid, {
              email: user.email,
            });
            firebaseUser.email = user.email;
          }
        } else {
          throw createError;
        }
      }
    }
    
    // 5. Synchroniser les informations (claims, displayName, état actif)
    const displayName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email;
    const needsUpdate = 
      firebaseUser.displayName !== displayName ||
      firebaseUser.customClaims?.role !== user.role ||
      firebaseUser.disabled !== !user.actif;
    
    if (needsUpdate) {
      const updateData = {};
      
      if (firebaseUser.displayName !== displayName) {
        updateData.displayName = displayName;
      }
      
      if (firebaseUser.disabled !== !user.actif) {
        updateData.disabled = !user.actif;
      }
      
      if (Object.keys(updateData).length > 0) {
        await firebaseAdmin.auth().updateUser(firebaseUser.uid, updateData);
      }
      
      // Mettre à jour les claims personnalisés pour le rôle
      if (firebaseUser.customClaims?.role !== user.role) {
        await firebaseAdmin.auth().setCustomUserClaims(firebaseUser.uid, {
          role: user.role,
        });
        console.log('✅ Claims personnalisés mis à jour pour token:', user.email);
      }
      
      console.log('✅ Profil Firebase synchronisé pour token:', user.email);
    }

    const firebaseToken = await firebaseAdmin.auth().createCustomToken(firebaseUser.uid, {
      role: user.role,
      email: user.email,
    });

    res.json({ firebaseToken });
  } catch (error) {
    console.error("Erreur génération token Firebase:", error);
    res.status(500).json({ message: "Erreur lors de la génération du token Firebase." });
  }
});

// Mettre à jour le profil de l'utilisateur connecté
router.patch("/profile", auth, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const updates = {};
    let firebaseDisplayName = null;

    if (name) {
      // Si name contient un espace, séparer en nom et prenom
      const nameParts = name.trim().split(" ");
      if (nameParts.length > 1) {
        updates.nom = nameParts[0];
        updates.prenom = nameParts.slice(1).join(" ");
      } else {
        updates.nom = nameParts[0];
        updates.prenom = nameParts[0];
      }
      firebaseDisplayName = name.trim();
    }

    if (phone) updates.telephone = phone;
    if (avatar) updates.avatar = avatar;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Aucune donnée à mettre à jour." });
    }

    updates.updated_at = new Date().toISOString();

    // 1. Mettre à jour dans Supabase
    const user = await userService.update(req.user.id, updates);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // 2. Synchroniser avec Firebase si Firebase Admin est disponible
    if (firebaseAdmin && user.email) {
      try {
        // Trouver l'utilisateur Firebase par email
        const firebaseUser = await firebaseAdmin.auth().getUserByEmail(user.email);
        
        const firebaseUpdates = {};
        if (firebaseDisplayName) {
          firebaseUpdates.displayName = firebaseDisplayName;
        }
        if (phone) {
          firebaseUpdates.phoneNumber = phone;
        }
        if (avatar) {
          firebaseUpdates.photoURL = avatar;
        }

        // Mettre à jour le profil Firebase si des modifications sont nécessaires
        if (Object.keys(firebaseUpdates).length > 0) {
          await firebaseAdmin.auth().updateUser(firebaseUser.uid, firebaseUpdates);
          console.log(`✅ Profil Firebase mis à jour pour ${user.email}`);
        }
      } catch (firebaseError) {
        // Ne pas bloquer la réponse si Firebase échoue, mais logger l'erreur
        console.warn(`⚠️  Erreur lors de la synchronisation Firebase: ${firebaseError.message}`);
        console.warn(`   L'utilisateur ${user.email} a peut-être été créé sans Firebase Auth`);
      }
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
