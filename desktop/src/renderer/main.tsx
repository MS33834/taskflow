import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useAuthStore } from './store/authStore';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

window.taskflowAPI.app.on('app:lock', () => {
  useAuthStore.getState().lock();
});

window.taskflowAPI.app.on('app:newTask', () => {
  window.dispatchEvent(new CustomEvent('new-task'));
});

window.taskflowAPI.app.on('app:togglePrivacy', () => {
  window.dispatchEvent(new CustomEvent('toggle-privacy'));
});
