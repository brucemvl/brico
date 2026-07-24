module.exports = function buildCoach(requests) {

    let score = 50;

    const strengths = [];
const improvements = [];

let action = null;

   

    const openRequests = requests.filter(r => r.status === "open");

    if (openRequests.length === 0) {

        return {
            score: 0,
            level: "Bienvenue",

            title: "Bienvenue 👋",

            subtitle:
                "Publiez votre première demande pour commencer.",

            strengths: [],

            improvements: ["Créer une demande"],

            action: {
                type: "create_request",
                label: "Créer une demande"
            }
        };

    }

    const request = openRequests[0];


    if (request.analysis.noPhoto) {

    improvements.push({
        priority: 90,
        icon: "📷",
        title: "Ajoutez une photo",
        description: "Les demandes avec photo reçoivent beaucoup plus de réponses.",
        action: {
            type: "edit_request",
            requestId: request._id,
            label: "Ajouter une photo"
        }
    });

    action ??= improvements[improvements.length - 1].action;

} else {

    score += 15;

    strengths.push({
        icon: "📷",
        text: "Photo ajoutée"
    });

}

    if (request.analysis.shortDescription) {

    improvements.push({
        priority: 80,
        icon: "📝",
        title: "Décrivez davantage votre besoin",
        description: "Plus votre demande est précise, plus les artisans répondent.",
        action: {
            type: "edit_request",
            requestId: request._id,
            label: "Modifier la description"
        }
    });

    action ??= improvements[improvements.length - 1].action;

} else {

    score += 10;

    strengths.push({
        icon: "📝",
        text: "Description complète"
    });

}


    if (request.analysis.noBudget) {

    improvements.push({
        priority: 70,
        icon: "💰",
        title: "Ajoutez un budget",
        description: "Un budget aide les artisans à proposer une offre adaptée.",
        action: {
            type: "edit_request",
            requestId: request._id,
            label: "Ajouter un budget"
        }
    });

    action ??= improvements[improvements.length - 1].action;

} else {

    score += 10;

    strengths.push({
        icon: "💰",
        text: "Budget renseigné"
    });

}


    if (request.analysis.hasPendingOffer) {

    score += 5;

    improvements.push({
        priority: 100,
        icon: "🤝",
        title: "Vous avez une proposition",
        description: "Un artisan attend votre réponse.",
        action: {
            type: "conversation",
            requestId: request._id,
            label: "Voir les propositions"
        }
    });

    action = improvements[improvements.length - 1].action;

}
    

   if (request.analysis.hasUnreadMessages) {

    improvements.push({
        priority: 95,
        icon: "💬",
        title: `${request.analysis.unreadMessages} message(s) non lu(s)`,
        description: "Un artisan attend votre réponse.",
        action: {
            type: "conversation",
            requestId: request._id,
            label: "Lire les messages"
        }
    });

    action = improvements[improvements.length - 1].action;

} else if (request.stats.messages > 0) {

    score += 5;

    strengths.push({
        icon: "💬",
        text: "Vous échangez régulièrement avec les artisans"
    });

}


if (request.stats.conversations >= 3) {

    score += 5;

    strengths.push({
        icon: "👷",
        text: "Plusieurs artisans sont intéressés"
    });

}

if (request.stats.views >= 20) {

    score += 5;

    strengths.push({
        icon: "🔥",
        text: "Votre annonce attire beaucoup de professionnels"
    });

}

if (request.stats.photos >= 3) {

    score += 5;

    strengths.push({
        icon: "✨",
        text: "Vos photos donnent confiance aux artisans"
    });

}


if (request.stats.pendingOffers >= 3) {

    score += 5;

    strengths.push({
        icon: "⚖️",
        text: "Vous pouvez comparer plusieurs artisans"
    });

}


   if (request.analysis.manyViewsNoMessages) {

    score -= 15;

    improvements.push({
        priority: 60,
        icon: "📉",
        title: "Votre annonce n'attire pas encore",
        description: "Essayez d'ajouter des photos ou de préciser votre besoin."
    });

}

    if (request.analysis.oldOpenRequest) {

    score -= 10;

    improvements.push({
        priority: 50,
        icon: "⏰",
        title: "Actualisez votre annonce",
        description: "Une annonce récente remonte davantage dans les résultats."
    });

}

    score = Math.max(0, Math.min(score, 100));

    let level;

    if (score >= 90)
        level = "Excellent";
    else if (score >= 75)
        level = "Très bon";
    else if (score >= 60)
        level = "Correct";
    else if (score >= 40)
        level = "À améliorer";
    else
        level = "Faible";

    let title;

if(score >= 90){
    title = "Votre annonce est excellente 🚀";
}
else if(score >= 75){
    title = "Votre annonce est bien optimisée";
}
else if(score >= 60){
    title = "Encore quelques ajustements";
}
else{
    title = "Votre annonce mérite un petit coup de pouce";
}

const uniqueStrengths = [...new Set(strengths)];
const uniqueImprovements = [...new Set(improvements)];

improvements.sort((a, b) => b.priority - a.priority);

    return {

        score,

        level,

        title,

        subtitle:
            "Optimisez votre annonce pour recevoir davantage de propositions.",

        uniqueStrengths,

        uniqueImprovements,

        action

    };

}