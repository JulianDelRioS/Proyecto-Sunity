import React from 'react';
import { IonPage, IonContent} from '@ionic/react';
import './Styles/Informacion.css';
import './Styles/Principal.css';
import Logo from "../components/Imagenes/logo.png";
import { useHistory } from 'react-router-dom';


const Informacion: React.FC = () => {
  const history = useHistory(); //  Inicializar history
  return (
    <IonPage>
      <IonContent className="ion-padding home-content">
        <div className="title-menu-container">
          <h1>
            Sunity
            <img
              src={Logo}
              alt="Logo"
              className="logo-icon"
              onClick={() => history.push("/principal")} // ✅ Redirige a Principal
              style={{ cursor: "pointer" }} // ✅ Indicador visual de clic
            />
          </h1>
          
        </div>

        <div className="white-container">
          <div className="info-content">

            {/* Sección 1 */}
            <div className="info-section">
              <div className="section-header">
                <h2 className="section-title">Acerca de Sunity</h2>
                <div className="title-underline"></div>
              </div>
              
              <div className="content-grid">
                
                <div className="text-content">
                  <p className="intro-text">
                    Sunity es tu plataforma para conectar con personas que comparten tus intereses y pasiones deportivas. Ya sea que busques un grupo de fútbol, running, tenis, voleibol o pádel, Sunity te permite descubrir y unirte a actividades cerca de ti, facilitando la organización y participación en eventos deportivos y sociales.
                  </p>

                  <div className="mission-card">
                    <h3 className="card-title">Nuestra Misión</h3>
                    <p>
                      <strong>Promover la vida activa y la comunidad</strong>, ofreciendo una buena experiencia, donde cada usuario puede ver grupos, eventos o actividades y conectar con personas afines.
                    </p>
                  </div>

                  <div className="how-it-works">
                    <h3 className="section-subtitle">Cómo funciona Sunity</h3>
                    <ul className="feature-list">
                      <li className="feature-item">
                        <span className="feature-icon">🚀</span>
                        <div className="feature-text">
                          <strong>Registro fácil y rápido:</strong> Crea tu cuenta y personaliza tu perfil en pocos minutos.
                        </div>
                      </li>
                      <li className="feature-item">
                        <span className="feature-icon">🔍</span>
                        <div className="feature-text">
                          <strong>Explora y únete:</strong> Encuentra grupos deportivos o actividades que se ajusten a tus gustos y ubicación.
                        </div>
                      </li>
                      <li className="feature-item">
                        <span className="feature-icon">📅</span>
                        <div className="feature-text">
                          <strong>Publica tus propios eventos:</strong> Comparte actividades y encuentra participantes interesados cerca de ti.
                        </div>
                      </li>
                      <li className="feature-item">
                        <span className="feature-icon">💬</span>
                        <div className="feature-text">
                          <strong>Conecta con la comunidad:</strong> Con nuestro chat en tiempo real, coordina con otros usuarios para crear experiencias deportivas memorables.
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="benefits-grid">
                    <div className="benefit-card">
                      <h4 className="benefit-title">Seguridad y confianza</h4>
                      <p>Plataforma verificada para una experiencia segura</p>
                    </div>
                    <div className="benefit-card">
                      <h4 className="benefit-title">Variedad de deportes</h4>
                      <p>Amplia gama de actividades para todos los gustos</p>
                    </div>
                    <div className="benefit-card">
                      <h4 className="benefit-title">Diseño intuitivo</h4>
                      <p>Interfaz fácil de usar para todos los niveles</p>
                    </div>
                    <div className="benefit-card">
                      <h4 className="benefit-title">Comunidad activa</h4>
                      <p>Personas que comparten tus mismas pasiones</p>
                    </div>
                  </div>

                  <div className="vision-card">
                    <h3 className="card-title">Nuestra Visión</h3>
                    <p>
                      Convertirnos en la plataforma líder para la organización de actividades deportivas y sociales, fomentando la vida activa, la inclusión y la creación de comunidades alrededor del deporte y los intereses compartidos.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2 */}
            <div className="info-section">
              <div className="section-header">
                <h2 className="section-title">Deportes y Actividades</h2>
                <div className="title-underline"></div>
              </div>
              
              <div className="content-grid reverse">

                <div className="text-content">
                <p className="intro-text">
                  Ofrecemos una gran variedad de deportes para todos los gustos, desde fútbol, básquetbol, tenis, etc.
                </p>


                  <div className="purpose-card">
                    <h3 className="card-title">Propósito de Sunity</h3>
                    <p>
                      Sunity se presenta como una herramienta para aquellos estudiantes que quieran realizar deporte. La aplicación facilita la organización y gestión de encuentros deportivos, fomentando la socialización, promoviendo la salud y el bienestar entre los estudiantes.
                    </p>
                  </div>

                  <div className="community-section">
                    <h3 className="section-subtitle">Creando Comunidad</h3>
                    <p>
                      Además, Sunity busca crear una comunidad activa y conectada, donde los estudiantes puedan descubrir, unirse y coordinar actividades deportivas y recreativas de manera sencilla y segura.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        <div className="back-button-container">
          <div className="back-button" onClick={() => window.history.back()}>
            ← Volver
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Informacion;