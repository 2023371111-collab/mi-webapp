// Formato uniforme de respuesta: { statusCode, data } o { statusCode, error, details? }
const send = (res, data, code = 200) => res.status(code).json({ statusCode: code, data });
const fail = (res, code, error, details) => res.status(code).json({ statusCode: code, error, ...(details && { details }) });
const notFound = (res, message) => fail(res, 404, message);
const badRequest = (res, details) => fail(res, 400, 'Datos inválidos', details);

module.exports = { send, fail, notFound, badRequest };
