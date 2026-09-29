export function exito(res, datos, codigoHttp = 200) {
    return res.status(codigoHttp).json({
        ok: true,
        datos
    });
}

export function error(res, codigoHttp, codigo, mensaje, detalles = null) {
    const cuerpo = { codigo, mensaje };

    if (detalles) {
        cuerpo.detalles = detalles;
    }

    return res.status(codigoHttp).json({
        ok: false,
        error: cuerpo
    });
}
