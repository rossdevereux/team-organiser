import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Automatically recover when a new deployment renders an in-memory chunk reference obsolete
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected (app updated), reloading page...', event);
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

