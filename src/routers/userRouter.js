const authguard = require("../middlewares/authguard");
const { createUser, getUserById, saveUser, getUserByMail } = require("../controllers/userController");
const userRouter = require("express").Router();

/* 
===========================================================================================================================================

* PARTIE: CREATION DE COMPTE

===========================================================================================================================================
*/

// * Route pour la creation de compte utilisateur.
userRouter.post("/register", async (req, res) => {
    const { name, mail, password } = req.body;
    
    // ! Verifications (password = confirm, regex, ect...)

    try {
        // On créer un utilisateur en base de données (voir "controllers/userController.js")
        const user = await createUser({ name, mail, password });

        // Si l'utilisateur à bien été créer en base de données.
        if (user) {
            /* 
             * On génère un token temporaire (avec "JsonWebToken"), 
             * il s'agit simplement d'un objet{} chiffré et transformé en chaine de caractères,
             * on pourra verifier ça validité plus tard. 
            */
            const token = jwt.sign(
                { id: user.id }, // L'objet que l'on souhaite chiffré
                process.env.MAIL_TOKEN_KEY, // La clef secrète de chiffrement / dechiffrement
                { expiresIn: "15m" } // Options supplémentaires (utile en l'occurence pour le delai avant expiration du token)
            );

            // On envoie un mail à l'utilisateur, dans lequelle il y aura un lien,
            // qui redirigera vers une route de validation qui contiendra le token.
            sendMail(user, "Confirmation d'inscrition", {
                url: `localhost:3000/register/confirmation/${token}` // Le liens cliquable dans le mail vers la route avec le token
            });

            /*
            ? EXPLICATIONS:
                Pour validé le compte, on aura besoin de son id (pour le recuperer en base de données, ...),
                cependant, mettre un lien de validation avec l'id en brute (exemple: "localhost:3000/register/confirmation/456")
                est dangereux, car il est facile pour un attaquant, d'essayer de valider un compte avec des ids aléatoires,
                qui ne serait pas le siens et pourrait posé des problemes a l'avenir.

                C'est pour cela qu'on chiffre (avec JsonWebToken) l'id afin que le liens reste confidentiel, mais aussi temporaire.
            */

            res.json({ message: "Mail envoyé" });
            return;
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// * Route qui permet de confirmer l'inscription (lien venant d'un mail)
userRouter.get("/register/confirmation/:token", async (req, res) => {
    const token = req.params.token; // On recupère le token dans le liens.

    try {
        // On verifie, si le token est valie et si il n'est pas expiré.
        const data = jwt.verify(
            token, // Le token recupéré dans l'url,
            process.env.MAIL_TOKEN_KEY, // La clef de chiffrement / déchiffrement.
        );
        const id = data.id; // On recupère l'id dans le token (car le token stoque un objet, il faut faire attention au noms).
        const user = await getUserById(id); // On cherche l'utilisateur dans la base de données via sont id.

        // Si l'utilisateur à été trouvé et qu'il n'avais pas encore vérifié sont compte.
        if (user && !user.verified) {
            // On valide la verification et on le sauvegarde en base de données
            user.verified = true;
            await saveUser(user);

            // On redirige l'utilisateur vers la page login.
            res.json({ message: "Compte vérifié" });
            return;
        }
        throw { message: "Utilisateur introuvable ou deja vérifié" };
    } catch (err) {
        // On redirige à l'accueil.
        res.status(500).json({ message: err.message });
    }
});



/* 
===========================================================================================================================================

* PARTIE: CONNEXION

===========================================================================================================================================
*/

// * Route pour authentifier un utilisateur.
userRouter.post("/login", async (req, res) => {
    const { mail, password } = req.body;
    // ! Verifications (regex, ect...)

    try {
        const user = await getUserByMail(mail); // On recherche l'utilisateur en base de données via sont email.

        // ! Verification du mot de passe avec bcrypt

        if (!user.verified) throw { message: "Vous n'avez pas validé votre email" };

        // ! Setup authguard (validation d'authentication)
        // On créer un token d'access qui servira à verifier dans le authguard si l'utilisateur est connecté (voir "middlewares/authguard.js").
        const accessToken = jwt.sign(
            { id: user.id }, // On y stoque l'id de l'utilisateur
            process.env.ACCESS_TOKEN_KEY, // La clef de chiffrement / dechiffrement
            { expiresIn: "15m" } // Durée de validité
        );

        // On créer un token de rafraichissement qui servira à regenerer un token d'acces quand il aura expiré.
        const refreshToken = jwt.sign(
            { id: user.id }, // On y stoque l'id de l'utilisateur
            process.env.REFRESH_TOKEN_KEY, // La clef de chiffrement / dechiffrement
            // On peut ou non mettre une expiration (plus longue)
        );

        // On envoie les tokens a l'utilisateurs
        res.json({
            accessToken,
            refreshToken
        });
        return;

        /*
        ! Côté frontend, il faudra inclure, l'access token dans header "authorization: Bearer {token}"
        ! et dans le cas où il a coché la case resté connecté, stoquer le refreshToken dans un cookie,
        ! sinon stoquer le refreshToken dans la session (pour que l'utilisateur ne soit pas deconnecté pendant ça session)
        */
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


/* 
===========================================================================================================================================

* PARTIE: MOT DE PASSE OUBLIÉ

===========================================================================================================================================
*/

// * Route qui envoie une requete de changement de mot de passe.
userRouter.post("/forgot", async (req, res) => {
    const { mail } = req.body;
    // ! Verifications (regex, ect...)

    try {
        const user = await getUserByMail(mail);

        if (user && user.verified) {
            // On créer un token (obligatoire car un attaquant pourrait tres facilement voler le compte en chageant le mot de passe).
            const token = jwt.sign(
                { id: user.id }, // On stoque l'id de l'utilisateur
                process.env.MAIL_TOKEN_KEY, // La clef de chiffrement / dechiffrement
                { expiresIn: "5m" } // Token valable durant 5 minutes
            );

            // On envoie le mail avec la route et le token
            sendMail(user, "Changement de mot de passe", {
                url: `localhost:3000/forgot/confirmation/${token}` // Le liens cliquable dans le mail avec le token
            });

            res.json({ message: "Mail envoyé" });
        }
        throw { message: "Compte non vérifié" };
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// * Route qui confirme la demande de changement de mot de passe et redirige vers le formulaire.
userRouter.get("/forgot/confirmation/:token", async (req, res) => {
    const token = req.params.token;

    try {
        // On verifie la validité du token
        const data = jwt.verify(
            token, // Le token dans l'url
            process.env.MAIL_TOKEN_KEY, // La clef de chiffrement / dechiffrement
        );
        const id = data.id; // On recupère l'id dans le token
        const user = await getUserById(id); // On cherche l'utilisateur en base de données

        // Si l'utilisateur à bien été trouvé et que le compte est vérifié.
        if (user && user.verified) {

            // Redirection vers le formulaire de changement de mot de passe en incluant le token
            res.json({
                message: "ok",
                token: token // ! Transmetre le token chiffré et non pas en claire
            });
            return;
        }
        throw { message: "Compte non vérifié" };
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// * Route qui recupère le formulaire avec le nouveaux mot de passe
userRouter.post("/forgot/confirmation/:token", async (req, res) => {
    const { password, confirmPassword } = req.body
    const token = req.params.token;
    // ! Verifications (password = confirm, regex, ect...)

    try {
        // On verifie la validité du token
        const data = jwt.verify(
            token, // Le token dans l'url
            process.env.MAIL_TOKEN_KEY, // La clef de chiffrement / dechiffrement
        );

        const id = data.id; // On recupère l'id dans le token
        const user = await getUserById(id); // On cherche l'utilisateur en base de données

        // Si l'utilisateur à bien été trouvé et que le compte est vérifié.
        if (user && user.verified) {
            user.password = password; // On hash et modifie le mot de passe.
            await saveUser(user); // On sauvegarde en base de donné
            res.json({ message: "Mot de passe modifié" });
            return;
        }
        throw { message: "Compte non vérifié" };
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* 
===========================================================================================================================================

* PARTIE: ROUTE SECURISÉ (Qui necessite l'authentication de l'utilisateur)

===========================================================================================================================================
*/

// * Route sécurisé grace au authguard
userRouter.post("/route-secure", authguard, async (req, res) => {
    const user = req.user; // On peut recupérer l'utilisateur facilement !
    res.json({message: "ok"});
});

// * Si la session utilisateur à expiré (voir "middlewares/authguard.js") route pour rafraichir la session
app.post("/refresh", (req, res) => {
    const { refreshToken } = req.body;

    try {
        // On verifie le refresh token
        const data = jwt.verify(
            refreshToken, // Le token
            process.env.REFRESH_TOKEN_KEY, // La clef de déchiffrement
        )

        // On regenère un token d'acces
        const accessToken = jwt.sign(
            { id: data.id }, // On y stoque l'id de l'utilisateur
            process.env.ACCESS_TOKEN_KEY, // La clef de chiffrement / dechiffrement
            { expiresIn: "15m" } // Durée de validité
        );

        // On l'envoie à l'utilisateur qui devra l'inclure dans le header 'Authorization': `Bearer ${token}`.
        res.json({token: accessToken});
    } catch (err) {
        res.status(403).json({ message: 'Refresh token invalide' });
        return;
    }
});


module.exports = userRouter;