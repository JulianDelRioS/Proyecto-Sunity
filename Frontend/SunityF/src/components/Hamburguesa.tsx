import { IonMenu, IonToolbar, IonContent, IonList, IonItem, IonIcon, IonTitle } from '@ionic/react';
import { logOutOutline, peopleOutline, informationCircleOutline, personOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { logout } from './funciones';
import './Hamburguesa.css'; // Archivo CSS separado para mejor organización

interface HamburguesaProps {
  user: any;
  contentId: string;
}

const Hamburguesa: React.FC<HamburguesaProps> = ({ user, contentId }) => {
  const history = useHistory();

  return (
    <IonMenu side="end" contentId={contentId} className="hamburguesa-content">
  <IonToolbar className="hamburguesa-header">
    <div className="hamburguesa-user-info">
      <div className="hamburguesa-user-avatar">
        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
      </div>
      <div className="hamburguesa-user-details">
        <IonTitle className="hamburguesa-user-name">{user.name || 'Usuario'}</IonTitle>
        <span className="hamburguesa-user-email">{user.email || ''}</span>
      </div>
    </div>
  </IonToolbar>

  <IonContent className="hamburguesa-content-inner">
    <IonList lines="none" className="hamburguesa-list">
      <IonItem button onClick={() => history.push('/Mi Perfil')} className="hamburguesa-item hamburguesa-profile-item" detail={false}>
        <IonIcon icon={personOutline} slot="start" className="hamburguesa-icon hamburguesa-profile-icon" />
        <div className="hamburguesa-text"><span>Mi Perfil</span></div>
      </IonItem>

      <IonItem button onClick={() => history.push('/Amigos')} className="hamburguesa-item hamburguesa-friends-item" detail={false}>
        <IonIcon icon={peopleOutline} slot="start" className="hamburguesa-icon hamburguesa-friends-icon" />
        <div className="hamburguesa-text"><span>Amigos</span></div>
      </IonItem>

      <IonItem button onClick={() => history.push('/Informacion')} className="hamburguesa-item hamburguesa-info-item" detail={false}>
        <IonIcon icon={informationCircleOutline} slot="start" className="hamburguesa-icon hamburguesa-info-icon" />
        <div className="hamburguesa-text"><span>Información</span></div>
      </IonItem>

      <div className="hamburguesa-divider"></div>

      <IonItem button onClick={() => logout(history)} className="hamburguesa-item hamburguesa-logout-item" detail={false}>
        <IonIcon icon={logOutOutline} slot="start" className="hamburguesa-icon hamburguesa-logout-icon" />
        <div className="hamburguesa-text"><span>Cerrar Sesión</span></div>
      </IonItem>
    </IonList>
  </IonContent>
</IonMenu>

  );
};

export default Hamburguesa;