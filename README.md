Propósito del Proyecto:

El objetivo principal de Sunity es combatir el sedentarismo y la dificultad de organización deportiva entre los estudiantes universitarios . Busca ser una herramienta tecnológica que fomente la práctica deportiva , promueva hábitos deportivos y fortalezca la integración social dentro de la comunidad universitaria, facilitando la coordinación de eventos .

Tecnologías Utilizadas:

El proyecto es una aplicación web (plataforma web) diseñada para funcionar como una red social estudiantil universitario . Las tecnologías clave son:

API de Autenticación de Google: La aplicacion gestiona el acceso y la identidad de los usuarios federando el inicio de sesión. Esto se cumple en el requisito funcional RF-01, que especifica que los usuarios deben poder acceder a la aplicación utilizando sus cuentas de correo de Google .

API de Google Maps: Para cumplir con la funcionalidad de geolocalización de eventos, La aplicacion utiliza el servicio de mapas de Google. Esto permite generar un mapa dentro de cada evento deportivo para facilitar la ubicación y la referencia de dónde se realizará la actividad .

React: Se utiliza la biblioteca JavaScript React para la construcción de la interfaz de usuario, permitiendo crear componentes reutilizables y gestionar el estado de la aplicación.

Ionic Framework: Se emplea Ionic para asegurar que la aplicación web funcione y se visualice correctamente.

FastApi: Para el desarrollo del backend de la aplicacion se utilizo FastApi, un framework de Python que permite crear APIs Rest.

WebSocket: La aplicacion utiliza WebSocket para el chat en tiempo real entre usuarios dentro de un evento, tanto como para "amigos" dentro de la aplicacion.



Principales Funcionalidades:

Las funcionalidades principales permiten al usuario:

Autenticacion de Usuarios: Iniciar sesión con Google dentro de la aplicacion con su respectiva cuenta.

Gestión de Perfil: Crear y editar un perfil de usuario (nombre, foto, número de telefono, deportes de interés, etc) .

Gestión de Eventos: Crear eventos deportivos, categorizar los eventos por grupos (tipo de deporte) y unirse o abandonar eventos que tengan cupos disponibles .

Interacción Social: Visualizar la lista de participantes de un evento , gestionar una lista de amigos (enviar, recibir y eliminar solicitudes) , y valorar a otros usuarios con los que se ha compartido un evento.

Chat entre usuarios: Chat en tiempo real entre usuarios.


Grupo 4: Julian Gabriel Del Rio Suarez 21.255.861-3
         Cristobal Alonso Reyes Lucero 19.925.277-1

