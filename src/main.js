const express = require("express");
const userRouter = require("./routers/userRouter");
require('dotenv').config();

/*
! Je vous conseille d'utiliser l'extention VSCode: "Better Comments"
! pour que les commentaires soit plus """lisible"""

* Dependances a installer via "npm install":
    - express
    - cors
    - nodemailer (twig et juice si on fait un disign pour les mails)
    - jsonwebtoken
    - prisma
    - ioredis
    - bcrypt
*/

const app = express();
app.use(express.json()); // Pour utilisé le format json.
app.use(express.urlencoded({ extended: true })); // Pour pouvoir recupérer les données de formulaire.
// ! (Ne pas oublié CORS, et d'autre middleware pour que l'app soit utilisable...)

// * Les routes
app.use(userRouter);



// * 404 comme dernière route
app.use((req, res) => {
    res.status(404).json({message: "Page non trouvé"});
})

// * On demarre le serveur
app.listen(3000, (err) => {
    if (err) return console.error(err);
    console.log("Server is running at port: 3000");
});
