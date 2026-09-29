// detalles: opcional, { campo: mensaje } para marcar cada campo del formulario.
export class ErrorNegocio extends Error {
    constructor(codigoHttp, codigo, mensaje, detalles = null) {
        super(mensaje);
        this.name = 'ErrorNegocio';
        this.codigoHttp = codigoHttp;
        this.codigo = codigo;
        this.detalles = detalles;
    }
}
