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

// Nueva función para actualizar el perfil
export const updateProfile = async (data: { telefono: string; region: string; comuna: string }) => {
  try {
    const res = await fetch("http://localhost:8000/profile/update", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      throw new Error(result.detail || "Error actualizando perfil");
    }
    return result;
  } catch (err) {
    console.error("Error actualizando perfil:", err);
    throw err;
  }
}

// funciones.ts
export const uploadProfilePhoto = async (formData: FormData) => {
  const response = await fetch("http://localhost:8000/profile/upload-photo", {
    method: "POST",
    body: formData,
    credentials: "include", // importante para enviar cookies
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Error subiendo foto");
  }

  return await response.json(); // { ok, message, url }
};

;
