const Redis = require("ioredis");


/*
? EXPLICATION DE REDIS (Et de la mise en cache):

    Redis est une base de données non relationnel (NoSQL).
    Contrairement a d'autre base de données (MySQL, MongoDB), qui stoque les données sur le disque,
    Redis, stoque les données dans la RAM, ce qui rend toutes les données non persistantes,
    c'est a dire qu'en cas de redemarrage, ou apres un certains temps, les données sont supprimées.

    * Redis est donc principalement utilisé pour de la mise en cache des données.

    ? Lorsque l'on envoie une requete une base de données classique (MySQL, MongoDB, ...),
    Voici ce qu'il ce passe:

        - On envoie de la requete par le réseaux (du serveur vers la base de données): 
        [Temps: depend de la latence de la connexion (si la base de données n'est pas sur le meme serveur)]

        - Ensuite la base de données lit / ecrit les données sur le disque: 
        [Temps: depend de la base de données (nombre/taille de données) et de la vitesse du disque (entre 50 et 250 Mbit/s)]

        - Puis elle filtre des données (Si on ne selectionne que certaine colone par exemple)
        [Temps: Casiment instantané mais peut prendre un peut de temps en cas de (tres rare) gros traitement]

        - Envoie des données par le réseaux (Base de données vers le serveur),
        [Temps: depend de la latence de la connexion (si la base de données n'est pas sur le meme serveur) et de la puissance du réseaux (en Mbit/s)


    * Il faut imaginé que toutes ses etapes sont répétées a chaque requete,
    * bien que les base de données sont optimisés pour limité la consommation et la latence
    * si plusieurs utilisateurs utilise l'application en meme temps, les performences seront impactés.

    C'est là que la mise en cache (via Redis) entre en jeux.
    Redis va reduire un maximum la partie lecture et ecriture sur le disque (partie la plus lourde en consommation),
    il va stoquer les données directement dans la RAM,
    C'est un peut comme si on mettais nos données dans une variables (exemple: "let user = {}"),
    la vitesse est donc casiment instanée.

    L'idée est donc de stoquer dans Redis, les données qui sont tres frequemment utilisé,
    et les données des utilisateurs actuellement connectés a l'application.
*/

// On créer un acces a la base de donnée redis.
const userCache = new Redis({
    port: 6379, // Port par defaut.
    host: "127.0.0.1", // Address de redis.
    username: "default", // Nom de l'utilisateur.
    password: "my-top-secret", // Mot de passe de l'utilisateur.
    db: 0, // Numéro de la base de donnée à utiliser.
});

// (Optionnel) On peut créer d'autres instances de redis, si l'on souhaite séparer les bases de données.
const autreCache = new Redis({
    port: 6379,
    host: "127.0.0.1",
    username: "default",
    password: "my-top-secret",
    db: 1, // Autre numero de la base de donnée à utiliser.
});

/*
 ? Par defaut, Redis à 16 "sous" base de données,
 Cela peut etre utile si on souhaite séparer les type de données à sauvegardées
 (par exemple: 
    - db: 0 => Pour stoquer les utilisateurs, 
    - db: 1 => Pour stoquer les derniers postes (qui sont afficher sur une page d'accueil)
 )*/

module.exports = userCache;