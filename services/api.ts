import { useRouter } from "expo-router";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export const useApi = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useApi must be used within AuthProvider");

const { user, logout, loading } = context; // 🔹 récupérer ici
const router = useRouter()
  const token = user?.token ?? null;
  const API_BASE_URL = "http://192.168.1.11:5000/api";
  const MAMAN = "http://192.168.1.74:5000/api";



  const apiFetch = async (url: string, options: RequestInit = {}) => {
    console.log("API CALL:", url);
    if (loading) {
    // attend que le contexte charge user
    await new Promise(resolve => setTimeout(resolve, 50));
    return apiFetch(url, options); // retry
  }

  if (!token) {
    throw new Error("Utilisateur non authentifié");
  }

    try {
      const res = await fetch(`http://192.168.1.11:5000/api${url}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Réponse non JSON" };
      }

      if (res.status === 401) {
  await logout();
  router.replace("/login");
  return; // ne throw plus d’erreur, le router s’occupe de tout
}

      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur API");
      }

      return data;
    } catch (err: any) {
      console.error("API ERROR:", err.message);
      throw new Error(err.message || "Erreur inconnue");
    }
  };

  return { apiFetch, logout, user, loading };
};