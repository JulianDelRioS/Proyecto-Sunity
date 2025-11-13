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
import Eventos from '../components/eventos';
import Chat from '../components/chat';
import ChatEvento from '../components/chatEvento'; 

const Principal: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('grupos');
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null);

  // Nuevo: estado para elegir tipo de chat
  const [chatType, setChatType] = useState<'general' | 'evento'>('general');

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
      <Hamburguesa user={user} contentId="main-content" />

      <IonContent id="main-content">
        <div className="home-center">
          <div className="title-menu-container">
          <h1>
            Sunity
            <img 
              src={Logo} 
              alt="Logo" 
              className="logo-icon" 
              onClick={() => handleTabChange('grupos')} 
              style={{ cursor: 'pointer' }}
            />
          </h1>

            <IonMenuButton className="custom-menu-button" />
          </div>
          
          <div className="white-container">
            {activeTab === 'grupos' && 
              <Grupos onVerEventos={(grupoId) => {
                setSelectedGrupoId(grupoId);
                handleTabChange('eventos');
              }} 
            />}

            {activeTab === 'Crear evento' && <CrearEvento />}
            {activeTab === 'horarios' && <CalendarioGigante />}
            {activeTab === 'eventos' && <Eventos grupoId={selectedGrupoId} />}

            
            {activeTab === 'chat' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
                  <IonButton
                    fill={chatType === 'general' ? 'solid' : 'outline'}
                    onClick={() => setChatType('general')}
                  >
                    Chat Amigos
                  </IonButton>
                  <IonButton
                    fill={chatType === 'evento' ? 'solid' : 'outline'}
                    onClick={() => setChatType('evento')}
                  >
                    Chat de eventos
                  </IonButton>
                </div>

                {chatType === 'general' ? <Chat /> : <ChatEvento />}
              </div>
            )}
          </div>
        </div>

        <NavigationBar activeTab={activeTab} onTabChange={handleTabChange} />
      </IonContent>
    </IonPage>
  );
};

export default Principal;
