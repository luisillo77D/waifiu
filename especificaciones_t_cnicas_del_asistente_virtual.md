# Project Specification: Desktop Floating AI Companion ("Desktop Pet")

## 1. Overview & Objectives
Desarrollo de un asistente virtual de escritorio ligero, interactivo y persistente en pantalla. La aplicación mostrará un avatar animado arrastrable con ventana transparente, una interfaz de chat desplegable, y un motor de inferencia de IA multi-proveedor con tolerancia a fallos (fallback chain).

---

## 2. Tech Stack Recomendado

| Capa | Tecnología | Justificación |
| :--- | :--- | :--- |
| **Desktop Runtime** | **Tauri v2** (Rust + Webview) | Mínimo consumo de RAM (~40-70 MB), binario ligero y soporte nativo para ventanas sin bordes transparentes. |
| **Frontend Framework** | **React / Svelte / SolidJS** + TailwindCSS | Reactividad rápida para estados de animación y mensajería en tiempo real. |
| **Render de Avatar** | **Canvas 2D / PixiJS** (fase 1) o **Three.js / VRM** (fase 2) | PixiJS/Canvas para sprites livianos; Three.js si se requiere 3D o Live2D. |
| **LLM Gateway & Router** | **Vercel AI SDK** (`ai`) o **LiteLLM** | Soporte unificado de streaming y fallback transparente entre proveedores. |
| **Base de Datos Local** | **SQLite** (vía plugin Tauri) | Persistencia de configuraciones, claves de API e historial de chat. |

---

## 3. Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────┐
│                   Desktop Window (Tauri)               │
│  ┌───────────────────────┐   ┌───────────────────────┐  │
│  │   Draggable Avatar    │   │ Collapsible Chat UI   │  │
│  │ (Idle/Think/Speak FX) │   │ (Input + Message Log) │  │
│  └───────────▲───────────┘   └───────────▲───────────┘  │
└──────────────┼───────────────────────────┼──────────────┘
               │ (UI Events)               │ (Prompt Submission)
               ▼                           ▼
┌────────────────────────────────────────────────────────┐
│                 Tauri Core / Local Engine               │
│  - Window Management (Draggable, Transparent, Topmost) │
│  - Local Settings & Secure API Keys Storage (SQLite)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               LLM Router / Fallback Chain              │
│  1. Primary: Gemini 2.5 Flash / Fast tier              │
│  2. Secondary: Claude 3.5 Sonnet / High-accuracy       │
│  3. Backup: GPT-4o-mini / Local LLM (Ollama)           │
└────────────────────────────────────────────────────────┘
```

---

## 4. Requerimientos de la Ventana (Window Config)

Configuración base para el archivo `tauri.conf.json`:

* **`transparent: true`**: Fondo completamente transparente fuera de los elementos de UI.
* **`decorations: false`**: Sin barra de título estándar del sistema operativo.
* **`alwaysOnTop: true`**: Mantiene al avatar flotando sobre cualquier otra ventana activa.
* **`shadow: false`**: Evita artefactos oscuros alrededor de bordes recortados en Windows/macOS.
* **`data-tauri-drag-region`**: Atributo HTML aplicado en el contenedor del avatar para permitir arrastre nativo fluido con el cursor.

---

## 5. Máquina de Estados del Avatar

El avatar debe reaccionar en tiempo real a los eventos del ciclo de vida de la conversación:

```
    [ IDLE ] ◄────────────────────────────────────────┐
       │                                              │
       │ (User envía mensaje)                         │ (Stream finalizado)
       ▼                                              │
  [ THINKING ] ───► [ LLM Streaming First Token ] ───► [ SPEAKING ]
```

* **`idle`**: Animación de respiración o parpadeo en reposo.
* **`dragging`**: Fotograma de suspensión cuando el usuario arrastra la ventana.
* **`thinking`**: Bucle de carga/atención mientras la petición del LLM está pendiente.
* **`speaking`**: Animación de boca/gestos sincronizada con la llegada de fragmentos de texto (tokens) por streaming.
* **`error`**: Expresión de disculpa o confusión cuando todos los fallbacks fallan.

---

## 6. Estrategia de Fallback Multi-Modelo

La capa de orquestación manejará reintentos automáticos bajo condiciones de:
1. `Rate Limit (HTTP 429)`
2. `Server Error (HTTP 500, 503)`
3. `Timeout (excede 6 segundos sin primer token)`

### Cadena de Prioridad Sugerida:
1. **Tier 1 (Principal - Velocidad/Costo):**
   * *Ejemplo:* Google Gemini 2.5 Flash / Groq (Llama-3).
2. **Tier 2 (Razonamiento / Calidad):**
   * *Ejemplo:* Anthropic Claude 3.5 Sonnet o OpenAI GPT-4o.
3. **Tier 3 (Local / Respaldo Offline):**
   * *Ejemplo:* Ollama local (Phi-4, Qwen 2.5 o Llama 3) para responder incluso sin internet o ante caídas masivas de APIs.

---

## 7. Plan de Implementación (Fases)

### Fase 1: MVP (Ventana y Chat)
- Configuración de Tauri con ventana transparente y `alwaysOnTop`.
- Avatar simple 2D (Sprite SVG/WebM) con arrastre nativo.
- Input de chat emergente al hacer clic en el avatar.
- Integración básica de streaming de un solo proveedor LLM.

### Fase 2: Robustez y Multi-Modelo
- Implementación de la cadena de fallback (Vercel AI SDK / Router propio).
- Almacenamiento local de claves de API mediante diálogo de configuración.
- Máquina de estados para sincronizar animaciones del avatar con el stream.

### Fase 3: Capacidades de Voz (Futuro)
- Entrada de voz: **Web Speech API** (básico) o **Whisper** (mayor precisión).
- Salida de voz: **Web Speech Synthesis API** (local, cero costo) o **ElevenLabs / Piper TTS** (mayor naturalidad).
- Detección de fonemas o volumen para lip-sync básico del avatar.