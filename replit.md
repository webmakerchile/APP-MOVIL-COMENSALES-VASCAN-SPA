# Sistema de Inscripción de Comensales - Vascan SPA

## Overview
Casino/cafeteria meal management system for enterprise dining. Workers register their daily meal preferences through a mobile app, generating digital vouchers (QR codes) for meal pickup.

## Architecture
- **Backend**: Express.js + TypeScript on port 5000
- **Database**: PostgreSQL with Drizzle ORM
- **Mobile App**: React Native (Expo) on port 8081
- **Auth**: Session-based with bcryptjs password hashing

## Data Model
- **Users**: Authenticated via Chilean RUT + password. Roles: admin, comensal, interlocutor
- **Casinos**: Dining locations/venues  
- **Minutas**: Daily menus with 3-4 options per date per casino
- **Pedidos**: Meal orders linking users to their selected menu option
- **Periodos**: Enrollment time windows

## Key Files
- `shared/schema.ts` - Drizzle schema with all entities
- `server/routes.ts` - API endpoints (auth, minutas, pedidos, casinos, seed)
- `server/storage.ts` - Database access layer
- `server/db.ts` - Database connection
- `lib/auth-context.tsx` - Auth state management with AsyncStorage
- `lib/query-client.ts` - React Query + API utilities
- `app/login.tsx` - Login screen with RUT authentication
- `app/(main)/home.tsx` - Menu listing (minutas) screen
- `app/(main)/minuta-detail.tsx` - Menu option selection + QR voucher

## API Endpoints
- `POST /api/auth/login` - Login with RUT + password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user
- `GET /api/casinos` - List casinos
- `GET /api/minutas/:casinoId` - Get minutas for a casino
- `POST /api/pedidos` - Create meal order
- `GET /api/seed` - Seed test data

## Test Credentials
- Comensal: RUT `12345678-9`, password `123456`
- Admin: RUT `11111111-1`, password `123456`
- Interlocutor: RUT `22222222-2`, password `123456`

## Design
- Dark theme with golden/yellow accent (#D4A843)
- Poppins font family
- Vascan SPA branding with logo
- Bundle ID: `com.vascan.comensales`
