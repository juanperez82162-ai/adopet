import { Navigate, Route, Routes } from 'react-router-dom';
import { RutaProtegida, SoloInvitado } from './RutaProtegida.jsx';
import { RequiereModulo } from './RequiereModulo.jsx';
import { Plantilla } from '../componentes/Plantilla.jsx';
import { PaginaPendiente } from '../componentes/PaginaPendiente.jsx';
import { Login } from '../features/auth/paginas/Login.jsx';
import { Registro } from '../features/auth/paginas/Registro.jsx';
import { RecuperarContrasena } from '../features/auth/paginas/RecuperarContrasena.jsx';
import { RestablecerContrasena } from '../features/auth/paginas/RestablecerContrasena.jsx';
import { Inicio } from '../features/inicio/paginas/Inicio.jsx';
import { Catalogos } from '../features/catalogos/paginas/Catalogos.jsx';

export function Rutas() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/inicio" replace />} />

            <Route path="/login" element={<SoloInvitado><Login /></SoloInvitado>} />
            <Route path="/registro" element={<SoloInvitado><Registro /></SoloInvitado>} />
            <Route path="/recuperar" element={<SoloInvitado><RecuperarContrasena /></SoloInvitado>} />
            <Route path="/restablecer" element={<SoloInvitado><RestablecerContrasena /></SoloInvitado>} />

            <Route element={<RutaProtegida><Plantilla /></RutaProtegida>}>
                <Route path="/inicio" element={<Inicio />} />
                <Route
                    path="/catalogos"
                    element={<RequiereModulo opcion="CATALOGOS"><Catalogos /></RequiereModulo>}
                />
                {/* Cada módulo agrega aquí su ruta cuando exista su pantalla. */}
                <Route path="*" element={<PaginaPendiente />} />
            </Route>
        </Routes>
    );
}
