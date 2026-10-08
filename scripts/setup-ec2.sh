#!/usr/bin/env bash
# Prepara una instancia EC2 Ubuntu para recibir los despliegues.
# Uso (dentro de la EC2):  bash setup-ec2.sh
set -euo pipefail

echo "==> Actualizando paquetes"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl

echo "==> Instalando Docker (repositorio oficial)"
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

echo "==> Habilitando Docker al arranque"
sudo systemctl enable --now docker

echo "==> Permitiendo usar docker sin sudo al usuario $USER"
sudo usermod -aG docker "$USER"

docker --version
echo "==> Listo. Cierra la sesión SSH y vuelve a entrar para que el grupo docker tenga efecto."
