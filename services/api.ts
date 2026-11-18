import { useRouter } from "expo-router";
import { useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export const useApi = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useApi must be used within AuthProvider");

  const { user, logout, loading } = context;
  const router = useRouter();

  const token = user?.token ?? null;

  const API_BASE_URL = "http://192.168.1.11:5000/api";
  const MAMAN = "http://192.168.1.74:5000/api";
 // const RENDER = `https://brico-8fih.onrender.com/api${url}`

  const apiFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ) => {
    if (loading) {
      throw new Error("Authentification en cours de chargement");
    }

    if (!token) {
      throw new Error("Utilisateur non authentifié");
    }

    try {
      const res = await fetch(
        `https://brico-8fih.onrender.com/api${url}`,
        {
          ...options,
          headers: {
            ...(options.body instanceof FormData
              ? {}
              : { "Content-Type": "application/json" }),
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        }
      );

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.log("Réponse non JSON :", text);
        throw new Error("Réponse non JSON");
      }

      if (!res.ok) {
        throw new Error(
          data.error || data.message || "Une erreur est survenue"
        );
      }

      return data;
    } catch (err: any) {
      console.error("API ERROR:", err.message);
      throw err;
    }
  }, [token, loading]);

  return { apiFetch, logout, user, loading };
};