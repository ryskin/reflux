# OpenAI Chat Flow - Пример

## Описание

Этот flow принимает текст на вход, отправляет его в OpenAI API и возвращает ответ.

## ID созданного flow

`ccebf1f4-e7a6-4e82-8351-f72bd89c3730`

## Структура flow

```
Webhook Input → Prepare Request → Call OpenAI API → Extract Response
```

### 1. **Webhook Input** (nodes.webhook.trigger)
Принимает POST запрос с текстом

### 2. **Prepare Request** (nodes.transform.execute)
Извлекает текст из входных данных

### 3. **Call OpenAI API** (nodes.http.request)
Отправляет запрос в OpenAI ChatGPT API

### 4. **Extract Response** (nodes.transform.execute)
Извлекает ответ из JSON ответа OpenAI

---

## Как использовать

### Шаг 1: Добавьте свой OpenAI API ключ

Вам нужно обновить flow и вставить свой API ключ:

```bash
# Получите текущий flow
curl http://localhost:4000/api/flows/ccebf1f4-e7a6-4e82-8351-f72bd89c3730

# Обновите вручную через UI:
# http://localhost:3002/flows/ccebf1f4-e7a6-4e82-8351-f72bd89c3730
```

Замените `YOUR_OPENAI_API_KEY_HERE` на ваш реальный ключ от OpenAI.

### Шаг 2: Посмотрите flow в UI

Откройте в браузере:
```
http://localhost:3002/flows/ccebf1f4-e7a6-4e82-8351-f72bd89c3730
```

Вы увидите визуальную схему с 4 нодами.

### Шаг 3: Запустите flow

**Через UI:**
1. Откройте flow
2. Нажмите "Execute Flow"
3. Посмотрите результат

**Через API:**
```bash
curl -X POST http://localhost:4000/api/flows/ccebf1f4-e7a6-4e82-8351-f72bd89c3730/execute \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"body": {"text": "Напиши короткую шутку про программистов"}}}'
```

### Шаг 4: Проверьте результат

```bash
# Посмотрите все запуски
curl http://localhost:4000/api/runs

# Или через UI
# http://localhost:3002/runs
```

---

## Полная спецификация flow

```json
{
  "name": "openai_chat",
  "version": "1.0.0",
  "description": "Отправляет текст в OpenAI и получает ответ",
  "spec": {
    "nodes": [
      {
        "id": "input",
        "type": "nodes.webhook.trigger",
        "params": {
          "method": "POST",
          "path": "/ask-ai"
        }
      },
      {
        "id": "prepare_request",
        "type": "nodes.transform.execute",
        "params": {
          "code": "outputs.prompt = inputs.body.text || inputs.body.message || 'Привет!';"
        }
      },
      {
        "id": "call_openai",
        "type": "nodes.http.request",
        "params": {
          "url": "https://api.openai.com/v1/chat/completions",
          "method": "POST",
          "headers": {
            "Authorization": "Bearer YOUR_OPENAI_API_KEY_HERE",
            "Content-Type": "application/json"
          },
          "body": {
            "model": "gpt-3.5-turbo",
            "messages": [
              {
                "role": "user",
                "content": "placeholder_will_be_replaced"
              }
            ],
            "temperature": 0.7,
            "max_tokens": 500
          }
        }
      },
      {
        "id": "extract_response",
        "type": "nodes.transform.execute",
        "params": {
          "code": "outputs.result = { prompt: inputs.prepare_request.prompt, response: inputs.call_openai.data.choices[0].message.content, model: inputs.call_openai.data.model };"
        }
      }
    ],
    "edges": [
      { "from": "input", "to": "prepare_request" },
      { "from": "prepare_request", "to": "call_openai" },
      { "from": "call_openai", "to": "extract_response" }
    ]
  },
  "tags": ["openai", "ai", "chat"]
}
```

---

## Модификации

### Изменить модель

В ноде `call_openai`, измените `model`:
```json
{
  "model": "gpt-4"  // или gpt-4-turbo
}
```

### Добавить системный промпт

В ноде `call_openai`, добавьте системное сообщение:
```json
{
  "messages": [
    {
      "role": "system",
      "content": "Ты helpful ассистент, который отвечает кратко и по делу."
    },
    {
      "role": "user",
      "content": "placeholder"
    }
  ]
}
```

### Настроить температуру

В ноде `call_openai`:
```json
{
  "temperature": 0.3  // Более детерминированные ответы
}
```

---

## Следующие шаги

1. **Добавьте память** - сохраняйте историю диалога
2. **Добавьте обработку ошибок** - если OpenAI недоступен
3. **Добавьте логирование** - сохраняйте все запросы/ответы
4. **Добавьте rate limiting** - ограничьте частоту запросов

---

## Проблемы?

### ❌ "Unauthorized"
Проверьте, что вы вставили правильный OpenAI API ключ.

### ❌ "Rate limit exceeded"
OpenAI ограничивает количество запросов. Подождите или обновите план.

### ❌ "Invalid API key"
API ключ должен начинаться с `sk-`

---

**Готово!** Теперь у вас есть рабочий flow с OpenAI 🤖
