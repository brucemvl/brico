require("dotenv").config();

const mongoose = require("mongoose");
const fetch = require("node-fetch");

const Request = require("./models/Request");
const User = require("./models/User");

const APPLY = process.argv.includes("--apply");

// Coordonnées des arrondissements de Paris
const PARIS_COORDINATES = {
  "Paris 1er": { latitude: 48.8626, longitude: 2.3363 },
  "Paris 2e": { latitude: 48.8685, longitude: 2.3427 },
  "Paris 3e": { latitude: 48.8637, longitude: 2.3615 },
  "Paris 4e": { latitude: 48.8543, longitude: 2.3574 },
  "Paris 5e": { latitude: 48.8448, longitude: 2.3471 },
  "Paris 6e": { latitude: 48.8499, longitude: 2.3329 },
  "Paris 7e": { latitude: 48.8561, longitude: 2.3126 },
  "Paris 8e": { latitude: 48.8770, longitude: 2.3174 },
  "Paris 9e": { latitude: 48.8760, longitude: 2.3375 },
  "Paris 10e": { latitude: 48.8761, longitude: 2.3601 },
  "Paris 11e": { latitude: 48.8594, longitude: 2.3787 },
  "Paris 12e": { latitude: 48.8402, longitude: 2.3876 },
  "Paris 13e": { latitude: 48.8322, longitude: 2.3556 },
  "Paris 14e": { latitude: 48.8331, longitude: 2.3264 },
  "Paris 15e": { latitude: 48.8421, longitude: 2.2987 },
  "Paris 16e": { latitude: 48.8638, longitude: 2.2769 },
  "Paris 17e": { latitude: 48.8845, longitude: 2.3224 },
  "Paris 18e": { latitude: 48.8925, longitude: 2.3444 },
  "Paris 19e": { latitude: 48.8875, longitude: 2.3848 },
  "Paris 20e": { latitude: 48.8632, longitude: 2.3986 },
};

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cache = new Map();

function hasAnyCoordinates(coords) {
  return (
    coords?.latitude != null ||
    coords?.longitude != null
  );
}

function hasValidCoordinates(coords) {
  return (
    Number.isFinite(coords?.latitude) &&
    Number.isFinite(coords?.longitude) &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

async function getCoordinates(location) {
  const match = String(location || "")
    .trim()
    .match(/^(.*?)\s*\(([^()]+)\)\s*$/);

  if (!match) {
    return null;
  }

  const cityName = match[1].trim();
  const departmentCode = match[2].trim();

  // Paris : coordonnées spécifiques aux arrondissements
  const paris = PARIS_COORDINATES[cityName];

  if (paris && departmentCode === "75") {
    return paris;
  }

  const cacheKey = normalize(cityName) + "|" + departmentCode;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const params = new URLSearchParams({
      nom: cityName,
      fields: "nom,departement,centre",
      format: "json",
      limit: "50",
    });

    const response = await fetch(
      `https://geo.api.gouv.fr/communes?${params}`
    );

    if (!response.ok) {
      throw new Error(`API géographique : ${response.status}`);
    }

    const cities = await response.json();

    const city = cities.find((item) => {
      return (
        normalize(item.nom) === normalize(cityName) &&
        item.departement?.code === departmentCode &&
        Array.isArray(item.centre?.coordinates) &&
        item.centre.coordinates.length === 2
      );
    });

    if (!city) {
      cache.set(cacheKey, null);
      return null;
    }

    const [longitude, latitude] = city.centre.coordinates;

    const coordinates = { latitude, longitude };

    cache.set(cacheKey, coordinates);

    // Petite pause pour éviter de solliciter excessivement l'API
    await new Promise((resolve) => setTimeout(resolve, 150));

    return coordinates;

  } catch (error) {
    console.error("Erreur géocodage :", location, error.message);
    return null;
  }
}

async function migrateCollection(Model, collectionName) {
  console.log(`\n========== ${collectionName} ==========`);

  const documents = await Model.find({
    location: { $type: "string", $ne: "" },
  })
    .select("_id location locationCoordinates")
    .lean();

  let updated = 0;
  let alreadyValid = 0;
  let partialCoordinates = 0;
  let notFound = 0;

  for (const doc of documents) {
    const coords = doc.locationCoordinates;

    if (hasValidCoordinates(coords)) {
      alreadyValid++;
      continue;
    }

    // Ne jamais écraser des coordonnées déjà présentes,
    // même si elles sont incomplètes ou invalides.
    if (hasAnyCoordinates(coords)) {
      partialCoordinates++;
      console.log("⚠️ Coordonnées existantes à vérifier :", doc.location);
      continue;
    }

    const newCoordinates = await getCoordinates(doc.location);

    if (!newCoordinates) {
      notFound++;
      console.log("❌ Adresse non reconnue :", doc.location);
      continue;
    }

    console.log(
      APPLY ? "💾 À enregistrer :" : "🔎 Simulation :",
      doc.location,
      newCoordinates
    );

    if (APPLY) {
      const result = await Model.updateOne(
  {
    _id: doc._id,
    $or: [
      { "locationCoordinates.latitude": { $exists: false } },
      { "locationCoordinates.latitude": null }
    ],
    $and: [
      {
        $or: [
          { "locationCoordinates.longitude": { $exists: false } },
          { "locationCoordinates.longitude": null }
        ]
      }
    ]
  },
  {
    $set: {
      locationCoordinates: newCoordinates
    }
  }
);

      if (result.modifiedCount === 1) {
        updated++;
      }
    } else {
      updated++;
    }
  }

  console.log(`\nBilan ${collectionName} :`);
  console.log("Coordonnées ajoutées ou à ajouter :", updated);
  console.log("Déjà correctement renseignées :", alreadyValid);
  console.log("Coordonnées partielles à vérifier :", partialCoordinates);
  console.log("Adresses non reconnues :", notFound);
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI absent du fichier .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log("✅ MongoDB connecté");

  console.log(
    APPLY
      ? "\n🚀 MODE MIGRATION RÉELLE"
      : "\n🔎 MODE SIMULATION : aucune modification"
  );

  await migrateCollection(Request, "DEMANDES");
  await migrateCollection(User, "UTILISATEURS");

  console.log("\n✅ Migration terminée");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("💥 Erreur migration :", error);

  await mongoose.disconnect();

  process.exitCode = 1;
});