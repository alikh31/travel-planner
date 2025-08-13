# 🚀 Travel Planner Deployment Guide

This guide covers how to deploy the Travel Planner application using Docker containers.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Google Cloud Console account for API keys
- GitHub account (for automated builds)

## 🔧 Environment Variables

The application requires the following environment variables:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Database connection string | ✅ | `file:/app/data/prod.db` |
| `NEXTAUTH_SECRET` | NextAuth.js encryption secret | ✅ | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application URL | ✅ | `https://yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ✅ | From Google Cloud Console |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API Key | ✅ | From Google Cloud Console |

## 🏗️ Docker Image

### Using Pre-built Image (Recommended)

```bash
# Pull the latest image from GitHub Container Registry
docker pull ghcr.io/alikh31/travel-planner:latest
```

### Building Locally

```bash
# Clone the repository
git clone https://github.com/alikh31/travel-planner.git
cd travel-planner

# Build the Docker image with Google Maps API key
# IMPORTANT: NEXT_PUBLIC_* variables must be provided at build time
docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key" \
  -t travel-planner .
```

## 🚀 Deployment Options

### Option 1: Docker Run (Simple)

```bash
# Create a data directory for persistence
mkdir -p ./data

# Run the container
docker run -d \
  --name travel-planner \
  -p 3000:3000 \
  -e NEXTAUTH_SECRET="your-secret-key-here" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e GOOGLE_CLIENT_ID="your-google-client-id" \
  -e GOOGLE_CLIENT_SECRET="your-google-client-secret" \
  -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key" \
  -v ./data:/app/data \
  --restart unless-stopped \
  ghcr.io/alikh31/travel-planner:latest
```

### Option 2: Docker Compose (Recommended)

1. Create a `.env` file with your configuration:

```bash
# Create environment file from example (if available)
cp .env.example .env 2>/dev/null || touch .env

# Edit the environment file
nano .env
```

**IMPORTANT**: NEXT_PUBLIC_* variables must be set before building the image as they are embedded in the client-side JavaScript at build time.

2. Set your environment variables in `.env`:

```env
# NextAuth.js
NEXTAUTH_SECRET=your-very-secure-secret-key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

3. Deploy with Docker Compose:

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

## 🔑 Setting Up Google Services

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### Google Maps API Setup

1. In Google Cloud Console, enable these APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Distance Matrix API
2. Go to "Credentials" → "Create Credentials" → "API Key"
3. Restrict the API key (recommended):
   - Application restrictions: HTTP referrers
   - Add your domain(s)
   - API restrictions: Select the enabled APIs above

## 🔒 Security Considerations

### Production Deployment

1. **Use HTTPS**: Always deploy with SSL/TLS certificates
2. **Secure Secrets**: Use container orchestration secrets (Kubernetes, Docker Swarm)
3. **Database Backups**: Regularly backup the `/app/data` volume
4. **API Key Restrictions**: Properly restrict Google API keys
5. **Firewall**: Only expose necessary ports (443/80 for web traffic)

### Example Production Docker Compose

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/alikh31/travel-planner:latest
    ports:
      - "3000:3000"
    environment:
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=https://yourdomain.com
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
    volumes:
      - app_data:/app/data
    restart: unless-stopped
    
  reverse-proxy:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=your@email.com"
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt

volumes:
  app_data:
  letsencrypt:
```

## 📊 Monitoring and Maintenance

### Health Checks

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

### Database Management

```bash
# Access the container
docker exec -it travel-planner sh

# Run Prisma commands
npx prisma studio
npx prisma db push
```

### Backup and Restore

```bash
# Backup database
docker cp travel-planner:/app/data/prod.db ./backup-$(date +%Y%m%d).db

# Restore database
docker cp ./backup-20240101.db travel-planner:/app/data/prod.db
docker restart travel-planner
```

## 🔄 Continuous Deployment

The repository includes GitHub Actions that automatically:

1. Run tests and linting
2. Build multi-architecture Docker images (AMD64, ARM64)
3. Push to GitHub Container Registry
4. Generate deployment summaries

Images are available at: `ghcr.io/alikh31/travel-planner:latest`

## 🆘 Troubleshooting

### Common Issues

1. **Database Permission Errors**
   ```bash
   # Fix permissions
   sudo chown -R 1001:1001 ./data
   ```

2. **Google API Errors**
   - Verify API keys are correctly set
   - Check API quotas in Google Cloud Console
   - Ensure APIs are enabled

3. **Memory Issues**
   ```bash
   # Increase Docker memory limit
   docker run --memory=2g ...
   ```

### Logs

```bash
# View application logs
docker logs -f travel-planner

# View all services logs
docker-compose logs -f
```

## 📞 Support

- GitHub Issues: [https://github.com/alikh31/travel-planner/issues](https://github.com/alikh31/travel-planner/issues)
- Documentation: Check README.md for development setup