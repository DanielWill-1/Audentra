You are a senior full-stack engineer.

Your task is NOT to add features.

Your task is to reverse engineer this entire repository.

Read EVERY file before making assumptions.

Do NOT immediately write code.

Instead produce a complete architectural analysis.

For every page, route, component, hook, utility and API call identify:

- What it does
- Which data it reads
- Which data it writes
- Which database tables it expects
- Which authentication state it depends on
- Which storage buckets it uses
- Which edge functions or server functions it expects
- Which environment variables are required
- Which third-party APIs are used
- Which realtime subscriptions exist
- Which RPC functions exist
- Which cron jobs or scheduled functions exist

After reading the repository produce:

1. Complete project architecture
2. Data flow diagram
3. Authentication flow
4. Storage architecture
5. Missing backend services
6. Missing database schema
7. Missing Supabase configuration
8. Missing environment variables
9. Anything that would prevent npm run dev from functioning correctly.

Do not generate code until the analysis is complete.