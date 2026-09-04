# Aidoru Dashboard

Act as a Full-Stack Web Developer and UI/UX Designer specializing in modern, anime-themed web applications. 



Build a web application named "AIDORU". It is a full-featured web dashboard and interactive portal for the Telegram/WhatsApp bot application "Kelin-MD2" (Reference repo structure and features from: https://github.com/kelin132/Kelin-MD2.git, and visual layout inspiration from: https://github.com/kelin132/MOON-LIGHT.git).



---



### Core Tech Stack Requirements

1. Frontend: React / Next.js (or Vite + React) with Tailwind CSS, Lucide Icons, Framer Motion for smooth anime transitions, and Canvas-Confetti for reward animations.

2. Backend/Database: Node.js / Express or Next.js API routes connected directly to MongoDB (using Mongoose) to seamlessly read and write data with the existing Kelin-MD2 database schema.

3. Auth System: WhatsApp phone number + password authentication synced with the Kelin-MD2 user collection in MongoDB. First-time setup and password recovery are confirmed with a one-time code from the bot.



---



### UI/UX & Anime Aesthetics

- Design Theme: Vibrant, clean, sleek, and neat Anime aesthetic with dark/neon glassmorphism (glass cards, soft glowing borders, dynamic floating particles, and vibrant pastel accents).

- Key Visual Elements:

  - Feature high-quality anime figures/character art dynamically floating or integrated into sections.

  - Integrate Pokémon visual elements (Pokéballs, badges, animated sprite cards for items).

  - Modern Anime Circular Buttons: Custom circular navigation and action buttons with glowing hover effects, pulsing rings, and anime-styled iconography.

  - Interactive Layout: Clean responsive dashboard with collapsible sidebar, sleek navigation wheel/circular menu for mobile, and grid-based cards.



---



### Key Modules & Features to Implement



1. Authentication System

   - Login using the phone number registered with the bot and the website password.
   - First-time login and password recovery use `.otp` in a private WhatsApp chat.
   - Syncs directly with existing MongoDB user documents created by the Kelin-MD2 bot.

   - Session/JWT authentication for persistent login states.



2. Dashboard & User Profile Management

   - Display player stats: Virtual Coins/Money, Level, XP, Rank, Guild membership, and Inventory overview.

   - Profile Customization: Form to update user Name, Custom Bio, Profile Avatar/Banner, and preferred anime title badges.



3. "Start Journey" Feature

   - Interactive starter module for new players to choose their starter partner/companion, claim daily login streaks, and complete onboarding tasks.



4. Mart & Shop System

   - PokéMart Section: Buy Pokéballs (Great, Ultra, Master), Potions, Evolutionary Stones, and key items.

   - General Shop: Buy anime-themed items, profile customization cards, and boost items.

   - Real-time transaction handling that deducts user balance in MongoDB and pushes items into the user's inventory array.



5. Guild System

   - View list of existing Guilds (with member count, leaderboard ranking, and guild level).

   - "Join Guild" action with instant request/membership handling.

   - "Create Guild" modal requiring a minimum coin deposit, custom guild name, tag, and description.



6. Gambling & Arcade Zone

   - Bet / Gamble Module: High-Low card game or Coin Flip with clean anime coin animations and custom wager inputs.

   - Slots Machine: Interactive 3-reel slot machine game featuring Pokémon/anime symbols with jackpot sound effects and direct MongoDB balance updates.



---



### MongoDB Data Syncing & Schema Structure

- Ensure all API routes read the MongoDB database used by Kelin-MD2.
- Website sign-in uses the phone number registered with the bot plus a website
  password. First-time setup and password recovery create a six-digit code in the
  shared `users` collection; users retrieve it by sending `.otp` in a private
  WhatsApp chat. Passwords are stored only as salted scrypt hashes.
- The portal is intentionally read-only for bot data. Use Kelin-MD2 commands in
  WhatsApp to change balances, inventory, guilds, or other player state.

- Schema integration:

  - Users: Kelin-MD2 JID `_id` plus fields such as `name`, `money`, `bank`,
    `vault`, `orbs`, `diamonds`, `level`, `xp`, `inventory`, and `history`

  - Guilds: Kelin-MD2 guild documents with `name`, `owner`, `members`,
    `level`, `treasury`, `description`, and `icon`

  - Website credentials: `websitePasswordHash`, pending verification/reset code
    fields, and password timestamps on the user document. Legacy `websiteId` and
    related OTP fields remain readable for existing records but are no longer part
    of the visible phone-based sign-in flow.



---



### Code Deliverables Expected

1. Full folder structure setup with organized components (`components/ui`, `components/anime`, `pages/api`, `models`).

2. Express/Next.js routes handling MongoDB operations cleanly with error validation.

3. Tailwind config customized with anime color palettes (e.g., deep dark blues, glowing purples, hot pinks, cyan highlights).

4. Responsive design optimized for both mobile and desktop screens.

And transfer this to my repo called AIDORU

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aidoru.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bc58e5dc-daef-4f0c-b949-09964e3606b5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deployment configuration

The portal reads the existing Kelin-MD2 MongoDB database. The service will not work until
these environment variables are set in the hosting provider:

- `MONGO_URI` — the MongoDB connection string for the Kelin-MD2 database
- `SESSION_SECRET` — a long random value used to sign browser sessions

For Render, open the web service's **Environment** settings, add both variables, save them,
and redeploy. `MONGODB_URI` is also accepted as an alias for `MONGO_URI`, but `MONGO_URI`
is the recommended name. See `.env.example` for the expected format.
