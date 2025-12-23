import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RequireAuth from './components/RequireAuth';
import { AuthProvider } from './auth-context';
import { WorkspaceProvider } from './workspace-context';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route
              path="/*"
              element={
                <WorkspaceProvider>
                  <App />
                </WorkspaceProvider>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
