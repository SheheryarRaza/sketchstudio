import type { IsolationTarget, ValueFamilyFloors, ValueLayer } from '../types/studio';
import {
  computeTonalPixels,
  getLuminance,
  getSharedOffscreenCanvas,
} from './canvasShaders';
import {
  bandFor,
  createTonalPixel,
  decideTonalPixel,
  DEFAULT_VALUE_FAMILY_FLOORS,
  isolatedLayerIds,
} from './tonalDecision';
import { PENCIL_DATABASE } from './pencilGrades';

export interface TonalRenderJob {
  sourceImage: HTMLImageElement | HTMLCanvasElement;
  targetCanvas: HTMLCanvasElement;
  offscreenCanvas?: HTMLCanvasElement;
  layers: ValueLayer[];
  viewMode: 'original' | 'valueStudy' | 'tonalMask';
  splitRatio?: number;
  isolation?: IsolationTarget;
  ghostOpacity?: number;
  familyFloors?: ValueFamilyFloors;
  blurRadius?: number;
  onComplete?: () => void;
  onError?: (err: unknown) => void;
}

export interface WorkerShaderComputePayload {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  layers: ValueLayer[];
  renderMode: 'valueStudy' | 'tonalMask';
  isolated: string[];
  ghostOpacity: number;
  splitX: number;
}

export interface IWorkerClient {
  isAvailable: boolean;
  compute(payload: WorkerShaderComputePayload): Promise<Uint8ClampedArray>;
  terminate(): void;
}

/**
 * Creates an inline Web Worker from a Blob containing the pure tonal shader functions.
 * Avoids any static asset loader or cross-origin restrictions.
 */
function createBrowserWorkerClient(): IWorkerClient | null {
  if (
    typeof globalThis === 'undefined' ||
    typeof globalThis.Worker === 'undefined' ||
    typeof globalThis.Blob === 'undefined' ||
    typeof globalThis.URL === 'undefined'
  ) {
    return null;
  }

  try {
    const workerScript = `
var PENCIL_DATABASE = ${JSON.stringify(PENCIL_DATABASE)};
${bandFor.toString()}
${getLuminance.toString()}
${createTonalPixel.toString()}
${decideTonalPixel.toString()}
${computeTonalPixels.toString()}

self.onmessage = function(e) {
  var data = e.data;
  var id = data.id;
  try {
    var pixels = new Uint8ClampedArray(data.data);
    var out = computeTonalPixels(
      pixels,
      data.width,
      data.height,
      data.layers,
      data.renderMode,
      data.isolated,
      data.ghostOpacity,
      data.splitX
    );
    self.postMessage({ id: id, outputBuffer: out.buffer, ok: true }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id: id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
`;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);

    let nextJobId = 1;
    const pendingCallbacks = new Map<
      number,
      { resolve: (buf: Uint8ClampedArray) => void; reject: (err: unknown) => void }
    >();

    worker.onmessage = (e: MessageEvent) => {
      const { id, outputBuffer, ok, error } = e.data;
      const handlers = pendingCallbacks.get(id);
      if (!handlers) return;
      pendingCallbacks.delete(id);

      if (ok) {
        handlers.resolve(new Uint8ClampedArray(outputBuffer));
      } else {
        handlers.reject(new Error(error || 'Worker shader compute failed'));
      }
    };

    worker.onerror = (e: ErrorEvent) => {
      pendingCallbacks.forEach(({ reject }) =>
        reject(new Error(e.message || 'Worker encountered an error'))
      );
      pendingCallbacks.clear();
    };

    return {
      isAvailable: true,
      compute(payload: WorkerShaderComputePayload): Promise<Uint8ClampedArray> {
        return new Promise((resolve, reject) => {
          const id = nextJobId++;
          pendingCallbacks.set(id, { resolve, reject });
          worker.postMessage(
            {
              id,
              data: payload.data,
              width: payload.width,
              height: payload.height,
              layers: payload.layers,
              renderMode: payload.renderMode,
              isolated: payload.isolated,
              ghostOpacity: payload.ghostOpacity,
              splitX: payload.splitX,
            },
            [payload.data.buffer]
          );
        });
      },
      terminate() {
        worker.terminate();
        pendingCallbacks.clear();
      },
    };
  } catch {
    return null;
  }
}

/**
 * TonalShaderDispatcher:
 * 1. Batches multiple rapid render calls (e.g. from continuous slider drags) onto
 *    requestAnimationFrame so only the latest frame is computed per refresh cycle.
 * 2. Offloads heavy per-pixel tonal shader computation to a Web Worker off the main thread.
 * 3. Gracefully falls back to synchronous execution with reused offscreen canvas if Worker
 *    is unavailable or unsupported.
 */
export class TonalShaderDispatcher {
  private workerClient: IWorkerClient | null;
  private pendingJob: TonalRenderJob | null = null;
  private rafId: number | null = null;
  private currentJobId: number = 0;
  private isDisposed: boolean = false;
  private cachedSource: {
    image: HTMLImageElement | HTMLCanvasElement;
    width: number;
    height: number;
    blurRadius: number;
    pixels: Uint8ClampedArray;
  } | null = null;

  constructor(options?: { workerClient?: IWorkerClient }) {
    this.workerClient =
      options?.workerClient !== undefined
        ? options.workerClient
        : createBrowserWorkerClient();
  }

