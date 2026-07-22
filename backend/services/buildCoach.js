module.exports = function buildCoach(requests) {

    let score = 100;

    const strengths = [];
    const improvements = [];

    let action = null;

    const openRequests = requests.filter(r => r.status === "open");

    if (openRequests.length === 0) {

        return {
            score: 100,
            level: "Excellent",

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

        score -= 25;

        improvements.push("Ajouter une photo");

        action ??= {
            type: "edit_request",
            requestId: request._id,
            label: "Ajouter une photo"
        };

    } else {

        strengths.push("Photo ajoutée");

    }

    if (request.analysis.shortDescription) {

        score -= 15;

        improvements.push("Description détaillée");

        action ??= {
            type: "edit_request",
            requestId: request._id,
            label: "Modifier la description"
        };

    } else {

        strengths.push("Description complète");

    }

    if (request.analysis.noBudget) {

        score -= 20;

        improvements.push("Ajouter un budget");

        action ??= {
            type: "edit_request",
            requestId: request._id,
            label: "Ajouter un budget"
        };

    } else {

        strengths.push("Budget renseigné");

    }

    if (request.analysis.hasPendingOffer) {

        improvements.unshift("Répondre à une proposition");

        action = {
            type: "conversation",
            requestId: request._id,
            label: "Voir les propositions"
        };

    }

    if (request.analysis.manyViewsNoMessages) {

        score -= 15;

        improvements.push("Rendre votre annonce plus attractive");

    }

    if (request.analysis.oldOpenRequest) {

        score -= 10;

        improvements.push("Actualiser votre annonce");

    }

    score = Math.max(score, 10);

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

    return {

        score,

        level,

        title:
            score >= 75
                ? "Votre annonce est bien optimisée"
                : "Quelques améliorations sont possibles",

        subtitle:
            "Optimisez votre annonce pour recevoir davantage de propositions.",

        strengths,

        improvements,

        action

    };

}