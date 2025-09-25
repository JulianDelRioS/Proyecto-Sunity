import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Styles/Home.css';
import GoogleLogin from "../components/GoogleLogin";
import Logo from "../components/Imagenes/logo.png";

const Home: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
      </IonHeader>
      <IonContent fullscreen className="home-content">
        {/* Botón de Google Login */}
        <div className="home-center">
          <h1>
            Sunity
            <img src={Logo} alt="Logo" className="logo-icon" />
          </h1>
          <GoogleLogin />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
