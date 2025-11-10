# Как создать свой первый Flow в REFLUX

## Что такое Flow?

**Flow (Поток)** — это автоматизированный workflow, состоящий из последовательности шагов (нод). Каждая нода выполняет одну задачу, а данные передаются между нодами.

### Пример простого Flow:

```
Webhook Trigger → Transform Data → Send to API
```

1. **Webhook Trigger** - принимает HTTP запрос
2. **Transform Data** - обрабатывает данные
3. **Send to API** - отправляет результат

## Способы создания Flow

### 🎨 Способ 1: Через UI (визуальный редактор)

#### Шаг 1: Откройте UI
Перейдите на http://localhost:3002

#### Шаг 2: Создайте новый Flow
1. Нажмите **"Create Flow"** на главной странице
2. Или перейдите в **"Flows"** → **"Create Flow"**

#### Шаг 3: Заполните форму
- **Flow Name**: `my_first_workflow` (без пробелов)
- **Version**: `1.0.0`
- **Description**: `Мой первый тестовый workflow`
- **Tags**: `test, demo`

#### Шаг 4: Нажмите "Create Flow"
Система автоматически создаст простой flow с двумя нодами:
- Webhook trigger (триггер)
- Transform (обработка данных)

#### Шаг 5: Просмотрите Flow
После создания вы попадете на страницу с визуализацией вашего flow через React Flow canvas.

---

### 💻 Способ 2: Через API (программно)

Создайте flow через REST API:

```bash
curl -X POST http://localhost:4000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_api_workflow",
    "version": "1.0.0",
    "description": "Flow созданный через API",
    "spec": {
      "nodes": [
        {
          "id": "start",
          "type": "nodes.webhook.trigger",
          "params": {
            "method": "POST",
            "path": "/my-webhook"
          }
        },
        {
          "id": "process",
          "type": "nodes.transform.execute",
          "params": {
            "code": "outputs.result = { message: inputs.data, processed: true }"
          }
        },
        {
          "id": "send",
          "type": "nodes.http.request",
          "params": {
            "url": "https://webhook.site/your-unique-url",
            "method": "POST",
            "body": "{{steps.process.output}}"
          }
        }
      ],
      "edges": [
        { "from": "start", "to": "process" },
        { "from": "process", "to": "send" }
      ]
    },
    "tags": ["api", "demo"]
  }'
```

---

## Структура Flow Spec

Flow описывается в формате JSON со следующей структурой:

```typescript
{
  "nodes": [
    {
      "id": "unique_step_id",        // Уникальный ID шага
      "type": "nodes.category.name", // Тип ноды
      "params": {                    // Параметры ноды
        "param1": "value1"
      }
    }
  ],
  "edges": [
    {
      "from": "step1_id",   // От какого шага
      "to": "step2_id"      // К какому шагу
    }
  ]
}
```

---

## Доступные типы нод

### 1. **Webhook Trigger** - `nodes.webhook.trigger`
Принимает HTTP запросы для запуска workflow.

**Параметры:**
```json
{
  "method": "POST",      // HTTP метод (GET, POST, PUT, DELETE)
  "path": "/my-webhook"  // URL путь
}
```

**Выход:**
```json
{
  "body": {},      // Тело запроса
  "headers": {},   // HTTP заголовки
  "query": {}      // Query параметры
}
```

---

### 2. **HTTP Request** - `nodes.http.request`
Выполняет HTTP запрос к внешнему API.

**Параметры:**
```json
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token"
  },
  "body": {}  // Для POST/PUT
}
```

**Выход:**
```json
{
  "status": 200,
  "data": {},      // Ответ от API
  "headers": {}
}
```

---

### 3. **Transform** - `nodes.transform.execute`
Выполняет JavaScript код для обработки данных.

**Параметры:**
```json
{
  "code": "outputs.result = inputs.data.map(x => x * 2)"
}
```

**Доступные переменные:**
- `inputs` - входные данные от предыдущих шагов
- `outputs` - объект для записи результатов

**Пример:**
```javascript
// inputs.data = [1, 2, 3]
outputs.result = inputs.data.map(x => x * 2);
// outputs.result = [2, 4, 6]
```

---

## Примеры готовых Flow

### Пример 1: Простой webhook → ответ

```json
{
  "name": "echo_webhook",
  "version": "1.0.0",
  "description": "Просто возвращает полученные данные",
  "spec": {
    "nodes": [
      {
        "id": "receive",
        "type": "nodes.webhook.trigger",
        "params": { "method": "POST", "path": "/echo" }
      },
      {
        "id": "echo",
        "type": "nodes.transform.execute",
        "params": {
          "code": "outputs.result = { received: inputs.body, timestamp: Date.now() }"
        }
      }
    ],
    "edges": [
      { "from": "receive", "to": "echo" }
    ]
  },
  "tags": ["simple", "echo"]
}
```

