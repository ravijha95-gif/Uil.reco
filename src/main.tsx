import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill Uint8Array.prototype.toHex and toBase64 for mobile and older browser compatibility
if (typeof Uint8Array !== 'undefined') {
  if (!(Uint8Array.prototype as any).toHex) {
    (Uint8Array.prototype as any).toHex = function () {
      let hex = '';
      for (let i = 0; i < this.length; i++) {
        hex += this[i].toString(16).padStart(2, '0');
      }
      return hex;
    };
  }
  if (!(Uint8Array.prototype as any).toBase64) {
    (Uint8Array.prototype as any).toBase64 = function () {
      let binary = '';
      const bytes = new Uint8Array(this);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
