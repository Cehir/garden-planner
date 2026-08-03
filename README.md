# Gartenplaner

Ein visueller Gartenplaner für den Browser: Beete auf einer Gartenfläche einzeichnen, Pflanzen aus einer Bibliothek platzieren und den Plan verwalten.

## Funktionen

- **Beet-Editor** – Beete per Maus-Drag als Rechtecke einzeichnen, verschieben, an 8 Ankern skalieren und löschen
- **Pflanzen-Bibliothek** – 24+ vorbelegte Pflanzen (Tomate, Chili, Salat, Kräuter …) mit Namen, Emoji, Farbe, **optimalem Pflanzabstand**, **Höhe** und **Lichtbedarf** (Sonne/Halbschatten/Schatten); eigene Pflanzen hinzufügen, bearbeiten und löschen, Suche/Filter
- **Pflanzen platzieren** – In Beete setzen (Startgröße = optimaler Abstand), verschieben, skalieren und entfernen; Belegungsgrad des Beets in Prozent
- **Beschattungs-Analyse** – Schattenkegel der Pflanzen fest nach Norden (Sonne aus Süden, Faktor 2.0) im Editor einblenden; automatische Warnung, wenn eine höhere Pflanze eine kürzere mit Sonnenbedarf beschattet (z. B. Tomate ▷ Chili), Liste der Konflikte im Beet-Panel
- **Himmelsrichtungs-Indikator** – Fester Kompass (N/S/O/W) oben rechts im Editor-Viewport, unabhängig von Zoom/Scroll, mit Hinweis auf die Schattenrichtung
- **Beet-Details** – Name, Farbe, Maße, Position und Notizen pro Beet
- **Speichern & Laden** – Automatische Sicherung im Browser (`localStorage`, Key `gartenplaner-state-v1`), JSON-Export/-Import und Reset
- **Editor-Komfort** – cm-Raster (10/50 cm), Lineale, Zoom, anpassbare Gartengröße, Tastaturkürzel

## Technologie-Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) 19
- TypeScript
- SVG-basierter Editor (für Präzision und einfache Interaktion)
- `localStorage` für Persistenz

## Projektstruktur

```
src/
├── App.tsx                  # Layout, Werkzeug-/Auswahl-Zustand, Tastatur, Import/Export
├── App.css                  # Styling
├── types.ts                 # Datenmodell (Garden, Bed, Plant, PlacedPlant, …)
├── plants.ts                # Standard-Katalog mit Pflanzabständen, Höhe & Lichtbedarf
├── shadow.ts                # Schatten-Geometrie + Konflikt-Erkennung
├── store.tsx                # Reducer + localStorage-Persistenz
├── utils.ts                 # id-Generator, Grid-Snap
└── components/
    ├── Editor.tsx           # SVG-Fläche mit Zeichnen, Auswahl, Drag & Drop
    ├── Toolbar.tsx          # Werkzeuge, Zoom, Export/Import, Reset
    ├── PlantLibrary.tsx     # Pflanzen-Katalog mit Formularen
    └── BedDetails.tsx       # Panel für Garten- und Beet-Einstellungen
```

## Installation & Start

Voraussetzung: [Node.js](https://nodejs.org/) ≥ 20.

```bash
npm install
npm run dev        # Entwicklungsserver (Hot Reload)
npm run build      # TypeScript-Check + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
npm run lint       # Linting
```

## Bedienung

| Aktion | Bedienung |
|---|---|
| Beet zeichnen | Werkzeug **▭** (Taste `B`), Rechteck aufziehen |
| Verschieben | Beet oder Pflanze bei gedrückter Maustaste ziehen |
| Skalieren | Ausgewähltes Beet an den Ecken/Kanten ziehen; Pflanze am Griff |
| Pflanze setzen | Werkzeug **🌱** (`P`), in der Bibliothek eine Pflanze wählen, ins Beet klicken |
| Löschen | Auswählen und `Entf` (oder Buttons im Detailpanel) |
| Abbruch/Deselektieren | `Esc` |
| Passend einpassen | `F` |

Änderungen werden automatisch im Browser gespeichert. Über **Export** lässt sich der Plan als JSON-Datei herunterladen und mit **Import** wieder laden.

## Datenmodell

- `Garden` – Name, Breite/Höhe in cm
- `Bed` – Position, Größe, Name, Farbe, Notizen
- `Plant` – Katalog-Eintrag mit Name, Emoji, Farbe, Pflanzabstand (`spacing`), Höhe (`height`) und Lichtbedarf (`light` in cm)
- `PlacedPlant` – Pflanzen-Instanz in einem Beet (relative Position, aktuelle Größe)

## Lizenz

Lizenziert unter der [MIT-Lizenz](LICENSE).
