# Pesticide Label Reader

A mobile-friendly React app for reading pesticide labels for Indian farmers. It extracts text from a label photo, lets the farmer review and correct it, and calculates a tank dose only from a reviewed, volume-based label rate. It can also show an approximate regional soil profile.

This app is a helper, not an official instruction. Follow the product label and local regulations. Soil and crop selections add context to the report; they never change the pesticide dose.

## What the app does

1. Select a state and an optional broad crop season/type.
2. The backend looks up a regional SoilGrids texture estimate. If the reference location has no mapped pixel, it searches nearby mapped pixels and labels the sample distance.
3. Take a photo with the device camera or choose one from the device (JPG/PNG/WebP, up to 5 MB).
4. The backend validates the image bytes and dimensions, auto-rotates EXIF orientation, and prepares a normalized grayscale image for Tesseract.js (`eng+hin`).
5. Review the original OCR text and correct product, rate, PHI, re-entry, safety, mixing, first-aid, and warning fields. Uncertain/missing values stay blank.
6. Confirm the review, choose tank capacity, and see a calculation only when the label rate and denominator are valid water volumes. Per-hectare rates are never converted to tank doses.
7. Optionally read the confirmed result aloud with the browser Web Speech API.

AI translation is optional. When configured, the server sends only confirmed label fields to the existing Groq-compatible chat-completions integration. AI output is rejected if it introduces numbers absent from the source. Do not treat an AI explanation as a replacement for the printed label.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm.
- Internet access for installing packages, SoilGrids lookups, and optional AI translation.
- A Groq API key only if you want AI translation. Label reading, review, dose calculation, and speech run without it.

## Local setup

From the project root:

```sh
npm run setup
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env
npm run dev
```

Open `http://localhost:5173`. The API listens at `http://localhost:3001`.

For AI translation, set `LLM_API_KEY` in `backend/.env`. Never put it in a `VITE_` variable or the frontend `.env` file. `LLM_API_URL` and `LLM_MODEL` are optional overrides; defaults use Groq's OpenAI-compatible endpoint and `openai/gpt-oss-20b`.

## Environment variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | HTTP port; defaults to `3001` (Render supplies its own). |
| `ALLOWED_ORIGINS` | Production: yes | Comma-separated frontend origins. Values are normalized to their exact origin. Plain HTTP localhost/127.0.0.1 dev origins are allowed on any port. |
| `LLM_API_KEY` | No | Server-only Groq API key for optional translation. Without it, the app reports that translation needs configuration. |
| `LLM_API_URL` | No | Chat completions URL override. Defaults to `https://api.groq.com/openai/v1/chat/completions`. |
| `LLM_MODEL` | No | Model override. Default: `openai/gpt-oss-20b`. |

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | No locally; yes in production | Backend URL, with or without a trailing `/api`. Leave blank locally to use the Vite proxy. Do not put secrets here. |

Copy `.env.example` files before adding local values. `.env` files are ignored by Git.

## Development checks

```sh
npm test                 # Backend and frontend tests
npm run lint             # Frontend lint
npm run build            # Production frontend build
```

Individual suites:

```sh
npm run test:backend
npm run test:frontend
```

Backend tests mock the AI and soil API calls for deterministic runs. They do not require a paid API key. The live SoilGrids service can still be checked by choosing a state in the app or by requesting `/api/label/soil?state=Maharashtra` while the backend is running.

## API

- `GET /api/health` — backend health.
- `GET /api/label/soil?state=Maharashtra` — SoilGrids surface texture estimate.
- `POST /api/label/extract` — multipart field `image`, JPG/PNG/WebP only.
- `POST /api/label/result` — reviewed fields, tank litres, language, state and crop type. The route rejects requests unless `confirmed` is exactly `true`.

## Deployment

The frontend is configured for Vercel (`frontend/` root); the backend is configured for Render (`backend/` root, `npm install`, `npm start`). Set `VITE_API_URL` on the frontend to the deployed backend URL. Set `ALLOWED_ORIGINS` on the backend to the exact deployed frontend origin. Add `LLM_API_KEY` to the backend's secret environment only when translation is wanted. The `render.yaml` blueprint includes the required backend secret placeholders.

## Safety and known limitations

- OCR can misread blurry, reflective, rotated, or small-print labels. The original OCR text and its confidence are shown for review; retake or upload a clearer photo if unsure.
- The app does not infer missing rates, harvest intervals, re-entry intervals, or safety instructions. Conflicting intervals are marked uncertain.
- A label rate per hectare/acre is not converted into a sprayer-tank dose because the app does not know the required spray volume per area.
- State-level soil estimates use a reference point or nearby mapped point, not the farmer's exact field. SoilGrids availability can change or be rate limited.
- Browser speech synthesis depends on the browser's available voices. The app reports when speech support is missing.
- A real Groq API key is not included. Translation remains unavailable until the operator supplies `LLM_API_KEY`.
- Files in `demo/` are test fixtures only. There are no demo-upload buttons in the farmer interface.
