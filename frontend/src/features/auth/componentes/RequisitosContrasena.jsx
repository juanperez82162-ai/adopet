import '../auth.css';
import { requisitosContrasena } from '../validaciones.js';

const REQUISITOS = [
    ['largo', 'Mínimo 8 caracteres'],
    ['letra', 'Al menos una letra'],
    ['numero', 'Al menos un número'],
    ['especial', 'Al menos un carácter especial (!@#$%...)']
];

// Lista de requisitos que se van marcando mientras se escribe,
// más la confirmación en verde cuando las dos contraseñas coinciden
// (el aviso de que NO coinciden sale en rojo bajo el campo).
export function RequisitosContrasena({ contrasena, confirmacion }) {
    const cumple = requisitosContrasena(contrasena);

    return (
        <div className="requisitos" aria-live="polite">
            <ul>
                {REQUISITOS.map(([clave, texto]) => (
                    <li key={clave} className={cumple[clave] ? 'requisito-cumplido' : ''}>
                        <span className="requisito-marca" aria-hidden="true">{cumple[clave] ? '✓' : '•'}</span>
                        {texto}
                    </li>
                ))}
            </ul>

            {confirmacion && contrasena === confirmacion && (
                <p className="coincide">✓ Las contraseñas coinciden</p>
            )}
        </div>
    );
}
