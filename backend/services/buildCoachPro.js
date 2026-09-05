module.exports = function buildCoachPro(user) {

    let score = 0;

    const strengths = [];
    const improvements = [];

    const stats = {
        portfolioPhotos: user.portfolio?.length || 0,
        skills: user.skills?.length || 0,
        equipment: user.equipment?.length || 0,
        reviews: user.ratings?.length || 0,
        completedJobs: user.completedRequests?.length || 0,
        averageRating: user.averageRating || 0,
    };

    if (
    user.profileImage &&
    user.profileImage.public_id
) {
    score += 10;

    strengths.push({
        icon: "📷",
        title: "Photo de profil ajoutée",
        description: "Un profil avec photo obtient plus de réponses"
    });

} else {

    improvements.push({
        priority: 90,
        icon: "📷",
        title: "Ajoutez une photo",
        description: "Les clients font davantage confiance aux profils avec photo.",
        action: {
            type: "profile",
            label: "Ajouter une photo"
        }
    });

}

if (user.description?.trim()) {

    score += 10;

    strengths.push({
        icon: "📝",
        title: "Description complète",
        description: "Les clients peuvent mieux vous connaitre"
    });

} else {

    improvements.push({
        priority: 80,
        icon: "📝",
        title: "Présentez votre activité",
        description: "Expliquez votre expérience et vos spécialités.",
        action: {
            type: "profile",
            label: "Ajouter une description"
        }
    });

}

if (user.location) {

    score += 5;

    strengths.push({
        icon: "📍",
        title: "Localisation renseignée",
        description: "Les clients proches de chez vous pourront plus facilement vous trouver."
    });

} else {

    improvements.push({
        priority: 75,
        icon: "📍",
        title: "Ajoutez votre ville",
        description: "Les clients recherchent des artisans proches de chez eux.",
        action: {
            type: "profile",
            label: "Ajouter une ville"
        }
    });

}

if (user.phone) {

    score += 5;

    strengths.push({
        icon: "📞",
        title: "Téléphone renseigné",
        description: "Les clients auront accès a votre numero en cas d'accord"
    });

}

if (user.siret) {

    score += 10;

    strengths.push({
        icon: "🏢",
        title: "SIRET renseigné",
        description: "Vous obtenez le badge PRO"
    });

} else {

    improvements.push({
        priority: 60,
        icon: "🏢",
        title: "Ajoutez votre SIRET",
        description: "Cela renforce la confiance des clients.",
        action: {
            type: "profile",
            label: "Ajouter un SIRET"
        }
    });

}

if (stats.skills >= 3) {

    score += 10;

    strengths.push({
        icon: "🔧",
        title: "Compétences bien renseignées",
        description: "Vous recevrez en priorité les offres correspondant à vos compétences"
    });

} else {

    improvements.push({
        priority: 70,
        icon: "🔧",
        title: "Ajoutez vos compétences",
        description: "Vous apparaîtrez dans davantage de recherches.",
        action: {
            type: "profile",
            label: "Modifier les compétences"
        }
    });

}

if (stats.equipment >= 3) {

    score += 5;

    strengths.push({
        icon: "🧰",
        title: "Matériel renseigné",
        description: ""
    });

} else {

    improvements.push({
        priority: 65,
        icon: "🧰",
        title: "Ajoutez votre matériel",
        description: "Montrez aux clients que vous êtes bien équipé.",
        action: {
            type: "profile",
            label: "Modifier le matériel"
        }
    });

}

if (user.proBadge) {

    score += 5;

    strengths.push({
        icon: "✔️",
        title: "Profil vérifié"
    });

}

if((user.ratings?.length || 0) >= 5){

    score += 10;

    strengths.push({
        icon:"⭐",
        title:"Vous inspirez confiance",
        description: "Les clients notent vos prestations"
    });

}

if (stats.portfolioPhotos >= 6) {

    score += 10;

    strengths.push({
        icon: "🖼️",
        title: "Portfolio très complet",
        description: "Vous affichez l'etendue de vos travaux"
    });

} else if (stats.portfolioPhotos >= 3) {

    score += 5;

    strengths.push({
        icon: "🖼️",
        title: "Quelques réalisations publiées",
        description: "Vous affichez quelques travaux réalisés"
    });

} else {

    improvements.push({
        priority: 85,
        icon: "🖼️",
        title: "Ajoutez des réalisations",
        description: "Les clients choisissent plus facilement un artisan qui montre son travail.",
        action: {
            type: "profile",
            label: "Ajouter des photos"
        }
    });

}

if (stats.reviews >= 6) {

    score += 10;

    strengths.push({
        icon: "⭐",
        title: "De nombreux avis clients"
    });

}
else if (stats.reviews >= 3) {

    score += 5;

    strengths.push({
        icon: "⭐",
        title: "Vous avez déjà plusieurs avis"
    });

}
else {

    improvements.push({
        priority: 55,
        icon: "⭐",
        title: "Obtenez vos premiers avis",
        description: "Les avis rassurent énormément les nouveaux clients."
    });

}


if (stats.averageRating >= 4.8 && stats.reviews >= 3) {

    score += 10;

    strengths.push({
        icon: "🌟",
        title: "Excellente réputation",
        description: "Les clients sont satisfaits de votre travail"
    });

}
else if (stats.averageRating >= 4.5 && stats.reviews >= 3) {

    score += 5;

    strengths.push({
        icon: "👍",
        title: "Très bonnes évaluations"
    });

}


if (stats.completedJobs >= 10) {

    score += 10;

    strengths.push({
        icon: "🏡",
        title: "Beaucoup de chantiers réalisés"
    });

}
else if (stats.completedJobs >= 5) {

    score += 5;

    strengths.push({
        icon: "🏡",
        title: "Plusieurs réalisations terminées"
    });

}

score = Math.min(100, score);

improvements.sort((a, b) => b.priority - a.priority);

let level;

if (score >= 90)
    level = "Expert";
else if (score >= 75)
    level = "Très bon";
else if (score >= 60)
    level = "Bon";
else if (score >= 40)
    level = "À améliorer";
else
    level = "Débutant";

let title;

if (score >= 90)
    title = "Votre profil inspire confiance 🚀";
else if (score >= 75)
    title = "Votre profil est très attractif";
else if (score >= 60)
    title = "Encore quelques améliorations";
else
    title = "Complétez votre profil pour attirer plus de clients";

return {

    score,
    level,
    title,

    subtitle:
        "Un profil complet reçoit davantage de demandes.",

    strengths,
    improvements,
    action: improvements[0]?.action

};
}