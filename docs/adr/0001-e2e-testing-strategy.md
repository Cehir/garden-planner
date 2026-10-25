# 0001 – E2E-Tests mit Playwright und Geometrie-Assertions

- Status: angenommen
- Datum: 2026-10-25

## Kontext

Nach fast jeder UI-Änderung stand „manuell prüfen“ im Plan bzw. PR: Beet zeichnen, ziehen,
an allen acht Anfassern skalieren, Pflanze setzen, Export/Import, Druckdialog, mobile
Seitenleiste. Die Vitest-Suite (React Testing Library auf happy-dom) prüft Komponentenlogik,
kennt aber kein Layout: Bugs wie abgeschnittene Lineal-Beschriftungen (#35, #36) oder eine
mobile Seitenleiste ohne Inhalt (#28) kann sie grundsätzlich nicht finden.

## Entscheidung

- **Playwright Test** als eigene E2E-Suite in `e2e/` (`npm run e2e`), nur als devDependency.
  Getestet wird der Produktions-Build über `vite preview`, in Chromium Desktop und Chromium
  mit Pixel-7-Viewport (`*.mobile.spec.ts`). RTL bleibt für Komponentenlogik.
- Elemente werden **per Rolle/Name** gefunden, nicht über `data-testid`. Dafür bekommen auch
  SVG-Elemente echte zugängliche Namen – das nützt zugleich Screenreadern.
- Visuelles wird mit **Geometrie-Assertions** geprüft (Bounding-Boxen innerhalb des Gartens
  bzw. des Viewports, Sichtbarkeit), **nicht mit Screenshot-Vergleichen**.
- Erzeugende Abläufe laufen über die UI; alle anderen Tests starten aus einem Zustand, der vor
  dem Laden in `localStorage` gelegt wird (Fixture `seedState`).
- Beim Schreiben gefundene Bugs werden als Issue erfasst und mit `test.fail()` plus Issue-Verweis
  festgehalten, nicht nebenbei behoben.
- Durchgesetzt wird die Suite von GitHub Actions (für öffentliche Repos kostenlos); Git-Hooks
  in `.githooks/` (ohne zusätzliche Abhängigkeit) geben nur schnelleres Feedback. Beides folgt
  in eigenen PRs nach der Einrichtung der Suite; bis dahin wird `npm run e2e` von Hand ausgeführt.

## Alternativen

- **Mehr RTL/happy-dom-Tests auf `<App/>`:** keine neuen Abhängigkeiten, aber ohne Layout –
  `getScreenCTM`/`getBBox` müssten gefälscht werden, die eigentlichen Bugs blieben unsichtbar.
- **Vitest Browser Mode:** echte Browser im bestehenden Runner, aber schwächer bei
  App-weiten Abläufen (Downloads, Popup des Druckfensters, Viewport-Wechsel).
- **Screenshot-Snapshots (`toHaveScreenshot`):** fangen jede Abweichung, aber die
  Schriftdarstellung unterscheidet sich zwischen lokalem Linux und Ubuntu in CI – das hieße
  doppelte Baselines oder Docker, und jede gewollte UI-Änderung erfordert neue Baselines.
  Kann ergänzt werden, falls ein Bug auftaucht, den Geometrie nicht beschreiben kann.
- **husky/lefthook für Hooks:** komfortabel, aber eine weitere Abhängigkeit für zwei Skripte.

## Folgen

- Jeder UI-Bugfix bekommt einen E2E-Regressionstest.
- Einmalig `npx playwright install chromium` pro Rechner (~120 MiB im Nutzer-Cache).
- Neue SVG-Elemente brauchen zugängliche Namen, sonst sind sie für die Suite unerreichbar.
