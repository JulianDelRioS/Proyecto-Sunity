import { IonContent, IonHeader, IonPage, IonButton, IonMenuButton } from '@ionic/react';
import './Styles/Home.css';
import './Styles/Principal.css';
import Logo from "../components/Imagenes/logo.png";
import { useHistory } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getProfile } from '../components/funciones';
import Hamburguesa from '../components/Hamburguesa';
import NavigationBar from '../components/NavigationBar';
import Grupos from '../components/Grupos';
import CrearEvento from '../components/CrearEvento';
import CalendarioGigante from '../components/CalendarioGigante';
import Eventos from '../components/eventos'; // nuevo componente

const Principal: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('grupos');
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null);

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (!user) {
    return <IonPage><IonContent>Verificando sesión...</IonContent></IonPage>;
  }

  return (
    <IonPage>

      {/* MENÚ HAMBURGUESA IMPORTADO */}
      <Hamburguesa user={user} contentId="main-content" />

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
            {activeTab === 'grupos' && 
              <Grupos onVerEventos={(grupoId) => {
                setSelectedGrupoId(grupoId); // guardar grupo seleccionado
                handleTabChange('eventos');
              }} 
            />}
            {activeTab === 'Crear evento' && <CrearEvento />}
            {activeTab === 'horarios' && <CalendarioGigante />}

            {activeTab === 'eventos' && <Eventos grupoId={selectedGrupoId} />}
          </div>

        </div>

        {/* Barra de navegación inferior */}
        <NavigationBar activeTab={activeTab} onTabChange={handleTabChange} />
        
      </IonContent>

    </IonPage>
  );
};

export default Principal;
