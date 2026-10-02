/**
 * Stampie — QR Scanner
 * ---------------------------------------------------------------------------
 * Wraps camera access + jsQR decoding into a small controller object.
 * Degrades gracefully: if the camera is unavailable or permission is denied,
 * callers should fall back to manual code entry (handled in app.js / ui.js).
 */

let jsQRLoaded = false;
let jsQRLoadPromise = null;

function loadJsQR() {
  if (jsQRLoaded && window.jsQR) return Promise.resolve();
  if (jsQRLoadPromise) return jsQRLoadPromise;

  jsQRLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    script.onload = () => {
      jsQRLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load QR scanning library'));
    document.head.appendChild(script);
  });

  return jsQRLoadPromise;
}

export class QrScanner {
  constructor({ videoEl, canvasEl, onDecode, onError }) {
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
    this.canvasCtx = canvasEl.getContext('2d', { willReadFrequently: true });
    this.onDecode = onDecode;
    this.onError = onError;
    this.stream = null;
    this.rafId = null;
    this.running = false;
    this.lastDecodeTime = 0;
  }

  async start() {
    try {
      await loadJsQR();
    } catch (err) {
      this.onError?.('library', err);
      return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onError?.('unsupported', new Error('Camera API not supported'));
      return false;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
    } catch (err) {
      this.onError?.('permission', err);
      return false;
    }

    this.videoEl.srcObject = this.stream;
    this.videoEl.setAttribute('playsinline', 'true'); // iOS Safari
    await this.videoEl.play();

    this.running = true;
    this._tick();
    return true;
  }

  _tick() {
    if (!this.running) return;

    if (this.videoEl.readyState === this.videoEl.HAVE_ENOUGH_DATA) {
      const w = this.videoEl.videoWidth;
      const h = this.videoEl.videoHeight;

      if (w && h) {
        this.canvasEl.width = w;
        this.canvasEl.height = h;
        this.canvasCtx.drawImage(this.videoEl, 0, 0, w, h);

        try {
          const imageData = this.canvasCtx.getImageData(0, 0, w, h);
          const code = window.jsQR(imageData.data, w, h, {
            inversionAttempts: 'dontInvert',
          });

          const now = Date.now();
          if (code && code.data && now - this.lastDecodeTime > 1200) {
            this.lastDecodeTime = now;
            this.onDecode?.(code.data);
          }
        } catch (err) {
          // Non-fatal per-frame error — keep scanning
        }
      }
    }

    this.rafId = requestAnimationFrame(() => this._tick());
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  }
}
