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
import { personOutline, mailOutline, callOutline, locationOutline, saveOutline } from 'ionicons/icons';
import './Styles/Home.css';
import './Styles/Principal.css';
import Logo from "../components/Imagenes/logo.png";
import { useHistory } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../components/funciones';
import regionesJson from '../components/regiones.json';

interface RegionesData {
  [key: string]: string[];
}

const regionesData: RegionesData = regionesJson;

const MiPerfil: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<any>(null);
  const [extraData, setExtraData] = useState({ telefono: "", region: "", comuna: "" });

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
          comuna: data.user.comuna || ""
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
          <div className="title-menu-container">
            <h1>
              Mi Perfil
              <img src={Logo} alt="Logo" className="logo-icon" />
            </h1>
          </div>

          <div className="white-container">

            {/* Foto de perfil */}
            <div className="avatar-section">
              <IonAvatar className="profile-avatar">
                <img src={user.picture || "/default-avatar.png"} alt="Foto de perfil" />
              </IonAvatar>
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
