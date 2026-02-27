import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export const useApi = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useApi must be used within AuthProvider");

  const { user } = context;
  const token = user?.token ?? null;

  const apiFetch = async (url: string, options: RequestInit = {}) => {
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

      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur API");
      }

      return data;
    } catch (err: any) {
      console.error("API ERROR:", err.message);
      throw new Error(err.message || "Erreur inconnue");
    }
  };

  return { apiFetch };
};