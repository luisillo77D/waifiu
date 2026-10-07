# Waifiu - Desktop Floating AI Companion ("Desktop Pet")

Asistente virtual de escritorio liviano, interactivo y persistente en pantalla desarrollado con **Tauri v2** + **React 19** + **TypeScript** + **TailwindCSS**, implementado de acuerdo con las [`especificaciones_t_cnicas_del_asistente_virtual.md`](./especificaciones_t_cnicas_del_asistente_virtual.md).

---

## 🚀 Características Implementadas

### 1. Ventana Nativa Flotante y Transparente (Tauri v2)
- **Transparencia Total (`transparent: true`)**: Solo los elementos gráficos del avatar y el chat son visibles en el escritorio.
- **Sin bordes (`decorations: false`)**: Libre de barras de títulos de SO.
- **Always on Top (`alwaysOnTop: true`)**: Permanece siempre visible sobre otras aplicaciones (con botón de toggle para desanclar).
- **Arrastre Nativo (`data-tauri-drag-region`)**: Arrastrá el avatar fluidamente por toda la pantalla.

### 2. Máquina de Estados del Avatar
El avatar reactivo SVG/CSS sincroniza su expresión según el ciclo de interacción:
- `idle`: Animación sutil de respiración y parpadeo periódico.
- `dragging`: Expresión suspendida al mover la ventana.
- `thinking`: Indicador de carga y pulso de atención mientras se espera la inferencia.
- `speaking`: Animación de apertura bucal sincronizada con cada token de streaming recibido.
- `error`: Expresión confusa/disculpa ante fallos en la cadena.

### 3. LLM Gateway con Cadena de Fallback Multi-Modelo
- **Tier 1 (Principal - Velocidad/Costo)**: Google Gemini (2.5 Flash / 1.5 Flash).
- **Tier 2 (Razonamiento / Calidad)**: OpenAI (GPT-4o-mini / GPT-4o) o Anthropic Claude (Claude 3.5 Sonnet).
- **Tier 3 (Local / Respaldo Offline)**: Ollama local (`http://localhost:11434`, ej: Llama 3.2 / Phi-4).
- **Tolerancia a fallos**: Timeout automático de 6 segundos sin primer token, reintentos en HTTP 429/500/503 y fallback offline integrado con asistencia para configurar keys.
- **Streaming en tiempo real**: Generación de texto token a token con opción de interrupción inmediata.

### 4. Persistencia y Configuración
- Almacenamiento local de claves API, modelo preferido, historial de conversación y orden de prioridad del fallback.
- Panel modal de configuración (⚙️) accesible desde el encabezado del chat.

---

## 🛠️ Comandos de Ejecución

### Modo Desarrollo
```bash
# Ejecutar entorno de escritorio nativo (Tauri + Vite HMR)
pnpm tauri dev

# O previsualizar la interfaz web en navegador
pnpm dev
```

### Compilación y Build
```bash
# Compilar frontend
pnpm build

# Compilar binario nativo de escritorio Tauri
pnpm tauri build
```
El binario debug ya fue probado y compilado con éxito en `src-tauri/target/debug/app`.
