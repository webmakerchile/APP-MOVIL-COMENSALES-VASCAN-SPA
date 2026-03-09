# Sistema de Inscripción de Comensales - Vascan SPA

## Overview
Casino/cafeteria meal management system for enterprise dining. Workers register their daily meal preferences through a mobile app, generating digital vouchers (QR codes) for meal pickup. Admins manage menus, users, and casinos via a web panel.

## Architecture
- **Backend**: Express.js + TypeScript on port 5000
- **Database**: PostgreSQL with Drizzle ORM
- **Mobile App**: React Native (Expo) on port 8081
- **Admin Web Panel**: React SPA served at `/admin` on port 5000
- **Auth**: Session-based with bcryptjs password hashing
- **Auto-seed**: Database seeds automatically on first startup
- **Static files**: `public/` directory served statically (case studies, etc.)

## Data Model
- **Users**: Authenticated via Chilean RUT + password. Roles: admin, comensal, interlocutor
- **Casinos**: Dining locations/venues  
- **Minutas**: Daily menus with up to 5 options per date per casino. Each has a `familia` field (almuerzo, desayuno, colación, almuerzo_fds, cena, once)
- **Pedidos**: Meal orders linking users to their selected menu option
- **Periodos**: Enrollment time windows

## Key Files
### Backend
- `shared/schema.ts` - Drizzle schema with all entities
- `server/routes.ts` - Full CRUD API endpoints + auto-seed
- `server/storage.ts` - Database access layer with CRUD operations
- `server/db.ts` - Database connection

### Mobile App
- `lib/auth-context.tsx` - Auth state management with AsyncStorage
- `lib/query-client.ts` - React Query + API utilities
- `app/login.tsx` - Login screen with RUT authentication
- `app/(main)/home.tsx` - Menu listing (minutas) screen with familia badges
- `app/(main)/minuta-detail.tsx` - Menu option selection (up to 5 options) + QR voucher

### Admin Web Panel
- `web/src/admin.html` - React SPA with Tailwind CSS (served at /admin)
  - Dashboard with stats
  - Usuarios: Full CRUD (create, edit, delete, toggle active, search)
  - Casinos: Full CRUD (create, edit, activate/deactivate)
  - Minutas: Full CRUD per casino with familia filter, multi-casino assignment, clone feature
  - Consolidation report (production summary per day)
  - Bulk upload from Excel (users + minutas)

### Static Pages
- `public/casos-de-estudio/vascan-sistema-comensales.html` - WebMakerChile case study

## API Endpoints
### Auth
- `POST /api/auth/login` - Login with RUT + password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user

### Usuarios CRUD
- `GET /api/usuarios` - List all users
- `POST /api/usuarios` - Create user
- `PUT /api/usuarios/:id` - Update user
- `DELETE /api/usuarios/:id` - Delete user

### Casinos CRUD
- `GET /api/casinos` - List active casinos
- `GET /api/casinos/all` - List all casinos (incl. inactive)
- `POST /api/casinos` - Create casino
- `PUT /api/casinos/:id` - Update casino
- `DELETE /api/casinos/:id` - Soft-delete (deactivate) casino

### Minutas CRUD
- `GET /api/minutas` - List all minutas
- `GET /api/minutas/:casinoId` - Get minutas for a casino
- `POST /api/minutas` - Create minuta (supports `casinoIds` array for multi-casino)
- `PUT /api/minutas/:id` - Update minuta
- `DELETE /api/minutas/:id` - Soft-delete (deactivate) minuta
- `POST /api/minutas/:id/clonar` - Clone minuta to new date/casinos

### Other
- `POST /api/pedidos` - Create meal order
- `GET /api/pedidos/:userId` - Get user's orders
- `GET /api/reportes/consolidacion?casinoId=X&fecha=Y` - Consolidation report
- `POST /api/usuarios/upload` - Bulk user upload from Excel
- `POST /api/minutas/upload` - Bulk minuta upload from Excel
- `GET /api/plantillas/usuarios` - Download users Excel template
- `GET /api/plantillas/minutas` - Download minutas Excel template
- `GET /api/seed` - Manual seed trigger
- `GET /admin` - Admin web panel

## Business Rules
- **Comensal**: Max 1 pedido per minuta (per day)
- **Interlocutor**: Multiple pedidos per day, always forced to Opcion 1
- **Minutas**: 5 options (3 required, 2 optional), familia categorization
- **Bulk Upload**: Excel with columns RUT, Nombre, Apellido, Rol, Casino (name or UUID). Default password = first 4 digits of RUT
- **Super Admin**: RUT `21212011-1` (hidden from all user listings)

## Test Credentials
- Comensal: RUT `12345678-9`, password `123456`
- Admin: RUT `11111111-1`, password `123456`
- Interlocutor: RUT `22222222-2`, password `123456`
- Super Admin: RUT `21212011-1`, password `peseta832`

## Design
- Dark theme with golden/yellow accent (#D4A843)
- Poppins font family (mobile), Inter (web)
- Vascan SPA branding with logo
- Bundle ID: `com.vascan.comensales`

## Deployment
- Target: autoscale
- Build: `npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=server_dist`
- Run: `npm run server:prod`
