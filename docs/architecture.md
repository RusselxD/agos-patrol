# Responders PWA Architecture

## Overview

The AGOS Responders app is a Progressive Web App (PWA) for field responders. It provides real-time flood monitoring data, push notification alerts, and offline alert acknowledgement. Mobile-first, installable, supports dark mode and Filipino/English languages.

## PWA Features

- **Installable** on Android and iOS via `vite-plugin-pwa` (Workbox)
- **Service worker** (`public/sw.js`) for push notifications and precaching
- **Offline support** — alert acknowledgements queued in localStorage, flushed on reconnect
- **Platform detection** — Android/iOS-specific install instructions

### Service Worker (`public/sw.js`)

Uses Workbox for precaching. Custom handlers for:

- **`push` event** — Parses notification data, shows native notification with vibration pattern per severity type, posts `PUSH_RECEIVED` message to all app clients
- **`notificationclick` event** — Opens/focuses app window, navigates to target URL

Vibration patterns:
- Critical: `[200, 100, 200, 100, 400]` ms
- Warning: `[200, 100, 200]` ms
- Blockage: `[300, 100, 300]` ms
- Announcement: `[200]` ms

## State Management

Context API only. Provider nesting in `MainLayout`:
```
CoreProvider → CoreGate → WebSocketProvider → FusionAnalysisProvider → BlockageProvider → WaterLevelProvider → WeatherProvider → NotificationProvider
```

### Contexts

| Context | Hook | Purpose |
|---------|------|---------|
| `CoreContext` | `useCoreHook()` | Responder profile from `GET /responder/{id}`, logout |
| `WebSocketContext` | `useWebSocket()`, `useWebSocketMessage()` | WS connection with exponential backoff (1s → 30s) |
| `WaterLevelContext` | `useWaterLevel()` | Sensor data via `sensor_update` WS messages |
| `BlockageContext` | `useWaterwayContext()` | Blockage status via `blockage_detection_update` WS |
| `WeatherContext` | `useWeather()` | Weather data via `weather_update` WS, enriched with icons/colors |
| `FusionAnalysisContext` | `useFusionAnalysis()` | Risk score via `fusion_analysis_update` WS |
| `NotificationContext` | `useNotificationHook()` | Unread alert count, listens for `PUSH_RECEIVED` from SW |
| `ThemeContext` | `useTheme()` | Light/dark/system mode (localStorage) |
| `I18nContext` | `useI18n()` | English/Filipino translation via `t(key)` |

### Page-Level Contexts

| Context | Hook | Page |
|---------|------|------|
| `AlertsPageContext` | `useAlertsPageHook()` | Alert list, filtering, chosen alert, offline queue flush |
| `VerifyPageContext` | `useVerify()` | Temporary responder data during OTP flow |

`CoreGate` waits for the authenticated responder profile before opening the WebSocket connection.

## Authentication

Responder authentication uses a JWT issued after OTP verification. The app keeps both `responderId` and `responderToken` in `localStorage`.

### Flow

```
Phone Lookup ──POST /responder/for-approval──► Backend sends OTP via SMS
     │
     ▼
OTP Verification ──POST /responder/verify-otp──► Success + responder_token
     │
     ▼
Store responderId + responderToken in localStorage ──► Navigate to /home
```

### Guards

- **`AuthGuard`** — Requires both `localStorage.responderId` and `localStorage.responderToken`. Missing either one redirects to `/verify`.
- **`InstalledGuard`** — Wraps app/verify routes and currently allows the route through while install enforcement is disabled in code.

## API Layer (`src/lib/api/`)

| File | Object | Endpoints |
|------|--------|-----------|
| `verify.ts` | `verifyAPI` | `POST /responder/for-approval`, `POST /responder/resend-otp/{id}`, `POST /responder/verify-otp` |
| `responder.ts` | `responderAPI` | `GET /responder/{id}`, `GET /responder/notif-preferences/{id}`, `PUT /responder/notif-preferences/{id}` |
| `alert.ts` | `alertsAPI` | `GET /responder/unread-alerts-count/{id}`, `GET /responder/alerts/{id}`, `POST /responder/acknowledge-alert` |
| `sensor.ts` | `sensorAPI` | `GET /sensor-devices/{locationId}/config/by-location` |

### Axios Interceptors (key difference from admin frontend)

**Request interceptor:** Converts camelCase keys → snake_case for request body and query params.
**Response interceptor:** Converts snake_case keys → camelCase for response data.

Can be bypassed per-request via `skipKeyConversion` / `skipResponseKeyConversion` config flags.

## Routing (`src/router.tsx`)

```
/
├── /home      → Home (InstalledGuard + AuthGuard + MainLayout)
├── /alerts    → Alerts (with AlertsPageProvider)
├── /me        → Profile
├── /install   → InstallGate
└── /verify    → VerifyLayout (with VerifyPageProvider)
    ├── /phone-lookup       → PhoneLookup
    └── /otp-verification   → OTPVerification
```

`/` redirects to `/home`.

## Pages

### Home
Real-time dashboard with 4 cards:

