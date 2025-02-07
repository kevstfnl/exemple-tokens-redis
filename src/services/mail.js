const mailer = require('nodemailer');
const MAIL = process.env.EMAIL; // Mail de l'envoyant

// * Ici on configure le service mail (de celui qui envoie les mails)
const transporter = mailer.createTransport({
    host: 'smtp.gmail.com', // Varie selon le serveur mail utilisé (gmail, outlook, ...)
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
        user: MAIL, // Mail de l'envoyant
        pass: process.env.EMAIL_PASSWORD // Mot de passe du mail de l'envoyant
    },
});

// * Fonction pour envoie un mail a un utilisateur.
function sendMail(user, subject, content) {
    
    // Ici on configure les options du mail en lui meme (information de l'envoyant, mail du receveur, sujet, contenue)
    const mailOptions = {
        from: `"Mission locale d'aubagne" <${MAIL}>`, // Nom de l'envoyant (oui on peut mettre n'importe quoi :p).
        to: user.mail, // Mail de l'utilisateur a qui on envoie le mail.
        subject: subject, // Sujet / Objet du mail.
        text: 'Voici votre access au dashboard de votre entreprise.', // Texte / Contenue du mail (visible uniquement si il n'y a pas de html)
        html: "<h1>Un super mail !</h1>" // Si on veux faire un disign (j'explique tout en bas comment faire)
    }

    // Ici on envoie le mail avec toutes les options
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) return console.error('Erreur:', err);
        console.log('Email envoyé: ', info.response);
    });
}

module.exports = sendMail;


/*
* Pour le disign des mails:

    Pour les pages html par mail, les technologie n'ont pas evolué depuis 10 ans (en moyenne selon les services mail) !
    Ça veux dire que pour le style, pas de flex, pas de grid, et beaucoup de propriétés css en moins.

    En temps normal on ne peut meme pas utilisé de balise <style> a l'interrieur ni meme utiliser de fichier .css externe.
    Pour le style il faut faire du inline (exemple: <h1 style="background-color: red;">Un super mail !</h1>)

    Pour la disposition des elements pas le choix il faut utilisé les <table>.
    Mais pour le style il y a une petite astuce (pour ne pas a avoir faire du inline),
    Il y a une librairie NodeJS qui s'appelle juice, qui permet de transformer une balise <style> en inline (mais pas de fichier css externe !)

    Il est tout de meme possible d'utiliser des templates de mail avec twig ou ejs
    (j'ai mit un exemple de template de mail dans "template/mail.html.twig");
*/