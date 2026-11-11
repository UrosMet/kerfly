# Kerfly

**Planer kuhinje za majstore.** Složiš kuhinju od modula (donji, zidni, visoki, fiokari, sudopera), a Kerfly izračuna šta treba kupiti i kako iseći: ploče po dekoru, HDF, kant u metrima, radnu ploču, okove, krojnu listu (CSV) i raspored delova na svakoj ploči.

**Isprobaj: https://urosmet.github.io/kerfly/**

*Kitchen planner for cabinet makers. Build a kitchen from cabinet modules and get the exact shopping list, a cutting list and a layout for every sheet. The app is in Serbian and English.*

## Šta radi

- **Podešavanja:** tržište (EU, SAD, UK), jedinice (mm ili inči), format i debljina ploča, dekori, šara, fuga, kant, ručice.
- **Sastavljanje:** elementi sa merama, crtež sa kotama i bojama, izbor ploče, HDF-a i ručica po elementu, radna ploča, provera grešaka u hodu.
- **Izveštaj:** spisak za kupovinu napisan rečenicama (i kao TXT), krojna lista po ploči (CSV), rasporedi ploča za štampu.
- Projekat se čuva u pregledaču i može da se izveze i uveze kao JSON. Nema naloga ni servera.
- Ugaoni elementi nisu podržani u ovoj verziji.

## Razvoj

```
npm install
npm run dev      # lokalno na http://localhost:5173
npm test         # Vitest (jedinični testovi jezgra i testovi interfejsa)
npm run build    # provera tipova + produkcioni build u dist/
```

Pravila za formule su u [CLAUDE.md](CLAUDE.md). Logika računanja je u `src/core` (čist TypeScript, sve mere u milimetrima), a interfejs u `src/ui`. Svaki tekst ide kroz i18n (`src/i18n`, srpski i engleski), a test proverava da oba jezika imaju iste ključeve.

## Objava

Svaki push na `main` pokreće GitHub Actions (`.github/workflows/pages.yml`): testovi, build i objava na GitHub Pages. Ako test padne, sajt se ne menja. Izvršavanja se vide na kartici Actions, odakle može i ručno da se pokrene ("Run workflow").

## Licenca

Još nije izabrana.
