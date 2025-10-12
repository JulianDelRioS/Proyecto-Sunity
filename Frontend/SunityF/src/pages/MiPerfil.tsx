import {
  IonContent,
  IonHeader,
  IonPage,
  IonInput,
  IonLabel,
  IonItem,
  IonButton,
  IonAvatar,
  IonIcon,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { personOutline, mailOutline, callOutline, locationOutline, saveOutline, cameraOutline } from 'ionicons/icons';
import './Styles/Home.css';
import './Styles/Principal.css';
import './Styles/MiPerfil.css';

import { useHistory } from 'react-router-dom';
import { useEffect, useState } from 'react';
import regionesJson from '../components/regiones.json';

interface RegionesData {
  [key: string]: string[];
}
const regionesData: RegionesData = regionesJson;

const MiPerfil: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<any>({ name: '', email: '' });
  const [extraData, setExtraData] = useState({ 
    telefono: "", 
    region: "", 
    comuna: "",
    foto: "" 
  });

  const regiones = Object.keys(regionesData);

  // Función para llamar API individual
  const fetchField = async (endpoint: string) => {
    const res = await fetch(`http://localhost:8000/profile/${endpoint}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Error cargando " + endpoint);
    const data = await res.json();

    // Ajuste según lo que devuelve el backend
    if (endpoint === "foto") return data.foto_perfil || "";
    return data[endpoint] || "";
  };

  // Cargar todos los datos al iniciar
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Datos básicos (name, email)
        const res = await fetch('http://localhost:8000/profile', { credentials: 'include' });
        const basic = await res.json();
        setUser(basic.user);

        // Datos extra
        const foto = await fetchField("foto");
        const telefono = await fetchField("telefono");
        const region = await fetchField("region");
        const comuna = await fetchField("comuna");

        setExtraData({ foto, telefono, region, comuna });

      } catch (err) {
        console.error("Error cargando perfil:", err);
        history.push("/home");
      }
    };
    loadProfile();
  }, [history]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setExtraData({ ...extraData, [name]: value });
  };

  const handlePhotoUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/profile/upload-photo", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      const data = await res.json();
      if (data.ok) setExtraData({ ...extraData, foto: data.url });
      alert(data.message);
    } catch (err) {
      console.error(err);
      alert("Error subiendo la foto");
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch("http://localhost:8000/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extraData),
        credentials: "include"
      });
      const data = await res.json();
      if (data.ok) {
        alert(data.message);
        history.push("/principal");
      }
    } catch (err) {
      console.error(err);
      alert("Error actualizando perfil");
    }
  };

  return (
    <IonPage>
      <IonHeader></IonHeader>
      <IonContent id="main-content">
        <div className="home-center">
          <div className="perfil-container">

            {/* Foto de perfil */}
            <div className="photo-section">
              <IonAvatar className="profile-avatar">
                {extraData.foto ? (
                  <img src={`http://localhost:8000${extraData.foto}`} alt="Foto de perfil" />
                ) : (
                  <IonIcon icon={personOutline} className="avatar-placeholder" />
                )}
              </IonAvatar>
              
              <input 
                type="file" 
                id="photo-upload"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              
              <IonButton fill="clear" className="photo-upload-button" onClick={() => document.getElementById('photo-upload')?.click()}>
                <IonIcon icon={cameraOutline} slot="start" />
                Editar Foto
              </IonButton>
            </div>


            {/* Formulario */}
            <div className="form-fields-vertical">

              {/* Nombre */}
              <div className="field-group">
                <IonLabel className="category-label">Nombre</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonIcon icon={personOutline} className="field-icon" />
                  <IonInput value={user.name} readonly className="field-input" />
                </IonItem>
              </div>

              {/* Correo */}
              <div className="field-group">
                <IonLabel className="category-label">Correo</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonIcon icon={mailOutline} className="field-icon" />
                  <IonInput value={user.email} readonly className="field-input" />
                </IonItem>
              </div>

              {/* Teléfono */}
              <div className="field-group">
                <IonLabel className="category-label">Teléfono</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonIcon icon={callOutline} className="field-icon" />
                  <IonInput name="telefono" value={extraData.telefono} onIonChange={handleChange} placeholder="Escribe tu teléfono..." className="field-input" />
                </IonItem>
              </div>

              {/* Región */}
              <div className="field-group">
                <IonLabel className="category-label">Región</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonIcon icon={locationOutline} className="field-icon" />
                  <IonSelect name="region" value={extraData.region} placeholder="Selecciona tu región" onIonChange={handleChange} className="field-select" interface="action-sheet">
                    {regiones.map(region => (
                      <IonSelectOption key={region} value={region}>{region}</IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              </div>

              {/* Comuna */}
              <div className="field-group">
                <IonLabel className="category-label">Comuna</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonIcon icon={locationOutline} className="field-icon" />
                  <IonSelect name="comuna" value={extraData.comuna} placeholder="Selecciona tu comuna" onIonChange={handleChange} disabled={!extraData.region} className="field-select" interface="action-sheet">
                    {extraData.region && regionesData[extraData.region].map((comuna: string) => (
                      <IonSelectOption key={comuna} value={comuna}>{comuna}</IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              </div>

            </div>

            <IonButton expand="full" onClick={handleSave} className="save-button">
              <IonIcon icon={saveOutline} slot="start" />
              Guardar Perfil
            </IonButton>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MiPerfil;
