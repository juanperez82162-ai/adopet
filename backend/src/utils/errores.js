export class ErrorNegocio extends Error {
    constructor(codigoHttp, codigo, mensaje) {
        super(mensaje);
        this.name = 'ErrorNegocio';
        this.codigoHttp = codigoHttp;
        this.codigo = codigo;
    }
}