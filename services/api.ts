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
    
    if (loading) {
    // attend que le contexte charge user
    await new Promise(resolve => setTimeout(resolve, 50));
    return apiFetch(url, options); // retry
  }

  if (!token) {
    throw new Error("Utilisateur non authentifié");
  }

    try {
      const res = await fetch(`https://brico-8fih.onrender.com/api${url}`, {
        
        ...options,
        headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
        
      });

const text = await res.text();

let data;

try {
  data = JSON.parse(text);
} catch (e) {
  console.log("Réponse non JSON :", text);
  throw new Error("Réponse non JSON");
}

if (!res.ok) {
  console.log("STATUS:", res.status);
  console.log("BODY:", text);
  throw new Error(text);
}

return data;
    } catch (err: any) {
      console.error("API ERROR:", err.message);
      
      throw new Error(err.message || "Erreur inconnue");
    }
  };

  return { apiFetch, logout, user, loading };
};