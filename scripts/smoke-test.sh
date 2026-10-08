#!/usr/bin/env bash
# Prueba rápida de los 6 endpoints de la API.
# Uso:  bash scripts/smoke-test.sh http://<IP_EC2>     (por defecto http://localhost:3000)
BASE="${1:-http://localhost:3000}"

call() {
  printf '\n%s %s\n' "$1" "$2"
  curl -s -X "$1" "$BASE$2" -H 'Content-Type: application/json' ${3:+-d "$3"}
  echo
}

call GET /api/health

printf '\n%s %s\n' POST /api/users
CREATED=$(curl -s -X POST "$BASE/api/users" -H 'Content-Type: application/json' \
  -d '{"name":"Prueba","email":"prueba@example.com"}')
echo "$CREATED"
ID=$(echo "$CREATED" | sed -E 's/.*"id":([0-9]+).*/\1/')

call GET    /api/users
call GET    "/api/users/$ID"
call PUT    "/api/users/$ID" '{"name":"Prueba Editada","email":"editada@example.com"}'
call DELETE "/api/users/$ID"
