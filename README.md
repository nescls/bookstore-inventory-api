# Bookstore Inventory API

**Español** · [English](README.en.md)

API REST para la gestión de inventario de librerías con cálculo del precio de venta sugerido
a partir de tasas de cambio en tiempo real. Construida con TypeScript, NestJS, TypeORM,
PostgreSQL y Zod para la prueba técnica de Nextep.

- **API desplegada:** https://bookstore-inventory-api-154220862638.us-east1.run.app
- **Documentación interactiva (Swagger):** https://bookstore-inventory-api-154220862638.us-east1.run.app/docs
- **Postman:** [`postman/`](postman/) (colección + entornos local y producción)
- [Especificación](docs/spec/specification.md) · [Tickets](docs/README.md)

## Lo pedido en el documento y lo que se añadió

### Lo pedido (cumplido)

| Requisito del documento                                                                                 | Estado | Dónde                                                  |
| ------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| Modelo `Book` (`id`, `title`, `author`, `isbn`, `cost_usd`, `selling_price_local`, `stock_quantity`, …) | ✅     | `entities/book.entity.ts`                              |
| CRUD: `POST/GET /books`, `GET/PUT/DELETE /books/{id}`                                                   | ✅     | `books.controller.ts`                                  |
| Listado con paginación opcional                                                                         | ✅     | `page`, `limit`                                        |
| Opcionales: `GET /books/search?category=` y `GET /books/low-stock?threshold=10`                         | ✅     | `books.controller.ts`                                  |
| `POST /books/{id}/calculate-price` con API de tasas de cambio                                           | ✅     | `pricing.service.ts`                                   |
| Margen del 40 %, guarda `selling_price_local` y devuelve el cálculo detallado                           | ✅     | `utils/calculate-price.ts`                             |
| `cost_usd > 0`, `stock_quantity >= 0`, ISBN válido (10 o 13), sin ISBN duplicados                       | ✅     | `dto/books.schemas.ts`, restricción única en BD        |
| Si la API de cambio falla, usar una tasa por defecto                                                    | ✅     | última tasa guardada (`exchange_rates`)                |
| Errores apropiados (400, 404, 500, 503)                                                                 | ✅     | `common/filters/error.filter.ts`                       |
| README, colección de Postman, Docker                                                                    | ✅     | este archivo, `postman/`, `Dockerfile`, `compose.yaml` |
| Despliegue en la nube con base de datos gestionada                                                      | ✅     | Cloud Run + Cloud SQL (PostgreSQL 16)                  |
| Postman apuntando a la URL pública                                                                      | ✅     | `postman/production.postman_environment.json`          |

### Extras añadidos

| Extra                           | Detalle                                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Validación con Zod**          | Todas las entradas se validan con esquemas estrictos: rechazan campos desconocidos, escrituras de campos controlados por el servidor y consultas inválidas. |
| **Swagger / OpenAPI 3.1**       | UI pública en `/docs` y documento en `/docs-json`, generados desde los mismos esquemas Zod; un test comprueba que las respuestas reales coinciden.          |
| **Logger con pino**             | Un registro JSON por petición, más avisos/errores con el código de error. Destino local (`logs/app.log` + stdout) o Google Cloud Logging con una variable.  |
| **Errores en español e inglés** | Mensajes localizados con `Accept-Language` (español por defecto) y códigos de error estables (`bookNotFound`, `duplicateIsbn`, …).                          |
| **ISBN robusto**                | Valida dígito de control, acepta separadores y equivale ISBN-10 con ISBN-13 para detectar duplicados. Se guarda y devuelve tal como se envía.               |
| **Precisión monetaria**         | `decimal.js` con redondeo half-up; se rechazan importes que no caben con exactitud en un número JSON (`amountOutOfRange`).                                  |
| **Recálculo automático**        | Al cambiar `cost_usd` en un `PUT`, el precio se recalcula y se guarda en una sola actualización.                                                            |
| **Concurrencia**                | Transacciones y bloqueo de filas para ediciones y cálculos simultáneos.                                                                                     |
| **Tasas guardadas**             | Cada tasa válida se persiste; es el respaldo cuando el proveedor falla o expira (sin límite de antigüedad).                                                 |
| **Semilla idempotente**         | `npm run db:seed` (o `SEED_ON_START=true`) inserta libros de ejemplo y una tasa inicial sin sobrescribir datos.                                             |
| **Migraciones**                 | Esquema versionado con migraciones de TypeORM que se aplican al iniciar el contenedor.                                                                      |
| **Calidad y CI**                | Biome + Prettier, 23 pruebas de integración con PostgreSQL real, GitHub Actions (build, docker, lint) y `cloudbuild.yaml` para desplegar en Cloud Run.      |
| **Arquitectura modular**        | Módulos NestJS por funcionalidad con `dto/`, `entities/` y `utils/` (funciones puras).                                                                      |

