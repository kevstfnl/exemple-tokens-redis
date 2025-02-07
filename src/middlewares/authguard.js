const jwt = require("jsonwebtoken");
const userCache = require("../services/redis");
const { getUserById } = require("../controllers/userController");

/*
 * Middleware pour vérifier que l'utilisateur est bien connecté.
   Fonctionne uniquement en multi-service (backend et frontend séparer),
   en monoblock, on vérifie directement l'access token dans la session ou les cookies
   (et non pas dans le req.headers['authorization'] comme ici);
*/

async function authguard(req, res, next) {
    // On verifie qu'il y a bien un token dans le header de la requète
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ message: "Le token d'acces est manquant !" });
    const token = authHeader.split(' ')[1]; // On enlève de "Bearer " pour n'avoir que le token

    try {
        // On verifie la validité du token
        const data = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_KEY, // On oublie pas la clef de déchiffrement
        );
        const id = data.id; // On recupère l'id de l'utilisateur dans le token.
        let user = await getUserById(id); // On essaie de recupérer l'utilisateur en base de données.

        // Si l'utilisateur n'existe pas en base de donnée ou n'a pas vérifier son mail -> erreur
        if (!user.verified) throw { name: "UserNotVerified"};
        
        req.user = user; // On met l'utilisateur dans req.user pour pouvoir le recupérer ensuite plus facilement.
        next(); // Utilisateur authentifié et verifié, on peut passé au middleware suivant ! <3
        return; 

    } catch (err) {
        // Erreur si l'utilisateur n'existe pas.
        if (err.name === "UserNotFound") {
            // L'utilisateur n'existe pas on peut rediriger vers la home page
            res.status(402).json({ message: "Utilisateur inconnue" });
            return;
        }

        // Erreur si l'utilisateur n'est pas verifier.
        if (err.name === "UserNotVerified") {
            // On peut le rediriger vers la page verification de mail (ex: "Veuillez vérifier votre email !")
            // Si on veut ce faire chier on peut regenerer un token et envoyé un nouveaux mail (voir route /register) 
            res.status(403).json({ message: "Utilisateur non vérifié" });
            return;
        }

        // Si le token à expiré
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ message: "Token d'acces expiré" }); // Le status 401 est important.
            return;
        }
        res.status(401).json({ message: "Token d'acces invalide" }); // Le status 401 est important.
        return;
    }
}

/*
====================================================================================================================

    ! CÔTÉ FRONTEND:

    * Il faudra inclure dans le header de chaque requete necessitant d'etre authentifié:
    * 'Authorization': `Bearer ${token}`.

    Si lors d'une requetes, le status de la reponse est 401, cela signifie que la session (accessToken) a expiré.
    Il faudra alors regénerer un token d'acces grace au refresh token,

    le refresh token est censé etre sauvegardé à la connexion (route "/login") dans les cookies,
    avec un delai d'expiration si l'utilisateur n'a pas coché la case "Resté connecté".

    Dans le cas où le refresh token est disponible,
    il faudra appeller la route "/refresh" avec le refresh token,
    si celui-ci est valide, la reponse sera un nouvel token d'acces qu'il faudra utiliser dans les prochaines requetes

    Dans le cas contraire, l'utilisateur devra ce reconnecter.

====================================================================================================================
*/


module.exports = authguard;