  /**
   * Dispatches a tonal render job.
   * If called rapidly, intermediate jobs are collapsed onto requestAnimationFrame
   * so that at most one render per animation frame occurs.
   */
  public dispatch(job: TonalRenderJob, options?: { immediate?: boolean }): void {
    if (this.isDisposed) return;
    this.pendingJob = job;

    if (options?.immediate) {
      if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.executeLatestJob();
      return;
    }

    if (this.rafId === null) {
      const scheduleRaf =
        typeof requestAnimationFrame !== 'undefined'
          ? requestAnimationFrame
          : (cb: FrameRequestCallback) =>
              setTimeout(() => cb(Date.now()), 16) as unknown as number;

      this.rafId = scheduleRaf(() => {
        this.rafId = null;
        this.executeLatestJob();
      });
    }
  }

  private async executeLatestJob(): Promise<void> {
    if (!this.pendingJob || this.isDisposed) return;
    const job = this.pendingJob;
    this.pendingJob = null;

    const jobId = ++this.currentJobId;
    const {
      sourceImage,
      targetCanvas,
      offscreenCanvas,
      layers,
      viewMode,
      splitRatio,
      isolation = { kind: 'none' },
      ghostOpacity = 0.18,
      familyFloors = DEFAULT_VALUE_FAMILY_FLOORS,
      blurRadius = 0,
      onComplete,
      onError,
    } = job;

    try {
      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Failed to acquire destination canvas 2D rendering context');
      }

      const width = targetCanvas.width;
      const height = targetCanvas.height;

      // Check if source pixels for current image dimensions and blur radius are already cached.
      // This prevents expensive tempCtx.drawImage and tempCtx.getImageData pipeline sync stalls
      // on every slider drag tick.
      let sourcePixels: Uint8ClampedArray;
      if (
        this.cachedSource &&
        this.cachedSource.image === sourceImage &&
        this.cachedSource.width === width &&
        this.cachedSource.height === height &&
        this.cachedSource.blurRadius === blurRadius
      ) {
        sourcePixels = this.cachedSource.pixels;
      } else {
        const tempCanvas = offscreenCanvas ?? getSharedOffscreenCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          throw new Error('Failed to acquire offscreen canvas 2D rendering context');
        }

        if (blurRadius > 0) {
          tempCtx.filter = `blur(${blurRadius}px)`;
        } else {
          tempCtx.filter = 'none';
        }
        tempCtx.drawImage(sourceImage, 0, 0, width, height);

        if (viewMode === 'original') {
          ctx.drawImage(tempCanvas, 0, 0);
          onComplete?.();
          return;
        }

        const imgData = tempCtx.getImageData(0, 0, width, height);
        sourcePixels = new Uint8ClampedArray(imgData.data);
        this.cachedSource = {
          image: sourceImage,
          width,
          height,
          blurRadius,
          pixels: sourcePixels,
        };
      }

      if (viewMode === 'original') {
        const tempCanvas = offscreenCanvas ?? getSharedOffscreenCanvas(width, height);
        ctx.drawImage(tempCanvas, 0, 0);
        onComplete?.();
        return;
      }

      const isolated = isolatedLayerIds(layers, isolation, familyFloors);
      const renderMode = viewMode === 'tonalMask' ? 'tonalMask' : 'valueStudy';
      const splitX = splitRatio !== undefined ? Math.floor(width * splitRatio) : -1;

      // Offload to Web Worker if available, with graceful fallback to synchronous execution
      if (this.workerClient && this.workerClient.isAvailable) {
        try {
          // Transfer a slice of the buffer to the worker so cachedSource stays intact
          const inputCopy = new Uint8ClampedArray(sourcePixels.slice().buffer);
          const payload: WorkerShaderComputePayload = {
            data: inputCopy,
            width,
            height,
            layers,
            renderMode,
            isolated: Array.from(isolated),
            ghostOpacity,
            splitX,
          };

          const outputData = await this.workerClient.compute(payload);

          // If a newer job started or dispatcher disposed while worker was computing, drop stale frame
          if (jobId !== this.currentJobId || this.isDisposed) {
            return;
          }

          const imgDataOut = ctx.createImageData(width, height);
          imgDataOut.data.set(outputData);
          ctx.putImageData(imgDataOut, 0, 0);
          onComplete?.();
          return;
        } catch (workerErr) {
          console.warn('Worker shader computation failed; falling back to main thread execution', workerErr);
          this.workerClient = null;
        }
      }

      // Synchronous fallback path (used when worker is disabled or failed)
      const outputData = ctx.createImageData(width, height);
      computeTonalPixels(
        sourcePixels,
        width,
        height,
        layers,
        renderMode,
        isolated,
        ghostOpacity,
        splitX,
        outputData.data
      );

      if (jobId !== this.currentJobId || this.isDisposed) {
        return;
      }

      ctx.putImageData(outputData, 0, 0);
      onComplete?.();
    } catch (err) {
      if (jobId === this.currentJobId && !this.isDisposed) {
        onError?.(err);
      }
    }
  }

  public cancel(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingJob = null;
  }

  public dispose(): void {
    this.isDisposed = true;
    this.cachedSource = null;
    this.cancel();
    if (this.workerClient) {
      this.workerClient.terminate();
      this.workerClient = null;
    }
  }
}
