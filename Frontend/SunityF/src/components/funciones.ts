// src/utils/auth.ts
export const logout = async (history: any) => {
  try {
    const res = await fetch("http://localhost:8000/logout", {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      history.push("/home"); // redirige a home
    }
  } catch (err) {
    console.error("Error cerrando sesión:", err);
  }
};

export const getProfile = async () => {
  try {
    const res = await fetch("http://localhost:8000/profile", {
      method: "GET",
      credentials: "include",
    });
    if (res.ok) {
      return await res.json();
    } else {
      throw new Error("No hay sesión activa");
    }
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    throw err;
  }
};
