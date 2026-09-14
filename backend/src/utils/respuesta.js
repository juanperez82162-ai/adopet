export function exito(res, datos, codigoHttp = 200) {
    return res.status(codigoHttp).json({
        ok: true,
        datos
    });
}

export function error(res, codigoHttp, codigo, mensaje) {
    return res.status(codigoHttp).json({
        ok: false,
        error: {
            codigo,
            mensaje
        }
    });
}