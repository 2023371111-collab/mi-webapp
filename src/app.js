const express = require('express');
const cors = require('cors');
const db = require('./db');
const config = require('./config');
const { send, fail, notFound, badRequest } = require('./http');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Log de cada petición (visible con `docker logs`)
if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
        console.log(`[HTTP] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
        next();
    });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida name y email del body; devuelve la lista de errores
function validateUser(body) {
    const errors = [];
    if (!body || typeof body.name !== 'string' || body.name.trim() === '') errors.push("El campo 'name' es obligatorio");
    if (!body || typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) errors.push("El campo 'email' debe ser un correo válido");
    return errors;
}

// Valida que :id sea un entero positivo
app.param('id', (req, res, next, id) => {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) return badRequest(res, ['El id debe ser un entero positivo']);
    req.id = n;
    next();
});

const findUser = (id) => db.get('SELECT * FROM users WHERE id = ?', [id]);

// ── 1. GET /api/health — estado de la API (lo usa el pipeline y Docker) ──
app.get('/api/health', async (req, res) => {
    await db.get('SELECT 1');
    send(res, {
        status: 'ok 2',
        message: config.MESSAGE,
        version: config.VERSION,
        commit: config.GIT_SHA,
        uptime: Math.round(process.uptime()),
    });
});

// ── 2. GET /api/users — listar usuarios ──
app.get('/api/users', async (req, res) => {
    send(res, await db.all('SELECT * FROM users ORDER BY id'));
});

// ── 3. GET /api/users/:id — obtener un usuario ──
app.get('/api/users/:id', async (req, res) => {
    const user = await findUser(req.id);
    if (!user) return notFound(res, `Usuario ${req.id} no encontrado`);
    send(res, user);
});

// ── 4. POST /api/users — crear usuario ──
app.post('/api/users', async (req, res) => {
    const errors = validateUser(req.body);
    if (errors.length) return badRequest(res, errors);
    const { lastID } = await db.run('INSERT INTO users (name, email) VALUES (?, ?)', [req.body.name, req.body.email]);
    send(res, await findUser(lastID), 201);
});

// ── 5. PUT /api/users/:id — actualizar usuario ──
app.put('/api/users/:id', async (req, res) => {
    const errors = validateUser(req.body);
    if (errors.length) return badRequest(res, errors);
    const { changes } = await db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [req.body.name, req.body.email, req.id]);
    if (changes === 0) return notFound(res, `Usuario ${req.id} no encontrado`);
    send(res, await findUser(req.id));
});

// ── 6. DELETE /api/users/:id — eliminar usuario ──
app.delete('/api/users/:id', async (req, res) => {
    const { changes } = await db.run('DELETE FROM users WHERE id = ?', [req.id]);
    if (changes === 0) return notFound(res, `Usuario ${req.id} no encontrado`);
    send(res, { deleted: req.id });
});

// 404 para rutas inexistentes
app.use((req, res) => notFound(res, `Ruta ${req.method} ${req.originalUrl} no existe`));

// Manejador de errores (JSON mal formado, errores de base de datos, etc.)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return fail(res, 400, 'JSON mal formado');
    console.error('[ERROR]', err);
    fail(res, 500, 'Error interno del servidor');
});

module.exports = app;
