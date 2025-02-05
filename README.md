# Swipe-Based Event Discovery App

This project is a Tinder-style swipe interface built with Next.js for discovering local events. It fetches event data from Ticketmaster’s API for Baltimore (ZIP 21230). Users can swipe 'Yes' or 'No' to like or skip events.

## Setup and Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure API key:
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and add your Ticketmaster API key.
3. Run the app:
   ```bash
   npm run dev
   ```

## Deployment

- Push the project to GitHub and deploy on Vercel.
- Set `TICKETMASTER_API_KEY` in Vercel environment variables before deployment.