- **FusionAnalysisCard** — Risk tier (Low/Moderate/High/Critical) with triggered conditions
- **BlockageStatusCard** — 3-tier progress bar (clear → partial → blocked)
- **WaterLevelStatusCard** — Animated water gauge with wave SVG, metric cards for change rate and alert distances
- **WeatherConditionCard** — Weather icon, condition name, precipitation, last updated
- **ConnectionStatusBanner** — Auto-hides 3s after WS connects

### Alerts
Alert management with acknowledgement:

- **AlertTypeFilters** — Filter chips: all, critical, warning, announcement
- **AlertCard** — Compact card with type badge and timestamp
- **AlertDetails** — Bottom drawer with full message, acknowledgement form (textarea + submit), or acknowledgement status display
- **Offline queue** — Acknowledgements queued in localStorage when offline, flushed on `online` event

### Profile
Responder settings:

- **MainDetails** — Name, phone, location, connection status
- **PushNotifications** — Toggle switches per alert type (warning, critical, blockage, announcement)
- **LanguageToggle** — English / Filipino
- **ThemeToggle** — Light / Dark / System
- **AccountDetails** — Registration date, activation date, assigned site
- **ConnectionStatus** — WS connection state with manual reconnect button
- **Logout** — Clears localStorage, navigates to `/verify`

### Verify
Two-step OTP authentication:

1. **PhoneLookup** — Phone number input with normalization (`normalizePhoneNumber()` supports 09xx, 639xx, 9xx formats). Calls API, stores responder preview in context.
2. **OTPVerification** — 6-digit input. Displays “Demo OTP” when the backend returns a non-null `dev_otp`. On success: stores `responderId` and `responderToken` in localStorage. Handles `requiresResend` flag. Resend button.

### InstallGate
PWA install prompt:

- **AndroidInstall** — Handles `beforeinstallprompt` event, shows install button
- **IosInstall** — Instructions for iOS (Add to Home Screen)

## Push Notifications

### Registration Flow (`usePushNotifications` hook)

1. Register service worker at `/sw.js`
2. Request browser notification permission
3. `GET /push/vapid-public-key` → get VAPID key
4. `pushManager.subscribe()` → get push subscription
5. `POST /push/subscribe` → send subscription + responderId to backend with responder JWT authorization

### Notification Reception

1. SW receives `push` event → shows native notification with vibration
2. SW posts `PUSH_RECEIVED` to all app clients
3. `NotificationContext` receives message → increments unread count
4. `alertFeedback.ts` plays audio tone via Web Audio API:
   - Critical: 880Hz sine wave
   - Warning: 660Hz sine wave
   - Blockage/Announcement: lower frequencies

### Offline Acknowledgement Queue (`offlineQueue.ts`)

- `enqueueAcknowledgement(payload)` — Saves to localStorage queue
- `flushQueue()` — Sends all queued acks via API when online
- `AlertsPageContext` listens for `online` event and auto-flushes

## Utilities

| File | Functions |
|------|-----------|
| `formatter.ts` | `getTimeAgo()`, `formatDate()`, `formatTimestamp()`, `formatPHNumber()`, `capitalizeFirstLetter()` |
| `phone.ts` | `normalizePhoneNumber()`, `formatPhoneInputDisplay()`, `removeNonDigits()` |
| `weather.ts` | `getWeatherIcon(code)` → Lucide icon, `getWeatherColor(precip)` → color class |
| `alertFeedback.ts` | `triggerAlertFeedback(type)` — vibration + Web Audio tone |
| `platform.ts` | `detectPlatform()` → "android" / "ios" / "unknown" |
| `pwa.ts` | `isPwaInstalled()` — checks display-mode media queries |
| `offlineQueue.ts` | `enqueueAcknowledgement()`, `flushQueue()`, `getQueue()` |

## Internationalization (`src/lib/i18n/`)

Key-based translation system with fallback to English:

- `en.ts` — Full English translations
- `fil.ts` — Full Filipino translations
- `useI18n()` hook provides `t(key)` function and `locale` / `setLocale()`
- Locale stored in localStorage

Coverage: All user-facing text in Home, Alerts, Profile, Verify pages and navigation.

## Components

| Component | Description |
|-----------|-------------|
| `AppHeader` | Fixed top bar with AGOS logo and location name |
| `BottomNav` | 3-tab navigation (Home, Alerts with unread badge, Profile) |
| `Card` | Reusable card wrapper with shadow, dark mode support |
| `CardTitle` | Gray section header |
| `Page` | Page padding container |

## Key Differences from Admin Frontend

| Concern | Admin Frontend | Responders PWA |
|---------|---------------|----------------|
| Auth | JWT (access + refresh tokens) | JWT responder token (90-day) + `responderId` in localStorage |
| Field naming | snake_case directly | camelCase (axios auto-converts) |
| Target | Desktop browser | Mobile PWA |
| Push notifications | Sends them | Receives them |
| Offline support | None | Offline ack queue |
| i18n | None | English + Filipino |
| Dark mode | None | Light / Dark / System |
| Camera feed | Live camera frames via `VideoContext` | None |
| AI analysis | SSE streaming | None |
| Data export | Excel export | None |
