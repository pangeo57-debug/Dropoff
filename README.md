# Cash Flow

Mobile-first PWA για προσωπικό προϋπολογισμό και ταμειακή ροή, με προαιρετικό πρόγραμμα μαθημάτων. React + Vite + TypeScript, Tailwind, Lucide και Recharts. Λειτουργεί offline και κρατά τα δεδομένα τοπικά στον browser.

## Εκκίνηση
```bash
git clone https://github.com/pangeo57-debug/Dropoff.git cash-flow
cd cash-flow
npm install
npm run dev      # ανάπτυξη
npm run build    # έλεγχος TypeScript και παραγωγή στο dist/
```
Deploy: ανέβασε το `dist/` σε static host όπως Netlify ή Vercel. Για iPhone: Safari → Share → Add to Home Screen.

## Δεδομένα και αντίγραφα ασφαλείας
- Οι συναλλαγές αποθηκεύονται στο `localStorage` της συσκευής και δεν συγχρονίζονται αυτόματα μεταξύ συσκευών.
- Από τις Ρυθμίσεις μπορείς να κατεβάσεις αντίγραφο JSON και να το επαναφέρεις σε άλλη συσκευή. Κράτα αντίγραφα σε ασφαλές σημείο.
- Αν ο browser δεν επιτρέπει αποθήκευση ή γεμίσει ο διαθέσιμος χώρος, η εφαρμογή εμφανίζει προειδοποίηση. Κατέβασε backup πριν κλείσεις την καρτέλα.
- Ο προαιρετικός συγχρονισμός Supabase χρησιμοποιεί μυστικό token θυρίδας. Κράτησέ το ιδιωτικό και τρέξε ξανά το SQL των Ρυθμίσεων όταν αναβαθμίσεις υπάρχουσα εγκατάσταση.

## Δομή
- `src/storage/repository.ts` – interface `Repository` + επικύρωση δεδομένων και `LocalStorageRepository`.
- `src/store.ts` – η λογική (συναλλαγές, μαθήματα, αυτόματο έσοδο στην «Ολοκλήρωση»).
- `src/lib/stats.ts` – συγκεντρωτικά και Smart Insights.
- `src/constants.ts` – κατηγορίες.
- `src/components/` – UI.
