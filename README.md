# Ταμείο Καθηγητή (PWA)

Mobile-first εφαρμογή προγράμματος μαθημάτων + cashflow. React + Vite + TypeScript, Tailwind, Lucide, Recharts. Offline-first (LocalStorage + service worker).

## Νέο ρεπό
```bash
cp -r tutor-cashflow ~/my-new-repo && cd ~/my-new-repo
rm -rf node_modules dist && git init && npm install
npm run dev      # ανάπτυξη
npm run build    # παραγωγή στο dist/
```
Deploy: ανέβασε το `dist/` σε οποιοδήποτε static host (Netlify, Vercel, GitHub Pages). Σε iPhone: Safari → Share → Add to Home Screen.

## Δομή
- `src/storage/repository.ts` – interface `Repository` + `LocalStorageRepository`. Για Supabase φτιάξε νέα υλοποίηση και άλλαξε το export `repository`.
- `src/store.ts` – η λογική (συναλλαγές, μαθήματα, αυτόματο έσοδο στην «Ολοκλήρωση»).
- `src/lib/stats.ts` – συγκεντρωτικά και Smart Insights.
- `src/constants.ts` – κατηγορίες.
- `src/components/` – UI.
