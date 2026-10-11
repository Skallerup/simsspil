# Hjemliv

Et livssimulationsspil i 3D, der kører direkte i browseren. Opret en familie, byg og indret huset, og styr deres hverdag.

## Spil det

Åbn `index.html` via en webserver, eller slå GitHub Pages til (se nedenfor).

> Bemærk: Hvis du dobbeltklikker på `index.html` direkte fra computeren, virker det i de fleste browsere, men nogle browsere blokerer filer fra disken. Brug i så fald GitHub Pages eller en lokal server, fx `npx serve` eller `python3 -m http.server`.

## Læg det på GitHub Pages

1. Opret et nyt repository på GitHub.
2. Upload alle filerne (behold mappen `js`).
3. Gå til **Settings → Pages**.
4. Under **Branch** vælger du `main` og mappen `/ (root)`, og trykker **Save**.
5. Efter et minut ligger spillet på `https://<dit-brugernavn>.github.io/<repo-navn>/`.

## Funktioner

- Opret familie med udseende, tøj, personlighed og livsmål (op til 6 personer og 2 kæledyr)
- Byg vægge, rum, døre, vinduer, gulve og maling
- Køb, flyt, opgrader og sælg 43 møbler
- Samtaler, venskab, romantik, forlovelse og bryllup
- Behov, humør, færdigheder, job og skole
- Dag og nat, naboer og besøg
- Kæledyr, babyer og aldring gennem seks livsfaser
- Ønsker, livsmål og belønninger
- Gemmes automatisk i browseren

## Styring

| Tast | Funktion |
|---|---|
| Venstreklik | Vælg handling på møbler, personer og gulv |
| Højre træk / Q, E | Drej kameraet |
| Hjul | Zoom |
| W A S D | Flyt kameraet |
| Mellemrum, 1, 2, 3 | Pause og hastighed |
| V | Skift vægvisning |
| R | Drej møbel ved placering |

## Filer

| Fil | Indhold |
|---|---|
| `index.html` | Side, design og brugerflade |
| `js/data.js` | Spildata: møbler, job, træk, livsmål |
| `js/models.js` | 3D-modeller af personer, dyr og møbler |
| `js/world.js` | 3D-verden, kamera, lys og stifinding |
| `js/anim.js` | Animationer |
| `js/sim.js` | Simulationen |
| `js/ui.js` | Brugerflade og styring |
| `js/main.js` | Opstart og hovedløkke |

3D-grafikken bruger [three.js](https://threejs.org) (r128), som hentes fra cdnjs.