> Diferencia deliberada con el ejemplo del documento: la moneda local es **EUR** (tasa USD→EUR), como
> en la respuesta de ejemplo, y el ISBN se conserva tal como se envía.

## Requisitos previos

- Docker con Compose (ejecución recomendada)
- Node.js 24.x y npm (solo para ejecutar fuera de Docker)
- Puertos libres: 3000 (API), 55432 (base de datos) y 55433 (base de datos de pruebas)

## Instalación y ejecución

### Con Docker

Las credenciales son solo valores por defecto de desarrollo local.

```sh
docker compose up --build -d --wait
docker compose exec api node dist/scripts/seed.js   # datos de ejemplo + tasa inicial
curl http://localhost:3000/books
```

Sin conexión, pasa una tasa explícita: `docker compose exec -e SEED_EXCHANGE_RATE=0.85 api node dist/scripts/seed.js`.
Las migraciones se aplican al iniciar. La semilla solo inserta lo que falta y nunca sobrescribe.

```sh
docker compose logs api
docker compose down
```

### En el equipo (sin contenedor de la API)

Copia `.env.example` a `.env` (no subas credenciales).

```sh
npm ci
docker compose up -d --wait db
node --env-file=.env --import tsx scripts/migrate.ts
node --env-file=.env --import tsx scripts/seed.ts
node --env-file=.env --import tsx src/main.ts
```

También puedes exportar las variables y usar `npm run db:migrate`, `npm run db:seed` y `npm run dev`.
Compila con `npm run build` y ejecuta con `npm start`.

### Variables de entorno

| Variable                   | Propósito                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | URL de PostgreSQL (obligatoria); usa TLS si el proveedor lo exige                         |
| `PORT`                     | Puerto HTTP, por defecto 3000                                                             |
| `NODE_ENV`                 | `production` oculta los detalles de diagnóstico en las respuestas                         |
| `EXCHANGE_RATE_URL`        | Por defecto `https://api.exchangerate-api.com/v4/latest/USD`                              |
| `EXCHANGE_RATE_TIMEOUT_MS` | Entero de 1 a 30000, por defecto 5000                                                     |
| `SEED_EXCHANGE_RATE`       | Tasa positiva opcional, solo para inicializar la semilla sin conexión                     |
| `SEED_ON_START`            | `true` ejecuta la semilla tras las migraciones al iniciar el contenedor (por defecto, no) |
| `LOG_LEVEL`                | `trace`…`fatal` o `silent`; por defecto `info`                                            |
| `LOG_DIR`                  | Carpeta del logger local (por defecto `logs`)                                             |
| `GOOGLE_CLOUD_LOG_NAME`    | Si se define, los logs van a Google Cloud Logging en lugar del archivo local              |
| `TEST_DATABASE_URL`        | Base de datos desechable para pruebas; su nombre debe terminar en `_test`                 |

## Uso de la API

Sin autenticación en esta versión. Las rutas coinciden con el documento (sin prefijo `/api/v1`) y el JSON usa `snake_case`.

