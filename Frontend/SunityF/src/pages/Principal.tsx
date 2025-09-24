import { IonContent, IonHeader, IonPage, IonButton } from '@ionic/react';
import './Home.css';
import Logo from "../components/Imagenes/logo.png";
import { useHistory } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { logout, getProfile } from '../components/funciones'; // 👈 importamos funciones

const Principal: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<any>(null);

  // Verificar sesión al cargar la página
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await getProfile();
        setUser(data.user);
      } catch (err) {
        history.push("/home"); // si no hay sesión, redirige a home
      }
    };
    checkSession();
  }, [history]);

  // Mientras se verifica la sesión, podemos mostrar un mensaje
  if (!user) {
    return <IonPage><IonContent>Verificando sesión...</IonContent></IonPage>;
  }

  return (
    <IonPage>
      <IonHeader></IonHeader>
      <IonContent fullscreen className="home-content">
        <div className="home-center">
          <h1>
            Sunity
            <img src={Logo} alt="Logo" className="logo-icon" />
          </h1>
          <p>Bienvenido, {user.name}</p>
          <IonButton onClick={() => logout(history)} color="danger">
            Cerrar Sesión
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Principal;
