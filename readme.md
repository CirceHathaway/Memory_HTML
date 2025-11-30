## 🧩 **Juego de Memoria Emoji**
Un juego de memoria interactivo, progresivo y totalmente responsivo desarrollado con tecnologías web modernas. Funciona como una **PWA (Progressive Web App)**, lo que permite instalarlo en dispositivos móviles y de escritorio, además de jugar sin conexión a internet.

## ✨ **Características Principales**
- **10 Niveles de Dificultad:** La dificultad aumenta progresivamente, añadiendo más cartas y columnas.
- **2 Modos de Juego:**
   - 👤 Solo: Juega contra el reloj y tus propios movimientos. Intenta entrar en el Top 5 mundial.
   - ⚔️ 1 vs 1: Multijugador local por turnos. Incluye sistema de puntajes y combos (x3) por aciertos consecutivos.
- **Diseño Adaptable (Responsive):**
   - Escritorio: Diseño panorámico fijo, aprovechando el ancho de la pantalla.
   - Móvil: Diseño vertical con desplazamiento (scroll) y optimizado para pantallas táctiles (máximo 4 columnas).
- **Récords Globales:** Integración con **Firebase Firestore** para guardar y mostrar los mejores tiempos a nivel mundial en tiempo real.
- **Soporte Offline (PWA):** Gracias al Service Worker, el juego se puede instalar y jugar sin conexión a internet (los récords se guardan localmente y se sincronizan luego).
- **Efectos Visuales:** Animaciones de volteo 3D, confeti de celebración y transiciones suaves.

## 🛠️ **Tecnologías Utilizadas**
- **HTML5:** Estructura semántica.
- **CSS3 / Tailwind CSS:** Estilos modernos, gradientes y diseño Grid/Flexbox.
- **JavaScript (ES6+):** Lógica del juego modular.
- **Firebase:** Autenticación anónima y base de datos Firestore.
- **PWA:** `manifest.json` y `Service Workers` para instalabilidad y caché.

## 🚀 **Instalación y Uso**
Para ejecutar este proyecto en tu computadora local:

1. Descargar los archivos: Asegúrate de tener los siguientes archivos en una misma carpeta:
   - `index.html`
   - `index.css`
   - `funcionalidad.js`
   - `manifest.json`
   - `sw.js`
   - `icon.png` (Tu imagen del logo)

2. **Servidor Local:** Debido a que el proyecto utiliza Módulos de JS (type="module") y Service Workers, no funcionará si abres el archivo `index.html` con doble clic. Necesitas un servidor local.

3. **Configurar Firebase:** Abre el archivo `funcionalidad.js` y busca la sección de configuración. Reemplaza el objeto `firebaseConfig` con tus propias credenciales de Firebase Console.

## 🎮 **Cómo Jugar**

**Modo Solo**
1. Haz clic en "Jugar" y selecciona "Solo".
2. Encuentra todos los pares de emojis en el menor tiempo posible.
3. Al finalizar el nivel 10, si tu tiempo es lo suficientemente bueno, podrás guardar tu nombre en el ranking mundial.

**Modo 1 vs 1**
1. Haz clic en "Jugar" y selecciona "1 vs 1".
2. Ingresa el nombre del **Jugador 1** y del **Jugador 2**.
3. El juego indicará a quién le toca el turno.
4. **Reglas:**
   - Cada acierto suma 10 puntos.
   - Si aciertas, mantienes el turno.
   - Si aciertas 5 veces seguidas, ¡tus puntos se triplican!
   - Gana quien tenga más niveles ganados al final del juego. (En caso de empate, define el puntaje total).

## 📂 **Estructura del Proyecto**
```text
📁 JuegoEmoji/
├── 📄 index.html        # Estructura principal y maquetación
├── 📄 index.css         # Estilos, animaciones y media queries
├── 📄 funcionalidad.js  # Lógica del juego, Firebase y control del DOM
├── 📄 manifest.json     # Metadatos para instalar la App
├── 📄 sw.js             # Service Worker para funcionamiento Offline
└── 🖼️ icon.png          # Icono de la aplicación 
```
## 📱 **Instalación en Móvil (Android/iOS)**
1. Sube tu carpeta a un hosting seguro (HTTPS) como GitHub Pages o Vercel.
2. Abre el enlace en tu celular.
3. Toca el botón "⬇️ Instalar App" en el menú principal (o ve a las opciones del navegador -> "Agregar a pantalla de inicio").
4. ¡El juego aparecerá como una app nativa en tu menú!