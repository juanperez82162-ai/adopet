// Formatos de presentación del módulo de mascotas.

// La edad se guarda en meses; se muestra como la entiende una persona:
// "8 meses", "1 año", "2 años y 3 meses".
export function formatearEdad(meses) {
    const textoMeses = (n) => (n === 1 ? '1 mes' : `${n} meses`);

    if (meses < 12) {
        return textoMeses(meses);
    }

    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    const textoAnios = anios === 1 ? '1 año' : `${anios} años`;

    return resto === 0 ? textoAnios : `${textoAnios} y ${textoMeses(resto)}`;
}

export const aSiNo = (valor) => (valor ? 'Sí' : 'No');

export function formatearFecha(valor) {
    return valor ? new Date(valor).toLocaleDateString('es-CO') : '—';
}