| Método | Ruta                                | Comportamiento                                      |
| ------ | ----------------------------------- | --------------------------------------------------- |
| POST   | `/books`                            | Crear libro; 201                                    |
| GET    | `/books`                            | Listado paginado                                    |
| GET    | `/books/search?category=Literatura` | Categoría exacta, sin distinguir mayúsculas         |
| GET    | `/books/low-stock?threshold=10`     | Libros con stock estrictamente menor al umbral      |
| GET    | `/books/{id}`                       | Obtener por ID; 404 si no existe                    |
| PUT    | `/books/{id}`                       | **Actualización parcial**; conserva campos omitidos |
| DELETE | `/books/{id}`                       | Eliminación permanente; 204 y luego 404             |
| POST   | `/books/{id}/calculate-price`       | Calcula, guarda y devuelve el detalle; 200          |

Los tres listados aceptan `page` (por defecto 1) y `limit` (por defecto 20, máximo 100), ordenados por ID
ascendente, y responden con `data`, `page`, `limit`, `total` y `totalPages`. Los parámetros desconocidos se rechazan.

```sh
curl -X POST http://localhost:3000/books \
  -H 'Content-Type: application/json' \
  -d '{"title":"El Quijote","author":"Miguel de Cervantes","isbn":"978-84-376-0494-7","cost_usd":15.99,"stock_quantity":25,"category":"Literatura Clásica","supplier_country":"ES"}'
curl 'http://localhost:3000/books/search?category=literatura%20clásica&page=1&limit=10'
curl 'http://localhost:3000/books/low-stock?threshold=10'
curl -X POST http://localhost:3000/books/1/calculate-price
curl -X PUT http://localhost:3000/books/1 -H 'Content-Type: application/json' -d '{"cost_usd":20}'
curl -X DELETE http://localhost:3000/books/1
```

Respuesta de `calculate-price`:

```json
{
  "book_id": 1,
  "cost_usd": 15.99,
  "exchange_rate": 0.85,
  "cost_local": 13.59,
  "margin_percentage": 40,
  "selling_price_local": 19.03,
  "currency": "EUR",
  "calculation_timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Validación.** ISBN-10/13 con dígito de control válido; se guarda y devuelve tal como se envía (sin espacios
sobrantes) y una clave canónica interna ISBN-13 garantiza la unicidad. Título 1–300 caracteres, autor 1–200,
categoría 1–100, país ISO alfa-2, stock entero 0–2147483647, costo positivo (máximo 999999999999.99, dos
decimales). Las ediciones vacías, campos desconocidos o campos del servidor (`id`, fechas, `selling_price_local`,
`isActive`, `deletedBy`) devuelven 400. Un libro nuevo tiene `selling_price_local` nulo.

## Cálculo de precios

Costo local = `cost_usd` × tasa USD→EUR, redondeado half-up a 2 decimales; se suma un 40 % de **margen sobre el costo**
y se redondea de nuevo. El ejemplo del documento (15.99 × 0.85) da 13.59 y 19.03.

Cada cálculo consulta al proveedor y guarda las tasas válidas. Si el proveedor falla, expira o responde algo
inválido, se usa la última tasa guardada (sin límite de antigüedad); si no hay ninguna, responde 503
`exchangeRateUnavailable`. Un cambio real de `cost_usd` en un `PUT` recalcula el precio antes de una única
actualización; si el cálculo falla, el libro no cambia.

## Errores y logging

Usa `Accept-Language: es`, `es-VE`, `en` o `en-US`; sin coincidencia se usa español. Ejemplo de error:

```json
{
  "error": {
    "code": "exchangeRateUnavailable",
    "path": "/books/1/calculate-price"
  },
  "message": "No hay una tasa de cambio disponible."
}
```

`error.details` se omite en producción. Nunca se registran cuerpos, cabeceras ni credenciales.

**Logger (pino).** Un registro JSON por petición (método, URL, estado, duración), un aviso `Request rejected` (4xx)
o un error `Request failed` (5xx) con el código, y un aviso cuando se usa la tasa guardada.

- **Local (por defecto):** stdout y `logs/app.log` (`LOG_DIR` cambia la carpeta).
- **Externo:** con `GOOGLE_CLOUD_LOG_NAME` los registros van solo a Google Cloud Logging, con las credenciales
  estándar de Google. Si no se pueden cargar al iniciar, avisa por stderr y usa el logger local.

## Documentación de la API

Swagger UI es público en `/docs` y el documento OpenAPI 3.1 en `/docs-json`. Los esquemas de petición y respuesta
se generan desde los mismos esquemas Zod que validan (`dto/books.schemas.ts`, `dto/books.responses.ts`); un test
verifica que las respuestas reales coinciden. No se usa `@nestjs/swagger` porque no soporta TypeScript 7.

## Pruebas y Postman

```sh
npm ci
docker compose --profile test up -d --wait test-db
npm run typecheck
npm run lint        # formato con Prettier (lo usa el CI)
npm run lint:code   # lint con Biome
npm test
npm run build
```

Las pruebas usan una base de datos aparte en el puerto 55433 y un servidor local que simula el proveedor de tasas,
por lo que no necesitan la API real. Nunca apuntes `TEST_DATABASE_URL` a datos reales.

Importa `postman/bookstore.postman_collection.json` y elige el entorno `Bookstore local` o `Bookstore production`
(`baseUrl` es una variable). Ejecuta la colección en orden: crea y elimina su propio ejemplo.

## Despliegue

API en Google Cloud: **https://bookstore-inventory-api-154220862638.us-east1.run.app**

| Pieza         | Servicio                                                           |
| ------------- | ------------------------------------------------------------------ |
| API           | Cloud Run (`us-east1`), construida con el `Dockerfile`             |
| Base de datos | Cloud SQL para PostgreSQL 16 (`db-f1-micro`), gestionada           |
| Secreto       | `DATABASE_URL` en Secret Manager, inyectado en tiempo de ejecución |

El contenedor aplica las migraciones al iniciar; con `SEED_ON_START=true` también ejecuta la semilla, así que los
libros de ejemplo y la tasa USD→EUR inicial existen sin comandos manuales. Cloud SQL se alcanza por socket Unix
(`postgresql://USUARIO:CLAVE@/BD?host=/cloudsql/PROYECTO:REGION:INSTANCIA`). Cloud Run escala a cero, por lo que la
primera petición tras un tiempo inactivo puede tardar unos segundos.

