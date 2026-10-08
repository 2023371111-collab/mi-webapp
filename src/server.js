const app = require('./app');
const db = require('./db');
const { PORT, DB_FILE, GIT_SHA } = require('./config');

async function start() {
    await db.init(DB_FILE);
    const server = app.listen(PORT, () => {
        console.log(`[HTTP] API escuchando en puerto ${PORT} (commit ${GIT_SHA})`);
    });

    // Apagado ordenado cuando Docker detiene el contenedor (docker stop envía SIGTERM)
    const shutdown = (signal) => {
        console.log(`[HTTP] ${signal} recibido, cerrando servidor...`);
        server.close(async () => {
            await db.close();
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

start().catch((err) => {
    console.error('[ERROR] No se pudo iniciar la API:', err);
    process.exit(1);
});
