# Sistema de Inscripción de Comensales - Vascan SPA

## Overview
Casino/cafeteria meal management system for enterprise dining. Workers register their daily meal preferences through a mobile app, generating digital vouchers (QR codes) for meal pickup. Admins manage menus and users via a web panel.

## Architecture
- **Backend**: Express.js + TypeScript on port 5000
- **Database**: PostgreSQL with Drizzle ORM
- **Mobile App**: React Native (Expo) on port 8081
- **Admin Web Panel**: React SPA served at `/admin` on port 5000
- **Auth**: Session-based with bcryptjs password hashing

## Data Model
- **Users**: Authenticated via Chilean RUT + password. Roles: admin, comensal, interlocutor
- **Casinos**: Dining locations/venues  
- **Minutas**: Daily menus with 3-4 options per date per casino
- **Pedidos**: Meal orders linking users to their selected menu option
- **Periodos**: Enrollment time windows

## Key Files
### Backend
- `shared/schema.ts` - Drizzle schema with all entities
- `server/routes.ts` - API endpoints (auth, minutas, pedidos, casinos, consolidation, bulk upload)
- `server/storage.ts` - Database access layer
- `server/db.ts` - Database connection

### Mobile App
- `lib/auth-context.tsx` - Auth state management with AsyncStorage
- `lib/query-client.ts` - React Query + API utilities
- `app/login.tsx` - Login screen with RUT authentication
- `app/(main)/home.tsx` - Menu listing (minutas) screen
- `app/(main)/minuta-detail.tsx` - Menu option selection + QR voucher

### Admin Web Panel
- `web/src/admin.html` - React SPA with Tailwind CSS (served at /admin)
  - Dashboard, Consolidation report, Bulk upload, Minutas viewer

## API Endpoints
- `POST /api/auth/login` - Login with RUT + password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user
- `GET /api/casinos` - List casinos
- `GET /api/minutas/:casinoId` - Get minutas for a casino
- `POST /api/pedidos` - Create meal order (comensal: 1/day, interlocutor: multiple, forced option 1)
- `GET /api/reportes/consolidacion?casinoId=X&fecha=Y` - Consolidation report
- `POST /api/usuarios/upload` - Bulk user upload from Excel (multer + xlsx)
- `GET /api/seed` - Seed test data
- `GET /admin` - Admin web panel

## Business Rules
- **Comensal**: Max 1 pedido per minuta (per day)
- **Interlocutor**: Multiple pedidos per day, always forced to Opción 1
- **Bulk Upload**: Excel with columns RUT, Nombre, Apellido, Rol, Casino_ID. Default password = first 4 digits of RUT

## Test Credentials
- Comensal: RUT `12345678-9`, password `123456`
- Admin: RUT `11111111-1`, password `123456`
- Interlocutor: RUT `22222222-2`, password `123456`

## Design
- Dark theme with golden/yellow accent (#D4A843)
- Poppins font family (mobile), Inter (web)
- Vascan SPA branding with logo
- Bundle ID: `com.vascan.comensales`
