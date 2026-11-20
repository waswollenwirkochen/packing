# Urlaubsplanung

Urlaube gemeinsam planen und unterwegs alles griffbereit haben. Das Ganze ist eine statische Website für GitHub Pages, ohne Server und ohne Build-Schritt.

| Reiter | Was er kann |
|---|---|
| **Urlaube** | Alle Urlaube auf einen Blick, neuen Urlaub anlegen (Wo, Wann, Wer), Import aus Excel |
| **Weltkarte** | Alle Reisen auf einer Karte: Route als Orte (Luftlinie), GPX-Tracks, Fotos pro Ort, Statistik und Review |
| **Planung** | Tagesplan wie eine Tabelle: Datum, Art des Tages, Programm, Von/Nach, km, Dauer, Höhenmeter, Highlights, Unterkunft, Hinweise. Summen, Kartenansicht fürs Handy, Excel-Export |
| **Unterwegs** | Bereich „Allgemein“ (Notizen, Offline-Karten …) und alle Tage als Liste – heute ist aufgeklappt. Dateien einfach auf einen Tag ziehen |
| **Kosten** | Wer hat was bezahlt, für wen; Saldo pro Person und Vorschlag mit möglichst wenigen Überweisungen |
| **Packliste** | Interaktive Packliste mit Mengen nach Reisedauer, Tags (gemeinsam/Person), Haken pro Person |
| **Essen** | Essensplaner für Wandertage mit Einkaufs- und Dehydrierliste |
| **Rezepte** | Wandergerichte mit Austausch-Werkbank und Freestyle-Baukasten |

## Datenschutz: Wer sieht was?

Die Website (dieses Repo) ist öffentlich, **deine Urlaubsdaten sind es nicht**.

- Jeder Urlaub bekommt einen eigenen, zufälligen Schlüssel (AES-256-GCM). Tagesplan, Kosten, Packliste und Tickets werden **im Browser verschlüsselt** und erst dann in dein **privates Daten-Repo** hochgeladen. GitHub sieht nur unlesbaren Zeichensalat.
- Welche Urlaube dir gehören, steht in `keys/keyring.enc`. Diese Datei ist mit deinem **Passwort** verschlüsselt. Mit Daten-Repo, Token und Passwort kommst du auf jedem neuen Gerät an alle deine Urlaube.
- **Einladen:** Über „Einladen“ entsteht ein Link, der den Schlüssel *genau dieses einen Urlaubs* enthält. Wer ihn öffnet, kann diesen Urlaub sehen und bearbeiten. Andere Urlaube bleiben für diese Person unlesbar.
- Der Einladungs-Link enthält auch den Token für das Daten-Repo. Deshalb: nur direkt verschicken (Signal, WhatsApp …), nie öffentlich posten. **Zugang entziehen:** auf GitHub einen neuen Token erstellen, den alten löschen und Mitreisende neu einladen.
- Wer welche Person ist („Ich bin …“), Token und Passwort-Schlüssel bleiben auf dem jeweiligen Gerät.

## Einmalig einrichten (5 Minuten)

