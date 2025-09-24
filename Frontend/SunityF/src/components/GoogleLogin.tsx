import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom"; // <-- useHistory para v5

const GOOGLE_CLIENT_ID =
  "542135659829-lokuuh6bdejhk6sass3bvglk355s65i8.apps.googleusercontent.com";

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleLogin() {
  const [user, setUser] = useState<any>(null);
  const history = useHistory(); // <-- historial para redirigir

  useEffect(() => {
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

    checkSession(); // Verificar sesión activa

    return () => {
      const btn = document.getElementById("g_id_signin");
      if (btn) btn.innerHTML = "";
      document.body.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = async (response: any) => {
    const id_token = response.credential;

    try {
      const res = await fetch("http://localhost:8000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id_token }),
      });

      const data = await res.json();

      if (data.ok) {
        setUser(data.user);
        history.push("/principal"); // <-- redirige después del login
      }
    } catch (err) {
      console.error("Error enviando token al backend:", err);
    }
  };
  

  const checkSession = async () => {
    try {
      const res = await fetch("http://localhost:8000/profile", {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        history.push("/principal"); // <-- redirige si ya hay sesión
      }
    } catch (err) {
      console.log("No hay sesión activa");
    }
  };

  return (
    <div>
      <div id="g_id_signin" />
    </div>
  );
}