---

### Пример 2: API запрос → обработка → webhook

```json
{
  "name": "api_pipeline",
  "version": "1.0.0",
  "description": "Получает данные из API, обрабатывает и отправляет в webhook",
  "spec": {
    "nodes": [
      {
        "id": "fetch",
        "type": "nodes.http.request",
        "params": {
          "url": "https://jsonplaceholder.typicode.com/posts/1",
          "method": "GET"
        }
      },
      {
        "id": "process",
        "type": "nodes.transform.execute",
        "params": {
          "code": "outputs.result = { title: inputs.data.title.toUpperCase(), processed: true }"
        }
      },
      {
        "id": "send",
        "type": "nodes.http.request",
        "params": {
          "url": "https://webhook.site/your-url",
          "method": "POST",
          "body": "{{steps.process.output}}"
        }
      }
    ],
    "edges": [
      { "from": "fetch", "to": "process" },
      { "from": "process", "to": "send" }
    ]
  },
  "tags": ["api", "pipeline"]
}
```

---

### Пример 3: Параллельная обработка (будущее)

```json
{
  "name": "parallel_processing",
  "version": "1.0.0",
  "description": "Обрабатывает данные параллельно",
  "spec": {
    "nodes": [
      {
        "id": "start",
        "type": "nodes.webhook.trigger",
        "params": { "method": "POST", "path": "/parallel" }
      },
      {
        "id": "process_a",
        "type": "nodes.transform.execute",
        "params": { "code": "outputs.result = inputs.data * 2" }
      },
      {
        "id": "process_b",
        "type": "nodes.transform.execute",
        "params": { "code": "outputs.result = inputs.data + 10" }
      },
      {
        "id": "merge",
        "type": "nodes.transform.execute",
        "params": {
          "code": "outputs.result = { doubled: inputs.process_a, added: inputs.process_b }"
        }
      }
    ],
    "edges": [
      { "from": "start", "to": "process_a" },
      { "from": "start", "to": "process_b" },
      { "from": "process_a", "to": "merge" },
      { "from": "process_b", "to": "merge" }
    ]
  },
  "tags": ["parallel", "advanced"]
}
```

---

## Как тестировать Flow

### 1. Через UI
1. Откройте flow: http://localhost:3002/flows/[flow_id]
2. Нажмите кнопку **"Execute Flow"**
3. Система запустит workflow
4. Вы будете перенаправлены на страницу с результатами

### 2. Через API
```bash
# Получить ID вашего flow
curl http://localhost:4000/api/flows

# Запустить flow
curl -X POST http://localhost:4000/api/flows/[FLOW_ID]/execute \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"data": "test"}}'
```

### 3. Просмотр результатов
- **В UI**: http://localhost:3002/runs
- **Через API**: `curl http://localhost:4000/api/runs`

---

## Распространенные ошибки

### ❌ Ошибка: "Node not found"
**Причина**: Тип ноды указан неправильно.

**Решение**: Проверьте доступные типы:
```bash
curl http://localhost:4000/api/nodes
```

### ❌ Ошибка: "Invalid flow spec"
**Причина**: JSON структура flow неправильная.

**Решение**: Проверьте:
- Все `nodes` имеют `id`, `type`, `params`
- Все `edges` имеют `from` и `to`
- `from` и `to` ссылаются на существующие `id` нод

### ❌ Ошибка: "Cyclic dependency"
**Причина**: В flow есть циклическая зависимость (A → B → A).

**Решение**: Убедитесь что граф направленный и ациклический (DAG).

---

## Следующие шаги

1. **Создайте свой первый flow** через UI
2. **Запустите его** и посмотрите результаты
3. **Измените параметры** и запустите снова
4. **Добавьте новые ноды** через API

### Полезные ссылки
- **API Documentation**: http://localhost:4000/health
- **UI Dashboard**: http://localhost:3002
- **Available Nodes**: http://localhost:3002/nodes
- **Your Flows**: http://localhost:3002/flows

---

## Нужна помощь?

**Посмотрите примеры:**
```bash
# Все flows в системе
curl http://localhost:4000/api/flows

# Детали конкретного flow
curl http://localhost:4000/api/flows/[FLOW_ID]
```

**Запустите тестовый flow:**
```bash
./test-e2e.sh
```

Этот скрипт создаст тестовый flow и покажет как он работает.
