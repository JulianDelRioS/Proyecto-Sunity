import {
  IonContent,
  IonHeader,
  IonPage,
  IonInput,
  IonLabel,
  IonItem,
  IonButton,
  IonMenuButton,
  IonSelect,
  IonSelectOption,
  IonAvatar,
  IonIcon
} from '@ionic/react';
import { personOutline, mailOutline, callOutline, locationOutline, saveOutline, cameraOutline } from 'ionicons/icons';
import './Styles/Home.css';
import './Styles/Principal.css';
import './Styles/MiPerfil.css';

import { useHistory } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getProfile, updateProfile, uploadProfilePhoto  } from '../components/funciones';
import regionesJson from '../components/regiones.json';

interface RegionesData {
  [key: string]: string[];
}

const regionesData: RegionesData = regionesJson;

const MiPerfil: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<any>(null);
  const [extraData, setExtraData] = useState({ 
    telefono: "", 
    region: "", 
    comuna: "",
    foto: "" // Agregar campo para la foto
  });

  const regiones = Object.keys(regionesData);

  // Cargar perfil al iniciar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await getProfile();
        setUser(data.user);

        // Si el backend devuelve datos adicionales, rellenarlos
        setExtraData({
          telefono: data.user.telefono || "",
          region: data.user.region || "",
          comuna: data.user.comuna || "",
          foto: data.user.foto || ""
        });
      } catch (err) {
        history.push("/home");
      }
    };
    checkSession();
  }, [history]);

  // Manejo de cambios en inputs y selects
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setExtraData({ ...extraData, [name]: value });
  };

  // Manejar subida de foto
const handlePhotoUpload = async (event: any) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    // Creamos FormData para enviar el archivo
    const formData = new FormData();
    formData.append("file", file);

    // Llamamos al backend
    const data = await uploadProfilePhoto(formData); // espera que devuelva { ok, url, message }

    // Actualizamos la foto en el estado para previsualizar
    setExtraData({ ...extraData, foto: data.url });

    alert("Foto subida exitosamente");

  } catch (err: any) {
    console.error("Error subiendo foto:", err);
    alert("Error subiendo la foto: " + (err.message || err));
  }
};
  // Guardar datos en backend
  const handleSave = async () => {
    try {
      const result = await updateProfile(extraData);
      alert("Perfil actualizado correctamente");
      history.push("/principal"); // redirige a principal
    } catch (err: any) {
      alert("Error actualizando perfil: " + err.message);
    }
  };

  if (!user) {
    return <IonPage><IonContent>Verificando sesión...</IonContent></IonPage>;
  }

  return (
    <IonPage>
      <IonHeader></IonHeader>
      <IonContent id="main-content">
        <div className="home-center">


          <div className="perfil-container">

            {/* Sección de Foto de Perfil */}
            <div className="photo-section">
              <div className="avatar-container">
          <IonAvatar className="profile-avatar">
            {extraData.foto ? (
              <img src={`http://localhost:8000${extraData.foto}`} alt="Foto de perfil" />
            ) : (
              <IonIcon icon={personOutline} className="avatar-placeholder" />
            )}
          </IonAvatar>
                
                {/* Input oculto para subir archivos */}
                <input 
                  type="file" 
                  id="photo-upload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                
                {/* Botón para subir foto */}
                <IonButton 
                  fill="clear" 
                  className="photo-upload-button"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  <IonIcon icon={cameraOutline} slot="start" />
                  Subir Foto
                </IonButton>
              </div>
            </div>

            {/* Campos del formulario */}
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
                  <IonInput 
                    name="telefono"
                    value={extraData.telefono}
                    onIonChange={handleChange}
                    placeholder="Escribe tu teléfono..."
                    className="field-input"
                  />
                </IonItem>
              </div>

              {/* Región */}
              <div className="field-group">
                <IonLabel className="category-label">Región</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonIcon icon={locationOutline} className="field-icon" />
                  <IonSelect
                    name="region"
                    value={extraData.region}
                    placeholder="Selecciona tu región"
                    onIonChange={handleChange}
                    className="field-select"
                    interface="action-sheet"
                  >
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
                  <IonSelect
                    name="comuna"
                    value={extraData.comuna}
                    placeholder="Selecciona tu comuna"
                    onIonChange={handleChange}
                    disabled={!extraData.region}
                    className="field-select"
                    interface="action-sheet"
                  >
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