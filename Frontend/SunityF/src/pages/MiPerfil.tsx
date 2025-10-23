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
  IonSelectOption,
  IonTextarea
} from '@ionic/react';
import { personOutline, mailOutline, callOutline, locationOutline, saveOutline, cameraOutline } from 'ionicons/icons';
import './Styles/Home.css';
import './Styles/Principal.css';
import './Styles/MiPerfil.css';
import universidadesJson from '../components/Universidades.json';
import carrerasJson from '../components/Carreras.json';

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
    foto: "",
    edad: "",
    deporte_favorito: "",
    descripcion: "",
    universidad_o_instituto: "",  // NUEVO
    carrera: ""                  // NUEVO
  });

  const regiones = Object.keys(regionesData);

  // Función para llamar API individual
  const fetchField = async (endpoint: string) => {
    const res = await fetch(`http://localhost:8000/profile/${endpoint}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Error cargando " + endpoint);
    const data = await res.json();

    switch(endpoint) {
      case "foto": return data.foto_perfil || "";
      case "deporte": return data.deporte_favorito || "";
      case "descripcion": return data.descripcion || "";
      default: return data[endpoint] || "";
    }
  };
  
  useEffect(() => {
    setUniversidades(universidadesJson.universidades.map((u: any) => u.nombre));
    setCarreras(carrerasJson.carreras);
  }, []);

  // Cargar todos los datos al iniciar
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('http://localhost:8000/profile', { credentials: 'include' });
        const basic = await res.json();
        setUser(basic.user);

        const fields = ["foto", "telefono", "region", "comuna", "edad", "deporte", "descripcion"];
        const loaded: any = {};
        for (const f of fields) {
          loaded[f === "deporte" ? "deporte_favorito" : f] = await fetchField(f);
        }
      // Universidad / Instituto
      const universidadRes = await fetch('http://localhost:8000/profile/universidad', {
        credentials: 'include'
      });
      if (universidadRes.ok) {
        const uniData = await universidadRes.json();
        loaded.universidad_o_instituto = uniData.universidad_o_instituto || "";
      }

      // Carrera
      const carreraRes = await fetchField("carrera");
      loaded.carrera = carreraRes;

      setExtraData(loaded);

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
  const [universidades, setUniversidades] = useState<string[]>([]);
  const [carreras, setCarreras] = useState<string[]>([]);

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

              {/* Edad */}
              <div className="field-group">
                <IonLabel className="category-label">Edad</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonInput name="edad" type="number" value={extraData.edad} onIonChange={handleChange} placeholder="Escribe tu edad..." className="field-input" />
                </IonItem>
              </div>

              {/* Deporte favorito */}
              <div className="field-group">
                <IonLabel className="category-label">Deporte favorito</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonSelect
                    name="deporte_favorito"
                    value={extraData.deporte_favorito}
                    placeholder="Selecciona tu deporte favorito..."
                    onIonChange={handleChange}
                    className="field-select"
                    interface="action-sheet"
                  >
                    <IonSelectOption value="Fútbol">Fútbol</IonSelectOption>
                    <IonSelectOption value="Básquetbol">Básquetbol</IonSelectOption>
                    <IonSelectOption value="Running">Running</IonSelectOption>
                    <IonSelectOption value="Padel">Padel</IonSelectOption>
                    <IonSelectOption value="Voleibol">Voleibol</IonSelectOption>
                    <IonSelectOption value="Tenis">Tenis</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </div>


              {/* Descripción */}
              <div className="field-group">
                <IonLabel className="category-label">Descripción</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonTextarea name="descripcion" value={extraData.descripcion} onIonChange={handleChange} placeholder="Escribe una breve descripción..." className="field-input" />
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
              {/* Universidad / Instituto */}
              <div className="field-group">
                <IonLabel className="category-label">Universidad / Instituto</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonSelect
                    name="universidad_o_instituto"
                    value={extraData.universidad_o_instituto}
                    placeholder="Selecciona tu universidad o instituto"
                    onIonChange={handleChange}
                    className="field-select"
                    interface="action-sheet"
                  >
                    {universidades.map((uni) => (
                      <IonSelectOption key={uni} value={uni}>{uni}</IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              </div>

              {/* Carrera */}
              <div className="field-group">
                <IonLabel className="category-label">Carrera</IonLabel>
                <IonItem className="field-item" lines="none">
                  <IonSelect
                    name="carrera"
                    value={extraData.carrera}
                    placeholder="Selecciona tu carrera"
                    onIonChange={handleChange}
                    className="field-select"
                    interface="action-sheet"
                  >
                    {carreras.map((c) => (
                      <IonSelectOption key={c} value={c}>{c}</IonSelectOption>
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