1. **Privates Daten-Repo anlegen:** auf github.com → „+“ → „New repository“, Name z. B. `packing-data`, **Private**, Haken bei „Add a README file“ → „Create repository“.
2. **Token erstellen:** [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
   - Name: `Urlaubsplanung`, Ablauf: 1 Jahr
   - Repository access: **Only select repositories → packing-data**
   - Permissions → Repository permissions → **Contents: Read and write**
   - „Generate token“ und den Token kopieren (beginnt mit `github_pat_`).
3. **In der Website verbinden:** Zahnrad (Einstellungen) → Daten-Repo `dein-name/packing-data`, Token einfügen, Passwort wählen (mind. 8 Zeichen, gut merken!) → „Verbinden“.

Danach werden alle Urlaube automatisch synchronisiert: nach jeder Änderung, beim Öffnen der Seite und jede Minute, solange sie offen ist. Der Punkt neben der Urlaubs-Auswahl zeigt den Status: grün = synchronisiert, gelb = speichert, grau = nur lokal / offline.

## Tickets & Unterlagen

Zu jedem Tag kannst du PDFs, Bilder, Buchungsbestätigungen usw. hinterlegen, bis 25 MB pro Datei: in der Planung über das Büroklammer-Symbol oder unter „Unterwegs“. Die Dateien werden verschlüsselt hochgeladen und auf jedem Gerät, das den Urlaub öffnet, **automatisch offline gespeichert**. So funktioniert das Kino-Ticket auch im Funkloch.

Hinweise:
- Original-Tickets trotzdem in der Mail oder Wallet behalten. Die Website ist eine bequeme Kopie, keine Ablage für Originale.
- Ausweis- oder Passkopien besser nicht hochladen. Verschlüsselt wäre es zwar, aber je weniger sensible Kopien herumliegen, desto besser.

## Weltkarte

- **Route = Orte:** Jede Reise ist eine Folge von Orten, verbunden per Luftlinie. Ein längerer Aufenthalt (z. B. 3 Tage Lyon) ist *ein* Ort mit 3 Nächten. „Aus Tagesplan übernehmen“ liest die Spalten Von/Nach (bzw. „A → B“ im Programm) und sucht die Orte über OpenStreetMap. Nicht gefundene Orte setzt du per Klick auf die Karte.
- **GPX-Tracks:** In Outdooractive die Tour öffnen → „GPX herunterladen“. Dieselbe Datei kommt auf die Suunto und hier hoch: im Tagesdialog der Planung oder unter Weltkarte → Route. Distanz und Höhenmeter werden berechnet und in den Tag übernommen. Der Track erscheint auf der Karte, und die Originaldatei lässt sich wieder herunterladen.
- **Fotos:** Pro Reise oder pro Ort. Fotos werden im Browser auf max. 2048 px verkleinert, verschlüsselt und im Daten-Repo gespeichert. Alle Beteiligten können Fotos hochladen. Vorschaubilder werden offline gespeichert.
- **Review:** Jede Person bewertet selbst (Gesamt, Landschaft & Natur, Wandern, Essen, Unterkunft, Wetter, Preis-Leistung, Kultur, Stimmung) und kann Highlight und Learnings notieren. Angezeigt wird auch der Durchschnitt.
- **Wer sieht was:** Die Karte zeigt nur Reisen, die auf diesem Gerät entschlüsselt werden können. Das sind deine eigenen und die, zu denen du eingeladen wurdest.
- **Speicherplatz:** GitHub empfiehlt Repos unter etwa 1 GB. Ein Foto braucht hier rund 0,3–0,6 MB, das reicht also für ein paar tausend Fotos.
- Kartendaten: © OpenStreetMap-Mitwirkende, Kacheln von CARTO, OpenTopoMap und Esri. Ortssuche: Nominatim.

## Als App aufs Handy

Seite im Handy-Browser öffnen → Menü → **„Zum Startbildschirm hinzufügen“**. Die App startet dann direkt mit „Unterwegs“ und funktioniert dank Service Worker auch ohne Netz. Änderungen, die du offline machst, werden synchronisiert, sobald wieder Netz da ist.

## Excel

- **Export:** In der Planung auf „Excel“ klicken. Die Datei enthält die Blätter Tagesplan (mit Summen), Kosten, Abrechnung, Packliste und Essensplan. Die Excel-Bibliothek (ExcelJS) wird nur dafür geladen.
- **Import:** Unter „Urlaube“ auf „Aus Excel importieren“ klicken. Erkannt wird das Format deiner bisherigen Tabelle: Kopfzeile mit `Datum | Wochentag | What do | Strecke | Unterkunft | Hinweise | Sonstiges` und darunter ein Kostenblock `Datum | Kosten | Kostengrund | wer bezahlt?`. Die Strecke `11km; 5h; 1300/350` wird zu km, Dauer und Höhenmetern. Tage mit Höhenmetern werden zu Wanderungen, „Fahrtag“ zu Fahrtagen.

## Bei Problemen

- **„Token ungültig“ / „Kein Zugriff“:** Token abgelaufen oder ohne Contents-Schreibrecht → neuen Token erstellen und in den Einstellungen neu verbinden.
- **„Passwort falsch“:** Das Passwort muss dasselbe sein wie beim ersten Verbinden. Ohne Passwort lassen sich deine Urlaube auf neuen Geräten nicht öffnen. Eingeladene Urlaube funktionieren über ihren Link weiter.
- **Gleichzeitig bearbeitet:** Änderungen verschiedener Personen werden zusammengeführt, auch Zeile für Zeile im Tagesplan. Haben zwei Personen dieselbe Zelle geändert, gewinnt die zuletzt gespeicherte Änderung.
- **Sicherung:** Einstellungen → „Sicherung herunterladen“ speichert alle Urlaube dieses Browsers als Datei (unverschlüsselt, ohne Tickets).

## Dateien

```
index.html            Gerüst
css/style.css         Gestaltung (inkl. Druckansicht)
js/sync.js            Verschlüsselung, GitHub-Daten-Repo, Offline-Speicher, Zusammenführen
js/app.js             Packliste, Essensplaner, Wandergerichte, gemeinsame Bausteine
js/urlaub.js          Urlaube, Planung, Unterwegs, Kosten, Einladen, Excel
js/karte.js           Weltkarte, Orte, GPX, Fotos, Review
data/packliste.js     Packlisten-Stammdaten (Felder oben in der Datei erklärt)
data/rezepte.js       Zutaten-Register und Rezepte (Felder oben in der Datei erklärt)
sw.js                 Service Worker (offline) – bei App-Updates VERSION erhöhen
manifest.webmanifest  App-Name und -Symbol für den Startbildschirm
```

### Im Daten-Repo (alles verschlüsselt)

```
keys/keyring.enc               deine Urlaube und ihre Schlüssel (mit Passwort verschlüsselt)
trips/<urlaub-id>.enc          ein Urlaub
files/<urlaub-id>/<id>.enc     Tickets, Unterlagen, GPX-Dateien und Fotos (Foto + Vorschau „_t“)
```
