import { Navigate, Route, Routes } from 'react-router-dom';
import { RutaProtegida, SoloInvitado } from './RutaProtegida.jsx';
import { Plantilla } from '../componentes/Plantilla.jsx';
import { PaginaPendiente } from '../componentes/PaginaPendiente.jsx';
import { Login } from '../features/auth/paginas/Login.jsx';
import { Registro } from '../features/auth/paginas/Registro.jsx';
import { Inicio } from '../features/inicio/paginas/Inicio.jsx';

export function Rutas() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/inicio" replace />} />

            <Route path="/login" element={<SoloInvitado><Login /></SoloInvitado>} />
            <Route path="/registro" element={<SoloInvitado><Registro /></SoloInvitado>} />

            <Route element={<RutaProtegida><Plantilla /></RutaProtegida>}>
                <Route path="/inicio" element={<Inicio />} />
                {/* Cada módulo agrega aquí su ruta cuando exista su pantalla. */}
                <Route path="*" element={<PaginaPendiente />} />
            </Route>
        </Routes>
    );
}
