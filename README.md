This is a [Next.js](https://nextjs.org) URL shortener backed by Supabase.

## Auth flow

- Signup requires unique `username`, `email`, `password`, and password confirmation
- After signup, the user must verify a 6-digit email OTP
- After verification, login uses `username + password`
- Supabase issues and refreshes JWT session cookies
- Short-link redirect (`/{shortCode}`) is public, but create/edit/delete/list require login

## Supabase setup

1. Use your existing project (`wblinehakwnyeopajowz`).
2. In **Authentication > Providers**, enable Email and disable Google/OAuth if not needed.
3. In **Authentication > Settings**, keep **Confirm email** enabled.
4. In email template for signup confirmation, include OTP token text such as:
   - `Your URL Shortener code is {{ .Token }}`
5. Run SQL from `sql/auth_setup.sql` in the Supabase SQL editor.

This SQL adds:
- `public.profiles` table with unique lowercased username/email
- `user_id` ownership column on `public."URL"`
- trigger to create profile from `auth.users`
- row-level security policies for user ownership

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Important environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Docker (VPS via Traefik)

Build on a machine with enough RAM, push to Docker Hub, pull on the VPS (same pattern as Droply).

**`.env` on VPS:**

```env
DOMAIN=short.example.com
DOCKERHUB_USER=your-dockerhub-user
IMAGE_TAG=latest
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Add `https://DOMAIN` to Supabase **Authentication > URL configuration** (site URL + redirect URLs).

**Build and push (local):**

```powershell
$env:DOCKERHUB_USER = "your-dockerhub-user"
$env:IMAGE_TAG = "latest"
$env:NEXT_PUBLIC_SUPABASE_URL = "https://xxxx.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJ..."

docker login
docker compose build web
docker compose push web
```

**Deploy on VPS** (Traefik must already be running — see `../droply/VPS_HELP.md`):

```bash
cd /var/www/url-shortner
docker compose -f docker-compose.yml -f docker-compose.vps.yml pull
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d
```

Traefik routes `https://$DOMAIN` directly to the Next.js container on port 3000 (no Caddy layer).
