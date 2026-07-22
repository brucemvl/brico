const DAY = 1000 * 60 * 60 * 24;

function buildAdvices(requests, user) {

    const advices = [];

    // Première demande
    if (requests.length === 0) {
        advices.push({
            type: "first_request",
            priority: 100,
            icon: "🚀",
            title: "Publiez votre première demande",
            description:
                "Décrivez votre besoin pour recevoir rapidement des propositions d'artisans."
        });

        return advices;
    }

    for (const request of requests) {

        // Photo
        if(request.analysis.noPhoto){
            advices.push({
                type: "photo",
                priority: 90,
                icon: "📷",
                title: "Ajoutez une photo",
                description:
                    "Les demandes avec photo reçoivent en moyenne deux fois plus de propositions."
            });
        }

        // Budget
        if (
            request.status === "open" &&
            (!request.budget || request.budget <= 0)
        ) {
            advices.push({
                type: "budget",
                priority: 85,
                icon: "💰",
                title: "Ajoutez un budget",
                description:
                    "Les artisans répondent plus rapidement lorsqu'un budget est indiqué."
            });
        }

        // Description
        if (
            request.status === "open" &&
            (!request.description || request.description.trim().length < 30)
        ) {
            advices.push({
                type: "description",
                priority: 80,
                icon: "📍",
                title: "Décrivez davantage votre besoin",
                description:
                    "Quelques détails supplémentaires permettent d'obtenir des devis plus précis."
            });
        }

        // Beaucoup de vues
        if (
            request.status === "open" &&
            request.views >= 15 &&
            request.offers.length === 0
        ) {
            advices.push({
                type: "views",
                priority: 75,
                icon: "👀",
                title: "Votre demande intéresse",
                description:
                    "Elle a été consultée plusieurs fois. Essayez d'ajouter une photo ou quelques précisions."
            });
        }

        // Vieille annonce
        const age =
            (Date.now() - new Date(request.createdAt).getTime()) / DAY;

        if (
            request.status === "open" &&
            age >= 10
        ) {
            advices.push({
                type: "refresh",
                priority: 70,
                icon: "🔄",
                title: "Remettez votre annonce en avant",
                description:
                    "Modifier légèrement votre demande lui redonne de la visibilité."
            });
        }

        // Offre reçue
        if (request.stats.unreadMessages > 0) {
            advices.push({
                type: "offer",
                priority: 95,
                icon: "💬",
                title: "Vous avez un message",
                description:
                    "Un artisan attend votre réponse."
            });
        }

        // Avis
        if (
            request.status === "completed" &&
            !request.ratingGiven
        ) {
            advices.push({
                type: "review",
                priority: 99,
                icon: "⭐",
                title: "Laissez un avis",
                description:
                    "Vous pourrez ainsi cloturer la mission et aider les meilleurs artisans à se démarquer."
            });
        }

    }

    // Premier chantier terminé
    if (user.completedRequests?.length === 1) {
        advices.push({
            type: "first_completed",
            priority: 60,
            icon: "🏆",
            title: "Premier chantier terminé",
            description:
                "Félicitations ! Merci de faire confiance à Briconnect."
        });
    }

    // Tout est parfait
    if (advices.length === 0) {
        advices.push({
            type: "perfect",
            priority: 0,
            icon: "👏",
            title: "Tout est parfait",
            description:
                "Votre profil et vos demandes sont bien renseignés."
        });
    }

    // Supprime les doublons
    const unique = [];

    advices.forEach(a => {
        if (!unique.find(x => x.type === a.type)) {
            unique.push(a);
        }
    });

    return unique
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3);

}

module.exports = {
    buildAdvices
};