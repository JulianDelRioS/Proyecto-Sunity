// components/NavigationBar.tsx
import React from 'react';
import { IonButton } from '@ionic/react';
import './Styles/NavigationBar.css';

interface NavigationBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="navigation-bar">
      <IonButton 
        className={`nav-button ${activeTab === 'grupos' ? 'active' : ''}`}
        fill="clear"
        onClick={() => onTabChange('grupos')}
      >
        <div className="nav-button-content">
          <span className="nav-icon">👥</span>
          <span className="nav-label">Grupos</span>
        </div>
      </IonButton>

      <IonButton 
        className={`nav-button ${activeTab === 'Crear evento' ? 'active' : ''}`}
        fill="clear"
        onClick={() => onTabChange('Crear evento')}
      >
        <div className="nav-button-content">
          <span className="nav-icon">➕⚽</span>
          <span className="nav-label">Crear Evento</span>
        </div>
      </IonButton>

      <IonButton 
        className={`nav-button ${activeTab === 'horarios' ? 'active' : ''}`}
        fill="clear"
        onClick={() => onTabChange('horarios')}
      >
        <div className="nav-button-content">
          <span className="nav-icon">📅</span>
          <span className="nav-label">Mis horarios</span>
        </div>
      </IonButton>

      {/* Nuevo botón para Chat */}
      <IonButton 
        className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
        fill="clear"
        onClick={() => onTabChange('chat')}
      >
        <div className="nav-button-content">
          <span className="nav-icon">💬</span>
          <span className="nav-label">Chat</span>
        </div>
      </IonButton>
    </div>
  );
};

export default NavigationBar;
