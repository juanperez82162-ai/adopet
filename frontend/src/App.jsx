import { useState, useEffect } from 'react';
import { peticionGet } from './api/cliente.js';

function App() {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    peticionGet('/health')
        .then((datos) => setEstado(datos))
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false));
  }, []);

  return (
      <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
        <h1>ADOPET</h1>
        <h2>Estado del sistema</h2>

        {cargando && <p>Consultando el servidor...</p>}

        {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

        {estado && (
            <ul>
              <li>Servidor: <strong>{estado.servidor}</strong></li>
              <li>Base de datos: <strong>{estado.baseDatos}</strong></li>
            </ul>
        )}
      </div>
  );
}

export default App;