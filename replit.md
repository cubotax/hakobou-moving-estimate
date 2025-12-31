# Moving Estimate Application

## Overview
A Japanese moving estimate form application (引越し見積もりフォーム) that helps users calculate moving costs in 3 simple steps: address input, conditions selection, and estimate results.

## Project Structure
- `client/` - React frontend with Vite
- `server/` - Express.js production server
- `shared/` - Shared types and utilities

## Tech Stack
- **Frontend**: React 19, Vite 7, TailwindCSS 4, Radix UI components
- **Backend**: Express.js (for production static file serving)
- **Language**: TypeScript
- **Package Manager**: pnpm

## Development
- Run `pnpm run dev` to start the Vite dev server on port 5000
- The app uses Japanese localization

## Production
- Run `pnpm run build` to build both frontend and backend
- Run `pnpm run start` to start the production server

## Deployment
- Configured for autoscale deployment
- Build: `pnpm run build`
- Run: `node dist/index.js`
