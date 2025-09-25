import { IonContent, IonHeader, IonPage, IonButton, IonMenuButton } from '@ionic/react';
import './Styles/Home.css';
import './Styles/Principal.css';
import Logo from "../components/Imagenes/logo.png";
import { useHistory } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {getProfile } from '../components/funciones';
import Hamburguesa from '../components/Hamburguesa';

const Principal: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await getProfile();
        setUser(data.user);
      } catch (err) {
        history.push("/home");
      }
    };
    checkSession();
  }, [history]);

  if (!user) {
    return <IonPage><IonContent>Verificando sesión...</IonContent></IonPage>;
  }

  return (
    <IonPage>

      {/* MENÚ HAMBURGUESA IMPORTADO */}
      <Hamburguesa user={user} contentId="main-content" />

      <IonHeader></IonHeader>

      <IonContent id="main-content">
        <div className="home-center">
          {/* H1 y botón de menú juntos */}
          <div className="title-menu-container">
            <h1>
              Sunity
              <img src={Logo} alt="Logo" className="logo-icon" />
            </h1>
            <IonMenuButton className="custom-menu-button" />
          </div>
          
          <div className="white-container">
            {/* Contenido dentro del contenedor */}
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Principal;
