# Stage 1: Expo web static build
FROM node:22-bookworm AS web
WORKDIR /src/pahar-pohori-app
COPY pahar-pohori-app/package.json pahar-pohori-app/package-lock.json* ./
RUN npm install
COPY pahar-pohori-app/ ./
RUN npx expo export --platform web

# Stage 2: FastAPI serves API + built web app
FROM python:3.12-slim
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=web /src/pahar-pohori-app/dist /app/pahar-pohori-app/dist
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
