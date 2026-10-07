# 🌸 Waifiu - Desktop Floating AI Companion ("Desktop Pet")

> Un asistente virtual de escritorio flotante, 100% transparente y reactivo, desarrollado con **Tauri v2**, **React 19**, **TypeScript** y **TailwindCSS**. Inspirado en el diseño oficial de **Yuzuki Nanase** (*Chitose-kun wa Ramune Bin no Naka*).

---

## ✨ Características Principales

### 1. 🪟 Transparencia Real y Estética de Escritorio
- **100% Transparente (`transparent: true`)**: Sin cajas negras fijas ni fondos opacos. Solo el personaje y los globos de diálogo flotan sobre tus ventanas.
- **Sin bordes (`decorations: false`)**: Libre de barras de título del sistema operativo.
- **Always on Top (`alwaysOnTop: true`)**: Permanece visible sobre tu editor de código, navegador o terminal (conmutable).
- **Arrastre Nativo (`data-tauri-drag-region`)**: Haz clic sostenido sobre el avatar para moverlo fluidamente por toda la pantalla.
- **Redimensionamiento integrado**: Tirador sutil en la esquina inferior derecha para ajustar el tamaño de la ventana.

### 2. 🎭 Sprites Reactivos y Sincronización Labial (*Lip Flap*)
Nanase reacciona en tiempo real a cada estado de interacción:
- **`idle`**: Expresión relajada, parpadeo periódico natural y animación suave de flotación.
- **`dragging` (`public/avatar-dragging.png`)**: Expresión enojada y tierna (*pout* con mejillas infladas, sonrojo y puños en alto) al arrastrarla por la pantalla.
- **`thinking` (`public/avatar-thinking.png`)**: Pose pensativa con el dedo índice en la mejilla y mirada curiosa mientras la IA procesa la respuesta.
- **`speaking`**: Modulación y movimiento de labios sincronizado token a token con la respuesta del modelo en streaming.
- **`error`**: Expresión apenada `(＞﹏＜)` ante problemas de red o conexión.

### 3. 💬 Globo de Diálogo Flotante (Estilo Novela Visual)
- **Modo reposo**: El diálogo se oculta automáticamente tras unos segundos de silencio, dejando solo una pequeña píldora discreta al pie (`💬 Hablar`) o el avatar limpio.
- **Apertura intuitiva**: Haz clic directo sobre el avatar para abrir el diálogo y platicar con ella.
- **Historial y respuesta rápida**: Puedes alternar entre la vista compacta de novela visual o el historial completo de mensajes anteriores.

### 4. 👀 Conciencia de Tareas en Pantalla (Comentarios Espontáneos)
- Nanase tiene "ojos" en tu entorno de trabajo: detecta la aplicación y título de la ventana enfocada (ej. editor de código, terminal, navegador, YouTube, Discord).
- **Motor Proactivo**: De forma periódica (configurable entre 3 y 20 minutos), Nanase genera un comentario breve, tierno o ingenioso sobre lo que estás haciendo o te recuerda tomar agua y descansar.

### 5. 🌐 Búsqueda Web en Vivo (DuckDuckGo RAG - 100% Gratis)
- Módulo nativo en Rust que consulta DuckDuckGo en tiempo real para obtener noticias, hechos recientes y documentación actualizada, sin requerir cuentas de paga ni facturación en Google Cloud.

### 6. 🧠 Pasarela Multi-Modelo con Fallback Automático
- **Google Gemini**: Soporte multi-modelo encadenado (ej: `gemini-3.1-flash-lite, gemini-3.8-flash, gemini-2.5-flash`), con reintento automático y auto-recuperación ante errores 400 o límites 429.
- **OpenAI / Claude / Baseten / Ollama**: Cadena de respaldo configurable con failover automático si el proveedor principal no responde en 6 segundos.

---

## 💻 Compatibilidad Multiplataforma

Waifiu está desarrollado sobre el núcleo multiplataforma de **Tauri v2** y es totalmente compatible tanto con **Linux** como con **Windows**.

### 🐧 Linux (Wayland / Hyprland / X11)
- **Compositor**: En compositores con desenfoque automático (como Hyprland u Omarchy), agrega estas reglas a tu configuración (`~/.config/hypr/looknfeel.conf` o `hyprland.conf`) para garantizar transparencia 100% limpia sin sombreados:
  ```ini
  windowrule = float on, match:title (?i).*waifiu.*
  windowrule = tag -default-opacity, match:title (?i).*waifiu.*
  windowrule = no_blur on, match:title (?i).*waifiu.*
  windowrule = no_dim on, match:title (?i).*waifiu.*
  windowrule = no_shadow on, match:title (?i).*waifiu.*
  windowrule = border_size 0, match:title (?i).*waifiu.*
  windowrule = opacity 1.0 1.0, match:title (?i).*waifiu.*
  ```
- **Detección de ventanas**: Utiliza el protocolo nativo de Hyprland (`hyprctl activewindow -j`).

### 🪟 Windows (Windows 10 / 11)
- **Transparencia Nativa**: Funciona directamente sobre **Microsoft Edge WebView2** (preinstalado en Windows 10/11) con transparencia completa y aceleración por GPU.
- **Detección de ventanas**: Implementada mediante PowerShell y la API Win32 `user32.dll::GetForegroundWindow()`, detectando procesos activos (`code.exe`, `chrome.exe`, etc.) sin requerir librerías C++ adicionales.

---

## 🚀 Requisitos e Instalación

### Requisitos Previos
1. **Node.js** (v18+) y **pnpm** (`npm install -g pnpm`).
2. **Rust & Cargo** (v1.75+): [Instalar Rust](https://rustup.rs/).
3. **Dependencias de sistema**:
   - **Linux**: Paquetes de desarrollo de WebKitGTK y Tauri (`libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, etc.).
   - **Windows**: Microsoft C++ Build Tools (incluido en Visual Studio Installer con la carga "Desarrollo para el escritorio con C++").

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/luisillo77D/waifiu.git
cd waifiu

# Instalar dependencias de Node
pnpm install
```

---

## 🛠️ Comandos de Ejecución

### Modo Desarrollo (con Hot Reload)
```bash
# Iniciar frontend Vite + ventana nativa Tauri en tiempo real (puerto 6767)
pnpm tauri dev
```

### Compilación para Producción (Build)
```bash
# Generar instalador y binario ejecutable para tu sistema operativo
pnpm tauri build
```
El instalador o ejecutable final se generará en:
- **Linux**: `src-tauri/target/release/bundle/deb/` o `appimage/`
- **Windows**: `src-tauri/target/release/bundle/msi/` o `nsis/` (`waifiu.exe`)

---

## ⚙️ Configuración del Asistente

Al abrir la ventana de ajustes desde el botón ⚙️ en el globo de diálogo:
1. **Proveedores**: Ingresa tu clave de API de **Google Gemini** (gratuita en Google AI Studio), OpenAI, Anthropic o la URL de tu instancia de **Ollama**.
2. **Búsqueda Web**: Activa la opción de DuckDuckGo para que busque información reciente en la web automáticamente.
3. **Comentarios Espontáneos**: Activa o desactiva si quieres que te hable de vez en cuando y ajusta la frecuencia (cada 3 a 20 minutos).
4. **Persona**: Personaliza el nombre o el prompt de sistema para adaptar su personalidad a tu gusto.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. ¡Siéntete libre de usarlo, bifurcarlo y personalizarlo a tu gusto!
