const DAY = 1000 * 60 * 60 * 24;

function buildAdvice(requests) {

  // 1. Aucun chantier
  if (requests.length === 0) {
    return {
      type: "first_request",
      icon: "🚀",
      title: "Première demande",
      description:
        "Publiez votre première demande pour recevoir des propositions d'artisans."
    };
  }

  // 2. Chantier terminé sans avis
  const review = requests.find(
    r => r.status === "completed" && !r.ratingGiven
  );

  if (review) {
    return {
      type: "review",
      icon: "⭐",
      title: "Laissez un avis",
      description:
        "Votre chantier est terminé. Donnez votre avis pour aider la communauté."
    };
  }

  // 3. Demande sans photo
  const noPhoto = requests.find(
    r =>
      r.status === "open" &&
      (!r.images || r.images.length === 0)
  );

  if (noPhoto) {
    return {
      type: "photo",
      icon: "📷",
      title: "Ajoutez une photo",
      description:
        "Les demandes avec photo reçoivent en moyenne deux fois plus de propositions."
    };
  }

  // 4. Sans budget
  const noBudget = requests.find(
    r =>
      r.status === "open" &&
      (!r.budget || r.budget <= 0)
  );

  if (noBudget) {
    return {
      type: "budget",
      icon: "💰",
      title: "Ajoutez un budget",
      description:
        "Les artisans répondent plus rapidement lorsqu'un budget est indiqué."
    };
  }

  // 5. Demande ancienne
  const oldRequest = requests.find(r => {
    if (r.status !== "open") return false;

    const age =
      (Date.now() - new Date(r.createdAt).getTime()) / DAY;

    return age >= 10;
  });

  if (oldRequest) {
    return {
      type: "refresh",
      icon: "🔄",
      title: "Relancez votre demande",
      description:
        "Modifiez votre annonce pour la remettre en avant auprès des artisans."
    };
  }

  // 6. Pas encore de devis
  const noOffer = requests.find(
    r =>
      r.status === "open" &&
      (!r.offers || r.offers.length === 0)
  );

  if (noOffer) {
    return {
      type: "patience",
      icon: "⏳",
      title: "Votre demande est en ligne",
      description:
        "Les artisans continuent de découvrir votre annonce."
    };
  }

  return {
    type: "success",
    icon: "👏",
    title: "Tout est parfait",
    description:
      "Votre profil et vos demandes sont bien renseignés."
  };
}

module.exports = {
  buildAdvice
};