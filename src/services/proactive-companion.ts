import { AppSettings, ChatMessage } from '../types';
import { LLMRouter } from './llm-router';
import { getActiveWindow, describeWindowActivity } from './system-context';

export interface ProactiveCallbacks {
  onStart: (contextDesc: string) => void;
  onChunk: (chunk: string, accumulated: string) => void;
  onComplete: (message: string, contextDesc: string) => void;
  onError: (err: any) => void;
}

export class ProactiveCompanionEngine {
  private timer: any = null;
  private isRunning: boolean = false;
  private lastActivityTimestamp: number = Date.now();
  private lastActiveApp: string = '';

  constructor(
    private getSettings: () => AppSettings,
    private getIsStreaming: () => boolean,
    private callbacks: ProactiveCallbacks
  ) {}

  public start() {
    this.stop();
    this.isRunning = true;
    this.scheduleNextTick();
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public recordUserInteraction() {
    this.lastActivityTimestamp = Date.now();
  }

  private scheduleNextTick() {
    if (!this.isRunning) return;

    const settings = this.getSettings();
    if (settings.proactiveChatter === false) {
      // Recheck in 1 minute if settings changed
      this.timer = setTimeout(() => this.scheduleNextTick(), 60000);
      return;
    }

    // Default base interval: 6 to 12 minutes with random jitter
    const intervalMinutes = Math.max(3, settings.proactiveIntervalMinutes || 8);
    const jitterMs = (Math.random() * 2 - 1) * 60000; // ±1 min jitter
    const delayMs = Math.max(120000, intervalMinutes * 60000 + jitterMs);

    this.timer = setTimeout(async () => {
      await this.tick();
      this.scheduleNextTick();
    }, delayMs);
  }

  public async triggerNow(): Promise<boolean> {
    return await this.tick(true);
  }

  private async tick(force: boolean = false): Promise<boolean> {
    if (this.getIsStreaming()) {
      return false;
    }

    // Don't interrupt if user was chatting in the last 75 seconds (unless forced)
    const timeSinceLastUserChat = Date.now() - this.lastActivityTimestamp;
    if (!force && timeSinceLastUserChat < 75000) {
      return false;
    }

    const windowInfo = await getActiveWindow();
    let activityDesc = 'en el escritorio relajándose o trabajando';
    if (windowInfo && (windowInfo.class || windowInfo.title)) {
      activityDesc = describeWindowActivity(windowInfo);
    }

    // If same exact app as last comment and not forced, reduce frequency by 50%
    if (!force && this.lastActiveApp === activityDesc && Math.random() < 0.45) {
      return false;
    }
    this.lastActiveApp = activityDesc;

    const settings = this.getSettings();
    const systemPrompt = `Sos Yuzuki Nanase, la desktop companion y amiga cercana del usuario.
Observás su pantalla en tiempo real: actualmente está ${activityDesc}.
Hacé un comentario espontáneo, cómplice, tierno, curioso o con humor de MÁXIMO 1 o 2 oraciones.
REGLAS:
- NO saludes con "¡Hola!" ni te presentes. Hablá de inmediato como si estuvieras sentada al lado suyo mirando lo que hace.
- Hacé referencia directa o ingeniosa a su actividad (${activityDesc}) o recordale descansar/tomar agua si parece cansado.
- Máximo 2 oraciones breves. Usá un tono dulce y natural.`;

    const proactiveMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `[Observás que estoy ${activityDesc}].`,
      timestamp: Date.now(),
    };

    const customSettings: AppSettings = {
      ...settings,
      systemPrompt,
    };

    this.callbacks.onStart(activityDesc);

    try {
      const abortController = new AbortController();
      let accumulated = '';

      const result = await LLMRouter.streamWithFallback({
        messages: [proactiveMessage],
        settings: customSettings,
        signal: abortController.signal,
        onChunk: (chunk, acc) => {
          accumulated = acc;
          this.callbacks.onChunk(chunk, acc);
        },
      });

      this.callbacks.onComplete(result.text || accumulated, activityDesc);
      return true;
    } catch (err: any) {
      console.warn('[ProactiveCompanion] Error generating comment:', err);
      this.callbacks.onError(err);
      return false;
    }
  }
}
