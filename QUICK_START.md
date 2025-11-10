# REFLUX - Быстрый старт 🚀

## Что это?

**REFLUX** — платформа для создания автоматизированных workflows (потоков).

**Flow** = последовательность нод (шагов), которые выполняются автоматически.

```
Webhook → Transform → Send API
```

---

## Как создать свой первый Flow?

### 🎨 Способ 1: Через UI (самый простой)

1. **Откройте**: http://localhost:3002
2. **Нажмите**: "Create Flow"
3. **Заполните форму**:
   - Name: `my_workflow`
   - Version: `1.0.0`
   - Description: `Мой первый flow`
4. **Готово!** Система создаст простой flow с webhook и transform

### 💻 Способ 2: Через API

```bash
curl -X POST http://localhost:4000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_workflow",
    "version": "1.0.0",
    "description": "Мой первый flow",
    "spec": {
      "nodes": [
        {
          "id": "start",
          "type": "nodes.webhook.trigger",
          "params": { "method": "POST", "path": "/test" }
        },
        {
          "id": "process",
          "type": "nodes.transform.execute",
          "params": {
            "code": "outputs.result = { message: inputs.body, processed: true }"
          }
        }
      ],
      "edges": [
        { "from": "start", "to": "process" }
      ]
    },
    "tags": ["test"]
  }'
```

---

## Доступные ноды

### 🌐 Webhook Trigger
Принимает HTTP запросы

```json
{
  "type": "nodes.webhook.trigger",
  "params": {
    "method": "POST",
    "path": "/my-webhook"
  }
}
```

### 🔄 HTTP Request
Отправляет HTTP запросы

```json
{
  "type": "nodes.http.request",
  "params": {
    "url": "https://api.example.com/data",
    "method": "GET"
  }
}
```

### ⚙️ Transform
Выполняет JavaScript

```json
{
  "type": "nodes.transform.execute",
  "params": {
    "code": "outputs.result = inputs.data.map(x => x * 2)"
  }
}
```

---

## Полезные команды

```bash
# Список всех flows
curl http://localhost:4000/api/flows

# Запустить flow
curl -X POST http://localhost:4000/api/flows/[FLOW_ID]/execute \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"data": "test"}}'

# Список запусков
curl http://localhost:4000/api/runs

# Доступные ноды
curl http://localhost:4000/api/nodes

# Запустить тестовый flow
./test-e2e.sh
```

---

## Ссылки

- **UI**: http://localhost:3002
- **API**: http://localhost:4000
- **Flows**: http://localhost:3002/flows
- **Runs**: http://localhost:3002/runs
- **Nodes**: http://localhost:3002/nodes

---

## Примеры

### Пример 1: Простой echo

```bash
curl -X POST http://localhost:4000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "echo",
    "version": "1.0.0",
    "spec": {
      "nodes": [
        {
          "id": "webhook",
          "type": "nodes.webhook.trigger",
          "params": { "method": "POST", "path": "/echo" }
        },
        {
          "id": "echo",
          "type": "nodes.transform.execute",
          "params": {
            "code": "outputs.result = { received: inputs.body, time: Date.now() }"
          }
        }
      ],
      "edges": [{ "from": "webhook", "to": "echo" }]
    }
  }'
```

### Пример 2: API запрос

```bash
curl -X POST http://localhost:4000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fetch_user",
    "version": "1.0.0",
    "spec": {
      "nodes": [
        {
          "id": "fetch",
          "type": "nodes.http.request",
          "params": {
            "url": "https://jsonplaceholder.typicode.com/users/1",
            "method": "GET"
          }
        },
        {
          "id": "transform",
          "type": "nodes.transform.execute",
          "params": {
            "code": "outputs.result = { name: inputs.data.name, email: inputs.data.email }"
          }
        }
      ],
      "edges": [{ "from": "fetch", "to": "transform" }]
    }
  }'
```

---

## Документация

Полный туториал: `/docs/tutorials/CREATE_YOUR_FIRST_FLOW.md`

---

**Готово!** Теперь вы знаете как создавать workflows в REFLUX 🎉
