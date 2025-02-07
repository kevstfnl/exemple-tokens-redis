const jwt = require("jsonwebtoken");
const userCache = require("../services/redis");

/*
 * Middleware pour vérifier que l'utilisateur est bien connecté.
   Fonctionne uniquement en multi-service (backend et frontend séparer),
   en monoblock, on vérifie directement l'access token dans la session ou les cookies
   (et non pas dans le req.headers['authorization'] comme ici);
*/

async function authguard(req, res, next) {
    // On verifie qu'il y a bien un token dans le header de la requete
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ message: "Le token d'acces est manquant !" });
    const token = authHeader.split(' ')[1]; // On enlève de Bearer avant le token

    try {
        // On verifie la validité du token
        const data = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_KEY, // On oublie pas la clef de déchiffrement
        );
        const id = data.id; // On recupère l'id de l'utilisateur dans le token.
        let user = userCache.get(`users:${id}`); // On essaie de recupérer l'utilisateur dans le cache.

        // Si il n'est pas dans le cache on essaie avec prisma
        const isNotInCache = !user;
        if (isNotInCache) {
            user = /* await prisma.users.findUnique() */ {
                id: id,
                mail: "exemple@gmail.com",
                name: "Jhon",
                verified: true
            }
        }

        // Si l'utilisateur n'existe pas en base de donnée ou n'a pas vérifier son mail -> erreur
        if (!user) throw { name: "UserNotFound"};
        if (!user.verified) throw { name: "UserNotVerified"};
        
        req.user = user; // On met l'utilisateur dans req.user pour pouvoir le recupérer ensuite plus facilement

        // Si l'utilisateur n'est pas dans le cache, on le met (pour la prochaine verification dans l'authguard)
        if (isNotInCache) {
            userCache.set(`users:${user.id}`, JSON.stringify(user)); // users:id pour recuperer grace a l'id.
            userCache.set(`users-mail:${user.mail}`, user.id); // Pour pouvoir recuperer l'id de l'utilisateur grace au mail.
        }
        next(); // Utilisateur authentifié et verifier, on peut passé au middleware suivant ! <3
        return; 

    } catch (err) {
        // Erreur si l'utilisateur n'existe pas.
        if (err.name === 'UserNotFound') {
            // L'utilisateur n'existe pas on peut rediriger vers la home page
            res.status(402).json({ message: "Utilisateur inconnue" });
            return;
        }

        // Erreur si l'utilisateur n'est pas verifier.
        if (err.name === 'UserNotVerified') {
            // On peut le rediriger vers la page verification de mail (ex: "Veuillez vérifier votre email !")
            // Si on veut ce faire chier on peut regenerer un token et envoyé un nouveaux mail (voir route /register) 
            res.status(403).json({ message: "Utilisateur non vérifié" });
            return;
        }

        // Si le token à expiré
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ message: "Token d'acces expiré" });
            return;
        }
        res.status(401).json({ message: "Token d'acces invalide" });
        return;
    }
}

/*
====================================================================================================================

    ! CÔTÉ FRONTEND:

    * Il faudra inclure dans le header de chaque requete necessitant d'etre login:
    * 'Authorization': `Bearer ${token}`.

    Si lors d'une requetes, le status de la reponse est 401, cela signifie que la session a expirer.
    Il faudra alors regenerer un token d'access avec le refresh token,

    le refresh token est censé etre sauvegardé à la connexion (route "/login");
     - soit dans la memoire du navigateur de l'utilisateur,
     - soit dans le cas où il a coché la case "Restée connecté", dans les cookies.

    Dans le cas où le refresh token est disponible,
    il faudra l'envoié dans la route "/refresh" qui regenèrera, un nouvel access token

    Sinon, l'utilisateur doit se login.

====================================================================================================================
*/


module.exports = authguard;