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


        improvements.push("Ajouter une photo");

        action ??= {
            type: "edit_request",
            requestId: request._id,
            label: "Ajouter une photo"
        };

    } else {

            score += 15;

        strengths.push("Photo ajoutée");

    }

    if (request.analysis.shortDescription) {


        improvements.push("Description détaillée");

        action ??= {
            type: "edit_request",
            requestId: request._id,
            label: "Modifier la description"
        };

    } else {

        score += 10;
        strengths.push("Description complète");

    }

    if (request.analysis.noBudget) {


        improvements.push("Ajouter un budget");

        action ??= {
            type: "edit_request",
            requestId: request._id,
            label: "Ajouter un budget"
        };

    } else {

        score += 10;
        strengths.push("Budget renseigné");

    }

    if (request.analysis.hasPendingOffer) {

        improvements.unshift("Répondre à une proposition");

        action = {
            type: "conversation",
            requestId: request._id,
            label: "Voir les propositions"
        };
    score += 5;

    }
    

   if (request.analysis.hasUnreadMessages) {

    improvements.unshift(
        `${request.analysis.unreadMessages} message(s) attend(ent) votre réponse`
    );

    action = {
        type: "conversation",
        requestId: request._id,
        label: "Lire les messages"
    };

} else if (request.stats.messages > 0) {

    score += 5;

    strengths.push("Vous échangez régulièrement avec les artisans");

}

if (request.stats.conversations >= 3) {

    strengths.push(
        "Plusieurs artisans sont intéressés par votre demande"
    );
score += 5;
}

if (request.stats.views >= 20) {

    strengths.push(
        "Votre annonce attire beaucoup de professionnels"
    );
    score += 5;

}

if (request.stats.photos >= 3) {

    strengths.push(
        "Vos photos donnent confiance aux artisans"
    );



            score += 5;
}


if(request.stats.pendingOffers >= 3){

    strengths.push(

        "Vous pouvez comparer plusieurs artisans."

    );

    

}

    if (request.analysis.manyViewsNoMessages) {


        improvements.push("Rendre votre annonce plus attractive");
        score -= 15;

    }

    if (request.analysis.oldOpenRequest) {


        improvements.push("Actualiser votre annonce");
        score -= 10;

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

    return {

        score,

        level,

        title,

        subtitle:
            "Optimisez votre annonce pour recevoir davantage de propositions.",

        strengths,

        improvements,

        action

    };

}