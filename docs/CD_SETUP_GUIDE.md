# 🚀 Руководство по настройке Continuous Delivery (CD на Git Push)

После настройки при каждом вашем команде `git push origin main` система автоматически:
1. Прогонит юнит-тесты и линтер.
2. Соберет Docker-образы всех микросервисов и загрузит их в реестр.
3. Подключится по SSH к вашему серверу и перезапустит контейнеры без простоя (zero-downtime).
4. Проверит здоровье все сервисов (`Health Checks`) и при необходимости отправит алерт.

---

## 🔑 Шаг 1: Добавление ключей в GitHub Secrets (или GitLab CI)

Для того чтобы GitHub мог автоматически подключаться к вашему серверу и выполнять деплой, добавьте 3 секрета в вашем репозитории:

1. Перейдите в GitHub репозитории: **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions** $\rightarrow$ **New repository secret**.
2. Добавьте следующие переменные:

| Имя секрета | Описание | Пример значения |
| :--- | :--- | :--- |
| **`SSH_HOST`** | IP-адрес или домен вашего сервера | `194.58.120.45` или `app.substreamedu.com` |
| **`SSH_USER`** | Имя пользователя SSH на сервере | `root` или `ubuntu` |
| **`SSH_PRIVATE_KEY`** | Содержимое закрытого SSH-ключа (из `~/.ssh/id_rsa` на локальном ПК или сервере) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| **`PROJECT_DIR`** *(опционально)* | Путь к проекту на сервере | `/app` или `/home/ubuntu/substreamedu-go` |

---

## 🖥️ Шаг 2: Подготовка сервера (1 раз на сервере)

Убедитесь, что на вашем сервере добавлен публичный SSH-ключ (`~/.ssh/authorized_keys`), и проект склонирован по пути из `PROJECT_DIR`:

```bash
# Проверка доступности Docker Compose на сервере
docker compose version

# Разрешение прав на исполнение скрипта деплоя
cd /app  # или путь к вашему проекту
chmod +x deploy.sh
```

---

## 🎯 Шаг 3: Как проверить работу CD

Просто отправьте ваши изменения в ветку `main`:

```bash
git add .
git commit -m "feat: setup continuous delivery pipeline"
git push origin main
```

Зайдите во вкладку **Actions** в GitHub (или **CI/CD Pipelines** в GitLab). Вы увидите автоматический процесс сборки и деплоя!
