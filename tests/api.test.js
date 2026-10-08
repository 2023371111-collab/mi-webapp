const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

beforeAll(() => db.init(':memory:'));
afterAll(() => db.close());

describe('1. GET /api/health', () => {
    test('responde 200 con estado, mensaje y commit', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('ok');
        expect(typeof res.body.data.message).toBe('string');
        expect(res.body.data).toHaveProperty('commit');
    });
});

describe('CRUD de /api/users', () => {
    let id;

    test('4. POST /api/users crea un usuario (201)', async () => {
        const res = await request(app).post('/api/users').send({ name: 'Ana', email: 'ana@test.com' });
        expect(res.statusCode).toBe(201);
        expect(res.body.data).toMatchObject({ name: 'Ana', email: 'ana@test.com' });
        id = res.body.data.id;
    });

    test('4. POST /api/users sin datos responde 400', async () => {
        const res = await request(app).post('/api/users').send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.details).toHaveLength(2);
    });

    test('4. POST /api/users con correo inválido responde 400', async () => {
        const res = await request(app).post('/api/users').send({ name: 'Ana', email: 'no-es-correo' });
        expect(res.statusCode).toBe(400);
    });

    test('2. GET /api/users lista los usuarios (200)', async () => {
        const res = await request(app).get('/api/users');
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    test('3. GET /api/users/:id devuelve el usuario (200)', async () => {
        const res = await request(app).get(`/api/users/${id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.name).toBe('Ana');
    });

    test('5. PUT /api/users/:id actualiza el usuario (200)', async () => {
        const res = await request(app).put(`/api/users/${id}`).send({ name: 'Ana López', email: 'ana.lopez@test.com' });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.name).toBe('Ana López');
    });

    test('5. PUT /api/users/:id con datos inválidos responde 400', async () => {
        const res = await request(app).put(`/api/users/${id}`).send({ name: '' });
        expect(res.statusCode).toBe(400);
    });

    test('6. DELETE /api/users/:id elimina el usuario (200)', async () => {
        const res = await request(app).delete(`/api/users/${id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.deleted).toBe(id);
    });

    test('GET, PUT y DELETE de un usuario inexistente responden 404', async () => {
        expect((await request(app).get(`/api/users/${id}`)).statusCode).toBe(404);
        expect((await request(app).put(`/api/users/${id}`).send({ name: 'X', email: 'x@test.com' })).statusCode).toBe(404);
        expect((await request(app).delete(`/api/users/${id}`)).statusCode).toBe(404);
    });

    test('un id no numérico responde 400', async () => {
        const res = await request(app).get('/api/users/abc');
        expect(res.statusCode).toBe(400);
    });
});

describe('Errores generales', () => {
    test('ruta inexistente responde 404', async () => {
        const res = await request(app).get('/api/no-existe');
        expect(res.statusCode).toBe(404);
        expect(res.body.error).toMatch(/no existe/);
    });

    test('JSON mal formado responde 400', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Content-Type', 'application/json')
            .send('{"name": ');
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('JSON mal formado');
    });

    test('un error de base de datos responde 500', async () => {
        const spy = jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('falla simulada'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const res = await request(app).get('/api/users');
        expect(res.statusCode).toBe(500);
        spy.mockRestore();
        errorSpy.mockRestore();
    });
});
