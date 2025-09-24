import React, { useEffect } from "react";

const GOOGLE_CLIENT_ID =
  "542135659829-lokuuh6bdejhk6sass3bvglk355s65i8.apps.googleusercontent.com";

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleLogin() {
  useEffect(() => {
    // Crear el script para Google Identity Services
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById("g_id_signin"),
          {
            theme: "outline",
            size: "medium",
            width: 250,
            type: "standard",
          }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      // limpiar al desmontar
      const btn = document.getElementById("g_id_signin");
      if (btn) btn.innerHTML = "";
      document.body.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = async (response: any) => {
    const id_token = response.credential;
    console.log("ID Token de Google:", id_token);

    // Llamada al backend FastAPI
    try {
      const res = await fetch("http://localhost:8000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id_token }),
      });
      const data = await res.json();
      console.log("Respuesta del backend:", data);
    } catch (err) {
      console.error("Error enviando token al backend:", err);
    }
  };

  return <div id="g_id_signin" />;
}