```sh
gcloud run deploy bookstore-inventory-api --source . --region us-east1 \
  --allow-unauthenticated --max-instances 1 \
  --add-cloudsql-instances PROYECTO:us-east1:INSTANCIA \
  --set-secrets DATABASE_URL=database-url:latest \
  --set-env-vars NODE_ENV=production,SEED_ON_START=true,EXCHANGE_RATE_TIMEOUT_MS=5000
```

`cloudbuild.yaml` construye la imagen y la despliega en Cloud Run cuando se hace push a `main`
(con un trigger de Cloud Build). `--max-instances 1` evita migraciones concurrentes al iniciar.

## Pendiente y trabajo futuro

Pendiente: validación de tokens, roles y permisos, borrado lógico con autor real, y un cron matutino de tasas con
horario y zona acordados. No hay frontend, inventario por sucursal, recálculo masivo ni API de administración de tasas.

## Arquitectura

```text
src/
  main.ts, app.ts, app.module.ts, router.ts
  modules/
    books/           controller, service, module, routes
      dto/           books.schemas.ts (peticiones), books.responses.ts (respuestas)
      entities/      book.entity.ts
      utils/         isbn.ts, serialize-book.ts
    exchange-rates/  service, module, entities/, utils/is-valid-rate.ts, utils/provider-rate.ts
    pricing/         service, module, utils/calculate-price.ts
  common/
    errors/          ApiError y mensajes localizados
    filters/         error.filter.ts (filtro global de excepciones)
    logging/         pino: archivo local o Google Cloud Logging
    utils/           parse.ts, resolve-language.ts
  docs/              OpenAPI y Swagger UI
  database/          data-source, module, migrations/
scripts/             migrate.ts, seed.ts
```

Los controladores manejan HTTP; los servicios, la persistencia y la lógica. `BooksService` usa `PricingService`, que
usa `ExchangeRatesService`; la transacción de la actualización se pasa hasta el guardado de la tasa para conservar
las garantías de una sola actualización y de reversión. Las funciones puras viven en `utils/`.
Los términos del dominio están en [`CONTEXT.md`](CONTEXT.md) y la especificación y tickets en [`docs/`](docs/README.md).
