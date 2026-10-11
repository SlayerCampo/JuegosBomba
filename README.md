# Juegos Bomba

Juegos sociales para navegador y móvil, construidos con React, TypeScript, Vite y PeerJS.

Actualmente incluye:

- **STOP Bomba**: categorías, letra aleatoria, respuestas simultáneas y revisión por votación.
- **Palabras Bomba**: flujo implementado pero todavía deshabilitado desde la pantalla principal.

## Desarrollo

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

La aplicación se abre en `http://localhost:5173`.

## Build, lint y pruebas

```bash
npm run build
npm run lint
npx oxlint src tests
npm run test:e2e
```

Las pruebas E2E usan Playwright y levantan Vite automáticamente. Los reportes generados se guardan en `playwright-report/` y `test-results/`, que están ignorados por Git.

## Arquitectura

- `App.tsx` controla la navegación entre pantallas.
- Cada juego tiene un `Flow` propio y un `NetworkProvider` aislado.
- `usePeerNetwork` encapsula PeerJS, conexiones, sala y mensajes.
- `useStopGameState` mantiene el estado autoritativo de STOP en el anfitrión.
- `StopFlow` traduce el protocolo PeerJS a cambios de vista y estados.
- `DictionaryProvider` carga una sola instancia del diccionario de Palabras Bomba mediante Web Worker.
- `useGameTimer` usa timestamps absolutos para que los clientes compartan el mismo límite.

## Red y compatibilidad

El multiplayer actual es **P2P con señalización por Internet** mediante PeerJS y servidores STUN. Aunque los dispositivos pueden estar en la misma Wi-Fi, la aplicación no es una LAN completamente autónoma. Para funcionar sin Internet se requiere desplegar un PeerServer propio dentro de la red local o implementar señalización local.

## Protocolo STOP

| Mensaje | Emisor | Destinatario | Validación del host |
|---|---|---|---|
| `PROFILE_READY` | Invitado | Anfitrión | Normaliza nombre y longitud |
| `STOP_LOBBY_STATE` | Anfitrión | Todos | Estado de jugadores del lobby |
| `STOP_START_GAME` | Anfitrión | Invitados | Categorías, letra, ronda y tiempo |
| `STOP_TRIGGER` | Jugador | Anfitrión / todos | Comprueba que todas las respuestas existan y empiecen por la letra |
| `STOP_SUBMIT_ANSWERS` | Jugador | Anfitrión | Recorta, normaliza espacios y valida la letra |
| `STOP_REVIEW_CATEGORY` | Anfitrión | Todos | Respuestas de la categoría actual |
| `STOP_VOTE` | Jugador | Anfitrión | Registra un voto por jugador y respuesta |
| `STOP_VOTES_SYNC` | Anfitrión | Invitados | Sincroniza votos recibidos |
| `STOP_CAT_RESOLVED` | Anfitrión | Invitados | Resolución y puntos de la categoría |
| `STOP_ROUND_RESULTS` | Anfitrión | Invitados | Puntos y marcadores de la ronda |
| `STOP_CHEAT_DETECTED` | Jugador | Todos | Solo aviso informativo tras ocultar la pestaña |

Las respuestas vacías valen cero. Las respuestas con letra incorrecta se marcan como **Letra incorrecta** y valen cero, incluso cuando la ronda termina por tiempo.

## Diccionario

`public/index.json` contiene aproximadamente 636 000 entradas. Se carga en un Web Worker, se replica una sola vez por flujo y se guarda en Cache Storage para evitar descargarlo en cada visita. El hosting debe servirlo comprimido con gzip o Brotli; el tamaño transferido dependerá de la configuración del servidor.

Si falla la carga, Palabras Bomba muestra un error y permite reintentar. No se aceptan palabras silenciosamente cuando el diccionario no está disponible.

## Pendiente

- Reconexión con retención de perfil y puntuación.
- Modo rápido configurable de 30, 60 y 90 segundos.
- PeerServer propio para LAN sin Internet.
- PWA completa con manifest, iconos y service worker.
- Más pruebas de desconexión, empates y rondas completas.
