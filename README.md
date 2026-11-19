# Packliste · Essensplaner · Wandergerichte

Eine interaktive Packliste als statische Website für GitHub Pages. Kein Build-Schritt, keine Abhängigkeiten.

- **Packliste:** Trips mit Name, Zeitraum (eintippen oder per Kalender wählen) und beliebig vielen Teilnehmenden, deren Namen optional sind. Die Reisearten Wandern und Stadt lassen sich kombinieren. Die Mengen werden aus der Reisedauer berechnet, mit Obergrenze. Items bekommen Tags („gemeinsam“, Personen). Dazu Packphasen, To-dos, Abhaken, Zurücksetzen, Drucken und Teilen per Link.
- **Essensplaner:** Wandertage × Frühstück / Snacks / Dinner. Anreise- und Abreisetag werden automatisch angepasst, einzelne Mahlzeiten lassen sich entfernen. Daraus entstehen eine Einkaufsliste, die Dehydrier-Batches und die Beutel zum Packen.
- **Reiseverlauf:** Die Reisetage als Leiste. Bei Kombi-Urlauben markierst du, welche Tage Wandern und welche Stadt sind. Die Mengen richten sich nach diesen Tagen.
- **Wandergerichte:** Rezeptesammlung nach dem Baukasten-Prinzip Carbs + Gemüse + Protein + Geschmack, plus ein Zutaten-Register. In jedem Gericht lassen sich Zutaten austauschen. Gramm, Wasser, Zeit und Zubereitung passen sich dabei an. Mit „Freestyle“ baust du eigene Gerichte zusammen und kannst sie speichern. Die Tipps sind auf das Kochen in einer einzigen Tasse ausgelegt.

## Auf GitHub Pages veröffentlichen

1. Auf GitHub ein neues Repository anlegen, z. B. `packliste`.
2. Den Inhalt dieses Ordners hochladen (*Add file → Upload files*, alles hineinziehen) und committen.
3. *Settings → Pages → Build and deployment*: als Quelle „Deploy from a branch“, Branch `main`, Ordner `/ (root)` wählen und speichern.
4. Nach ca. 1 Minute ist die Seite unter `https://<dein-name>.github.io/packliste/` erreichbar.

> Hinweis: Mit einem kostenlosen GitHub-Account sind das Repository und die Seite öffentlich. Wer den Link kennt, sieht die Stammdaten, also alle Items und Rezepte. Deine Haken und Trips liegen dagegen nur in deinem Browser.

## Wo was gespeichert wird

| Was | Wo | Wer sieht es |
|---|---|---|
| Items, Module, Rezepte (Stammdaten) | `data/packliste.js`, `data/rezepte.js` im Repo | alle |
| Trips, Haken, Mengen-Anpassungen, Essensplan | im Browser (localStorage) | nur dieses Gerät |
| Änderungen im Bearbeiten-Modus | im Browser | nur dieses Gerät, bis exportiert |

Niemand sonst kann deine Liste verändern. Wer im Bearbeiten-Modus etwas ändert, ändert nur die eigene Kopie im eigenen Browser.

**Stammdaten dauerhaft ändern:** Den Bearbeiten-Modus einschalten, die Änderungen machen und auf *Exportieren* klicken. Den Inhalt dann auf GitHub in `data/packliste.js` bzw. `data/rezepte.js` einfügen (Datei öffnen → Stift → alles ersetzen → *Commit changes*). Danach im Banner auf *Lokale Änderungen verwerfen* klicken, damit dein Browser wieder den Stand aus dem Repo zeigt.

## Mengenregeln

Jedes Item kann eine Regel haben:

```js
menge: { basis: 1, proTag: 1, max: 6 }
// Menge = aufrunden(basis + proTag × Reisetage), höchstens max
// 3 Tage → 4, 5 Tage → 6, 10 Tage → 6
```

- `proTag: 0.5` bedeutet ein Stück pro 2 Tage, `0.34` ein Stück pro 3 Tage.
- Ohne `proTag` ist die Menge einfach `basis` (Standard: 1).
- Eine abweichende Regel je Reiseart steht in `mengeJe`, z. B. `{ wandern: { basis: 2, proTag: 0.34, max: 4 } }`. Bei Kombi-Reisen gilt die größere Menge.
- In der Liste lässt sich die Menge pro Trip mit −/+ anpassen. Ein Doppelklick auf die Zahl stellt den berechneten Wert wieder her.
- Im Bearbeiten-Modus zeigt der Item-Dialog eine Vorschau für 1–14 Tage.

## Kombi-Urlaub: Mengen

Bei mehreren Reisearten zählt die Seite die Tage je Art aus dem Reiseverlauf. Pro Item gilt:
`Menge = größte Basis + Σ (proTag der Reiseart × Tage dieser Art)`, höchstens bis zur größten Obergrenze.
Items, die nur zu einer Reiseart gehören, erscheinen nur, wenn diese Art mindestens einen Tag hat.

## Austauschen & Freestyle

Jede Zutat im Register hat eine übliche `portion` (Gramm), einen Wasserbedarf `wasser` (ml pro Gramm) und eine `zeit`. Beim Austauschen wird die Grammzahl auf die übliche Portion der neuen Zutat umgerechnet (z. B. 100 g Couscous → 110 g Nudeln). Wasser und Zeit werden neu berechnet. Wird die Carb-Basis getauscht, erzeugt die Seite die Zubereitung neu aus den Bausteinen. Zutaten mit `klebt: true` (Ei, Käse, Püree) bekommen einen Backpapier-Hinweis. Gespeicherte Varianten und Freestyle-Gerichte landen in den lokalen Daten. Für alle Geräte: exportieren und ins Repo übernehmen.

## Tags

Über das Tag-Symbol an jedem Item:

- **kein Tag:** Jede Person packt ihr eigenes (z. B. Zahnbürste).
- **Person:** Nur diese Person braucht bzw. bringt es (z. B. BH → Person 2).
- **gemeinsam + Person:** Eins für alle, diese Person bringt es mit (z. B. Zelt → Person 1).
- **nur gemeinsam:** Noch offen. Das Item wird als „gemeinsam · wer?“ markiert.

Items mit `geteilt: true` in den Stammdaten starten mit dem Tag „gemeinsam“. Tags gelten pro Trip.

## Teilen

*Teilen* erzeugt einen Link, der Trip, Teilnehmende, Module, Tags und den Essensplan enthält. Die empfangende Person wählt „Ich bin …“ und kann dann die Ansicht „Was bringt … mit?“ nutzen. Haken werden nicht mitgeschickt.

## Dateien

```
index.html        Gerüst
css/style.css     Gestaltung (inkl. Druckansicht)
js/app.js         gesamte Logik
data/packliste.js Packlisten-Stammdaten (Felder oben in der Datei erklärt)
data/rezepte.js   Zutaten-Register und Rezepte (Felder oben in der Datei erklärt)
```

Die Seite funktioniert auch lokal: einfach `index.html` im Browser öffnen.
