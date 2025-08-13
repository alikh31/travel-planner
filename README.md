# Travel Planner

A collaborative travel itinerary planning application built with Next.js, allowing multiple users to create, plan, and vote on travel activities together.

## Features

- 🌍 **Collaborative Planning**: Create shared travel itineraries with friends and family
- 📅 **Day-by-Day Organization**: Plan activities organized by travel days
- 🗳️ **Voting System**: Vote on activities and suggestions to make group decisions
- 💡 **Activity Suggestions**: Members can suggest alternative activities
- 👥 **Group Management**: Add/remove members and manage permissions
- 🔐 **Secure Authentication**: Google OAuth integration for easy sign-in
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: Prisma with SQLite (easily configurable for PostgreSQL/MySQL)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm, yarn, pnpm, or bun
- Google OAuth credentials (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travel-planner
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your values:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-nextauth-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

4. **Set up Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Create credentials (OAuth 2.0 Client IDs)
   - Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs
   - Copy the client ID and secret to your `.env.local`

5. **Set up the database**
   ```bash
   npx prisma db push
   ```

6. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Creating an Itinerary

1. Sign in with your Google account
2. Click "New Itinerary" on the dashboard
3. Fill in trip details (title, destination, dates, description)
4. Click "Create Itinerary"

### Managing Activities

1. Open an itinerary
2. Select a day from the sidebar
3. Click "Add Activity" to add new activities
4. Fill in activity details (title, description, location, time, cost)
5. Choose if it's a group activity or individual

### Collaborative Features

1. **Adding Members**: Admins can add members by email address
2. **Voting**: Click thumbs up/down on activities to vote
3. **Suggestions**: Suggest alternative activities for existing items
4. **Group Activities**: Mark activities as group activities for everyone to participate

### Member Roles

- **Admin**: Can add/remove members, edit itinerary details, manage all activities
- **Member**: Can add activities, vote, and make suggestions

## Database Schema

The application uses the following main entities:

- **User**: Authentication and profile information
- **Itinerary**: Trip details and metadata
- **GroupMember**: User memberships in itineraries with roles
- **Day**: Individual days within an itinerary
- **Activity**: Planned activities for specific days
- **Suggestion**: Alternative suggestions for activities
- **Vote**: User votes on activities and suggestions

## API Endpoints

### Itineraries
- `GET /api/itineraries` - Get user's itineraries
- `POST /api/itineraries` - Create new itinerary
- `GET /api/itineraries/[id]` - Get specific itinerary
- `PUT /api/itineraries/[id]` - Update itinerary
- `DELETE /api/itineraries/[id]` - Delete itinerary

### Activities
- `POST /api/activities` - Create new activity

### Group Management
- `POST /api/itineraries/[id]/members` - Add member
- `PUT /api/itineraries/[id]/members` - Update member role
- `DELETE /api/itineraries/[id]/members` - Remove member

### Voting & Suggestions
- `POST /api/suggestions` - Create suggestion
- `POST /api/votes` - Vote on activity/suggestion
- `DELETE /api/votes` - Remove vote

## Production Deployment

### Environment Setup

1. Set up a production database (PostgreSQL recommended)
2. Update `DATABASE_URL` in your environment variables
3. Set `NEXTAUTH_URL` to your production domain
4. Generate a secure `NEXTAUTH_SECRET`

### Database Migration

```bash
npx prisma db push
# or for production with migrations
npx prisma migrate deploy
```

### Deploy Options

- **Vercel**: Easy deployment with built-in database options
- **Railway**: Simple database and application hosting
- **AWS/Google Cloud**: For more control and scalability

## Development

### Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── itinerary/     # Itinerary pages
│   └── page.tsx       # Home page
├── components/        # Reusable components
├── lib/              # Utilities and configurations
└── types/            # TypeScript type definitions

prisma/
└── schema.prisma     # Database schema
```

### Adding Features

1. Update the database schema in `prisma/schema.prisma`
2. Run `npx prisma db push` to update the database
3. Add API routes in `src/app/api/`
4. Create React components in `src/components/`
5. Add pages in `src/app/`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
