import { useState } from 'react';

// Estado común de un formulario con validación en vivo:
// - los errores locales se muestran cuando el campo ya se tocó
//   (el usuario salió de él) o cuando se intentó enviar;
// - los errores del servidor se muestran siempre y se borran al corregir el campo.
export function useFormulario(valoresIniciales, validar) {
    const [datos, setDatos] = useState(valoresIniciales);
    const [tocados, setTocados] = useState({});
    const [intentoEnviar, setIntentoEnviar] = useState(false);
    const [erroresServidor, setErroresServidor] = useState({});

    const errores = validar(datos);
    const hayErrores = Object.keys(errores).length > 0;

    function errorDe(campo, enVivo = false) {
        if (erroresServidor[campo]) {
            return erroresServidor[campo];
        }

        return (tocados[campo] || intentoEnviar || enVivo) ? errores[campo] : undefined;
    }

    function cambiar(evento) {
        const { name, value } = evento.target;
        setDatos((anterior) => ({ ...anterior, [name]: value }));
        setErroresServidor((anterior) => ({ ...anterior, [name]: undefined }));
    }

    function salir(evento) {
        const { name } = evento.target;
        setTocados((anterior) => ({ ...anterior, [name]: true }));
    }

    function propiedades(campo, enVivo = false) {
        return {
            name: campo,
            value: datos[campo],
            onChange: cambiar,
            onBlur: salir,
            'aria-invalid': errorDe(campo, enVivo) ? 'true' : 'false'
        };
    }

    // Deja el formulario como nuevo, con otros valores.
    function reiniciar(nuevosValores) {
        setDatos(nuevosValores);
        setTocados({});
        setIntentoEnviar(false);
        setErroresServidor({});
    }

    return {
        datos,
        errores,
        hayErrores,
        errorDe,
        propiedades,
        reiniciar,
        marcarIntento: () => setIntentoEnviar(true),
        marcarErroresServidor: setErroresServidor
    };
}

// Lleva el foco al primer campo con error, después de que React lo pinte.
export function enfocarPrimerError(formulario) {
    requestAnimationFrame(() => {
        formulario?.querySelector('[aria-invalid="true"]')?.focus();
    });
}
