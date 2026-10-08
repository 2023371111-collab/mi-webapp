#!/usr/bin/env bash
# Prueba rápida de los 6 endpoints de la API.
# Uso:  bash scripts/smoke-test.sh http://<IP_EC2>     (por defecto http://localhost:3000)
BASE="${1:-http://localhost:3000}"

call() {
  printf '\n\033[1m%s %s\033[0m\n' "$1" "$2"
  curl -s -X "$1" "$BASE$2" -H 'Content-Type: application/json' ${3:+-d "$3"}
  echo
}

call GET    /api/health
ID=$(curl -s -X POST "$BASE/api/users" -H 'Content-Type: application/json' \
  -d '{"name":"Prueba","email":"prueba@example.com"}' | sed -E 's/.*"id":([0-9]+).*/\1/')
printf '\n\033[1mPOST /api/users\033[0m\nUsuario creado con id %s\n' "$ID"
call GET    /api/users
call GET    "/api/users/$ID"
call PUT    "/api/users/$ID" '{"name":"Prueba Editada","email":"editada@example.com"}'
call DELETE "/api/users/$ID"
