const userCache = require("../services/redis");

/*
 ! Ses fonctions doivents etre appelées dans un try/catch.
 * J'ai pas mit prisma car j'ai la flemme de faire les models,
 * Les requetes sont mises en commentaires, et remplacées par des objets.
*/

// * Créer un utilisateur dans la base de donnée et dans le cache.
async function createUser(user) {
    try {
        // On sauvegarde sur prisma (qui verifie si l'email est deja utilisé)
        const prismaUser = /* await prisma.users.create() */ {
            mail: user.mail,
            password: user.password, // Hashé
            name: user.name,
            verified: false // Le compte n'a pas encore été vérifier par mail.
        }

        // Si l'utilisateur à bien été créer, on le met dans le cache Redis
        if (prismaUser) saveUserInCache(prismaUser);
        return prismaUser;
    } catch (err) {
        throw err;
    }
}

// * Recupérer un utilisateur dans le cache ou en base de donnée via son id.
async function getUserById(id) {
    try {
        // On essaie de recupérer l'utilisateur dans le cache redis.
        let user = await userCache.get(`users:${id}`); 

        // Si l'utilisateur n'est pas dans le cache on essaie dans prisma.
        if (!user) {
            user = /* await prisma.users.findUnique({id}) */ {
                id: user.id,
                mail: user.mail,
                name: user.name,
                verified: user.verified
            };

            // Si l'utilisateur à été trouvé dans prisma, on l'ajoute dans le cache Redis.
            if (user) saveUserInCache(user);
        }
        return user;
    } catch (err) {
        throw {name: "UserNotFound", error: err};
    }
}

// * Recupérer un utilisateur dans le cache ou en base de donnée via son mail
async function getUserByMail(mail) {
    try {
        let id = await userCache.get(`users-mail:${mail}`); // On cherche l'id avec le mail
        if (id) return getUserById(id); // Si on trouve l'id, on recherche l'utilisateur avec.
    
        // Si l'utilisateur n'est pas dans le cache, on essaie dans prisma.
        const user = /* await prisma.users.findUnique({mail}) */ {
            id: 123,
            mail: "mail@gmail.com",
            name: "Jhon",
            verified: true
        };

        // Si l'utilisateur à été trouvé dans prisma, on l'ajoute dans le cache Redis.
        if (user) saveUserInCache(user);
        return user;
    } catch (err) {
        throw {name: "UserNotFound", error: err};
    }
}

// * Sauvegarder/Modifier un utilisateur en base de donnée et dans le cache.
async function saveUser(user) {
    try {
        const prismaUser = /* await prisma.users.update(user.id) */ {
            user
        };

        // Si l'utilisateur a été mis a jours dans prisma, on met a jour le cache Redis.
        if (prismaUser) saveUserInCache(prismaUser);
    } catch (err) {
        throw (err);
    }
}

// * Sauvegarder un utilisateur dans le cache Redis.
function saveUserInCache(user) {
    try {
        userCache.set(`users:${user.id}`, JSON.stringify(user)); // Pour pouvoir recuperer l'utilisateur dans le cache avec son id.
        userCache.set(`users-mail:${user.mail}`, user.id); // Pour pouvoir recuperer l'id de l'utilisateur grace au mail.
    } catch (err) {
        throw (err);
    }
}

module.exports = { createUser, getUserById, getUserByMail, saveUser, saveUserInCache };

