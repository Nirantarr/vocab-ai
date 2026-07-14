# VocabAI Configuration

VocabAI now uses environment-based configuration for the backend, frontend, and Chrome extension. No source edits are required to switch between development and production.

## Backend

1. Copy [backend/.env.example](/D:/vocab-ai/backend/.env.example) to `backend/.env`.
2. Fill in the required values.
3. Start the frontend with `npm run dev` or `npm start` inside and backend using `nodemon server.js`.

Required backend variables:

- `NODE_ENV`
- `PORT`
- `CLIENT_URL`
- `CORS_ALLOWED_ORIGINS`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Optional backend variables:

- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `COOKIE_DOMAIN`
- `ACCESS_COOKIE_NAME`
- `REFRESH_COOKIE_NAME`

## Frontend

Frontend runtime config lives in:

- [frontend/.env.development](/D:/vocab-ai/frontend/.env.development)
- [frontend/.env.production](/D:/vocab-ai/frontend/.env.production)
- [frontend/.env.example](/D:/vocab-ai/frontend/.env.example)

Required frontend variables:

- `VITE_API_BASE_URL`

Optional frontend variables:

- `VITE_EXTENSION_ID`

Run the frontend inside `frontend` with:

- Development: `npm run dev`
- Production build: `npm run build`

## Extension

Extension manifests are generated from environment-specific templates:

- [extension/.env.development](/D:/vocab-ai/extension/.env.development)
- [extension/.env.production](/D:/vocab-ai/extension/.env.production)
- [extension/manifest.dev.json](/D:/vocab-ai/extension/manifest.dev.json)
- [extension/manifest.prod.json](/D:/vocab-ai/extension/manifest.prod.json)

Required extension variables:

- `EXTENSION_ENVIRONMENT`
- `EXTENSION_APP_NAME`
- `EXTENSION_API_BASE_URL`
- `EXTENSION_WEB_APP_URL`

Build the active extension manifest inside `extension` with:

- Development manifest: `npm run dev`
- Production manifest: `npm run build`

This writes the active [extension/manifest.json](/D:/vocab-ai/extension/manifest.json) file automatically.

## Deployment

1. Set production values in backend, frontend, and extension env files.
2. Run `npm run build` in `frontend`.
3. Run `npm run build` in `extension` to generate the production manifest.
4. Start the backend with production env vars and `npm start`.
5. Load the generated extension directory in Chrome or package it for release.

## Remaining Manual Steps

- Replace placeholder production domains and extension IDs with real deployment values.
- Rotate any existing secrets that were previously stored in local `.env` files.
