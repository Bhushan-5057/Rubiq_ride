# Ride Booking Backend

Backend scaffold for a ride booking app using Node.js, Express, MongoDB, JWT auth, and Firebase social login.

## Features
- Email/password registration and login
- JWT authentication with role in payload
- Firebase social login (verify ID token via firebase-admin)
- `User` model with roles: rider, passenger, admin
- Input validations with express-validator
- Organized folder structure

## Folder Structure
```
src/
  app.js
  server.js
  config/
    db.js
    firebaseAdmin.js
  controllers/
    auth.controller.js
  middleware/
    auth.middleware.js
  models/
    User.model.js
  routes/
    auth.routes.js
  services/
    auth.service.js
  validations/
    auth.validation.js
.env.example
```

## Setup
1. Copy `.env.example` to `.env` and fill values.
2. Ensure MongoDB is running and `MONGODB_URI` is correct.
3. For Firebase social login, create a service account in Firebase Console and copy credentials into env (private key must have literal `\n`).

## Scripts
- `npm run dev` – start with nodemon
- `npm start` – start production server

## API
- POST `/api/v1/auth/register` { email, password, name, contactNumber?, gender?, role? }
- POST `/api/v1/auth/login` { email, password }
- POST `/api/v1/auth/social-login` { idToken }
- GET `/api/v1/auth/me` (Bearer token)

## JWT Payload
```
{
  sub: "<userId>",
  role: "passenger|rider|admin",
  iat, exp
}
```

## Notes
- Password is hashed with bcrypt before save.
- `User.password` is not returned in API responses.
- For social login, users are created with provider `firebase` and default role `passenger` if they don't exist.
