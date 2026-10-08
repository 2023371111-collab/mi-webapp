# mi-webapp: API REST con pipeline CI/CD

API REST en **Node.js + Express + SQLite** con **6 endpoints**, pruebas automatizadas (Jest + Supertest, cobertura > 70%), imagen **Docker** publicada en **Docker Hub** y despliegue continuo en **AWS EC2** con **GitHub Actions**.

## Arquitectura

```
 Desarrollador ──git push──▶ GitHub (rama main)
                                 │
                                 ▼
                     GitHub Actions (.github/workflows/main.yml)
   ┌─────────────────────┬─────────────────────────┬──────────────────────────┐
   │ 1. test             │ 2. build                │ 3. deploy                │
   │ npm ci              │ docker login (PAT)      │ SSH a la EC2 (.pem)      │
   │ npm test + coverage │ docker build            │ docker pull :sha         │
   │ umbral 70%          │ push :latest y :sha ───▶│ docker stop/rm api       │
   └─────────────────────┴──────────┬──────────────│ docker run -p 80:3000    │
                                    ▼              │ health check / rollback  │
                               Docker Hub ────────▶└────────────┬─────────────┘
                                                                ▼
                                       AWS EC2 Ubuntu (Docker) ── http://<IP_EC2>/api/...
```

* En un **pull request** solo se ejecutan las pruebas.
* En un **push a main** se ejecutan las pruebas, se publica la imagen y se despliega.
* Si la nueva versión no responde en `/api/health`, el pipeline restaura la versión anterior.
* Los datos de SQLite se guardan en el volumen Docker `api-data`, así que sobreviven a los despliegues.

## Estructura

```
src/
  server.js   Arranque del servidor y apagado ordenado
  app.js      Los 6 endpoints, validación, 404 y manejo de errores
  config.js   Puerto, ruta de la BD, versión y mensaje de la demo
  db.js       Conexión a SQLite y creación de la tabla users
  http.js     Formato uniforme de respuesta
tests/        Pruebas de integración (Jest + Supertest)
scripts/      Instalación de Docker en la EC2 y prueba rápida
```

## Endpoints (6)

| # | Método | Ruta | Descripción | Respuestas |
|---|---|---|---|---|
| 1 | GET | `/api/health` | Estado de la API, mensaje y commit desplegado | 200 |
| 2 | GET | `/api/users` | Listar usuarios | 200 |
| 3 | GET | `/api/users/:id` | Obtener un usuario | 200, 400, 404 |
| 4 | POST | `/api/users` | Crear usuario (`name`, `email`) | 201, 400 |
| 5 | PUT | `/api/users/:id` | Actualizar usuario (`name`, `email`) | 200, 400, 404 |
| 6 | DELETE | `/api/users/:id` | Eliminar usuario | 200, 400, 404 |

Todas las respuestas tienen el formato `{ "statusCode": 200, "data": ... }` o `{ "statusCode": 400, "error": "...", "details": [...] }`.

## Comandos locales

Requisitos: Node.js 22 y Docker Desktop.

```bash
npm install            # instalar dependencias
npm test               # pruebas + reporte de cobertura (coverage/lcov-report/index.html)
npm start              # API en http://localhost:3000
npm run dev            # API con recarga automática

# Con Docker
docker build -t mi-webapp .
docker run -d --name api -p 8080:3000 mi-webapp
curl http://localhost:8080/api/health
docker logs -f api
docker rm -f api
```

Ejemplos con curl:

```bash
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"name":"Ana","email":"ana@example.com"}'
curl http://localhost:3000/api/users
curl http://localhost:3000/api/users/1
curl -X PUT http://localhost:3000/api/users/1 -H "Content-Type: application/json" -d '{"name":"Ana López","email":"ana@example.com"}'
curl -X DELETE http://localhost:3000/api/users/1
bash scripts/smoke-test.sh http://localhost:3000
```

## Configuración del despliegue

### 1. Docker Hub
1. Crear una cuenta en <https://hub.docker.com>.
2. *Account settings → Personal access tokens → Generate new token* con permiso **Read & Write**. Copiar el token.

### 2. AWS EC2
1. *EC2 → Launch instance*: **Ubuntu Server 24.04 LTS**, tipo `t2.micro` o `t3.micro` (capa gratuita).
2. *Key pair*: crear uno nuevo de tipo RSA en formato `.pem` y descargarlo.
3. *Security group*, reglas de entrada:
   * SSH, TCP 22, origen *My IP* (o `0.0.0.0/0` para que GitHub Actions pueda conectarse)
   * HTTP, TCP 80, origen `0.0.0.0/0`
4. Conectarse e instalar Docker:
   ```bash
   ssh -i mi-llave.pem ubuntu@<IP_EC2>
   curl -fsSL https://raw.githubusercontent.com/<usuario>/<repo>/main/scripts/setup-ec2.sh | bash
   exit   # volver a entrar para que el grupo docker tenga efecto
   ```

> GitHub Actions se conecta desde IPs variables, por eso el puerto 22 debe aceptar `0.0.0.0/0`. La seguridad la da la llave `.pem`, que solo existe en GitHub Secrets.

### 3. GitHub Secrets
*Settings → Secrets and variables → Actions → New repository secret*:

| Secret | Valor |
|---|---|
| `DOCKERHUB_USERNAME` | Usuario de Docker Hub |
| `DOCKERHUB_TOKEN` | Personal Access Token de Docker Hub |
| `EC2_HOST` | IP pública de la instancia |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contenido completo del archivo `.pem` |

Ningún dato sensible está en el código: todo se lee de los secrets.

## Demostración en vivo

1. Cambiar `MESSAGE` en [`src/config.js`](src/config.js).
2. `git commit -am "Cambia mensaje" && git push`
3. Ver el pipeline en la pestaña **Actions** (test → build → deploy).
4. Ver la nueva imagen en Docker Hub con el tag del commit.
5. Abrir `http://<IP_EC2>/api/health`: muestra el nuevo mensaje y el commit desplegado.
