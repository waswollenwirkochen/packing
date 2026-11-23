/*
  PACKLISTE – Stammdaten
  ----------------------
  Diese Datei ist die "Wahrheit" der Website. Änderungen hier (direkt auf GitHub)
  sind für alle sichtbar. Änderungen im Bearbeiten-Modus der Website bleiben nur
  im eigenen Browser, bis sie über "Exportieren" hier hineinkopiert werden.

  Felder eines Items:
    id        eindeutige Kennung (klein, ohne Leerzeichen)
    name      Anzeigename
    modul     id eines Moduls (siehe "module")
    gruppe    optionale Unterüberschrift innerhalb des Moduls
    menge     { basis, proTag, max }
                Menge = aufrunden(basis + proTag × Reisetage), höchstens max
                ohne proTag ist die Menge einfach "basis"
    mengeJe   abweichende Regel je Reiseart, z. B. { wandern: { basis: 2, proTag: 0.34, max: 4 } }
                bei Kombi-Reisen gilt die größere Menge
    aufgabe   true = To-do statt Gegenstand (z. B. "Impfungen checken"), ohne Menge
    einheit   z. B. "Paar", "Pack", "Rolle" (optional)
    notiz     kurzer Hinweis (optional)
    phase     "besorgen" | "packen" | "abreise"
    geteilt   true = bekommt bei neuen Trips automatisch den Tag "gemeinsam"
    optional  true = nur bei Bedarf
    arten     ["wandern"] oder ["stadt"] = nur bei dieser Reiseart (leer = bei allen)
              Reisearten lassen sich in einem Trip kombinieren (Kombi-Urlaub).
    gewicht   Gramm pro Stück (optional, für die Gewichtssumme)
    touren    ["zelt"] oder ["huette"] = nur bei dieser Art von Wanderurlaub
    gruppeJe  andere Unterüberschrift je Tourart, z. B. { huette: "Freizeitoutfit" }
    nichtBei  ["kaelte"] = ausblenden, wenn das Modul aktiv ist (z. B. kurze Hose bei Kälte)
    nurBei    ["kaelte"] = nur zeigen, wenn das Modul aktiv ist
*/
window.PACK_DATA = {
  version: 2,

  phasen: [
    { id: "besorgen", name: "Vorher besorgen", info: "Einkaufen, nachfüllen, ausleihen" },
    { id: "packen", name: "Packen", info: "Ein paar Tage vor der Abreise" },
    { id: "abreise", name: "Am Abreisetag", info: "Erst zum Schluss einpacken" }
  ],

  arten: [
    {
      id: "wandern", name: "Wanderurlaub",
      module: ["kleidung", "ausruestung", "wetter", "schuhe", "technik", "schlafen-zelt", "kochen", "wasser",
               "komfort", "hygiene", "apotheke", "dokumente"]
    },
    {
      id: "stadt", name: "Städtetrip",
      module: ["kleidung", "ausruestung", "wetter", "schuhe", "technik", "proviant", "komfort", "hygiene",
               "apotheke", "dokumente"]
    }
  ],

  // Reihenfolge = Reihenfolge in der Packliste
  module: [
    { id: "kleidung", name: "Kleidung" },
    { id: "ausruestung", name: "Ausrüstung & Ordnung" },
    { id: "wetter", name: "Wetter" },
    { id: "kaelte", name: "Kälte" },
    { id: "schuhe", name: "Schuhe" },
    { id: "technik", name: "Technik" },
    { id: "schlafen-zelt", name: "Schlafen – Zelt" },
    { id: "schlafen-huette", name: "Schlafen – Hütte" },
    { id: "kochen", name: "Kochen" },
    { id: "wasser", name: "Wasser" },
    { id: "proviant", name: "Reiseproviant" },
    { id: "komfort", name: "Freizeit & Komfort" },
    { id: "hygiene", name: "Hygiene & Bad" },
    { id: "apotheke", name: "Reiseapotheke" },
    { id: "dokumente", name: "Dokumente & Geld" }
  ],

  items: [
    // ---------- Dokumente & Geld ----------
    { id: "ausweis", name: "Personalausweis / Reisepass", modul: "dokumente", phase: "abreise" },
    { id: "impfungen", name: "Impfungen checken", modul: "dokumente", phase: "besorgen", aufgabe: true, notiz: "z. B. Tetanus, FSME; bei Fernreisen rechtzeitig vorher" },
    { id: "portemonnaie", name: "Portemonnaie", modul: "dokumente", phase: "abreise" },
    { id: "tickets", name: "Tickets & Buchungen (offline gespeichert)", modul: "dokumente", phase: "packen" },

    // ---------- Technik ----------
    { id: "handy", name: "Handy", modul: "technik", phase: "abreise" },
    { id: "ladekabel", name: "Ladekabel", modul: "technik", phase: "abreise" },
    { id: "powerbank", name: "Powerbank", modul: "technik", menge: { basis: 1, proTag: 0.2, max: 2 }, phase: "abreise", notiz: "vorher voll laden" },
    { id: "kopfhoerer", name: "Kopfhörer", modul: "technik", phase: "packen" },
    { id: "adapter", name: "Reiseadapter", modul: "technik", phase: "packen", optional: true, notiz: "UK, CH, …", geteilt: true },
    { id: "auxkabel", name: "Aux-Kabel", modul: "technik", phase: "packen", optional: true, arten: ["stadt"] },

    // ---------- Hygiene & Bad ----------
    { id: "zahnbuerste", name: "Zahnbürste", modul: "hygiene", phase: "abreise" },
    { id: "zahnpasta", name: "Zahnpasta", modul: "hygiene", phase: "packen", geteilt: true },
    { id: "shampoo", name: "Shampoo / Seife", modul: "hygiene", phase: "packen", geteilt: true, notiz: "beim Wandern: biologisch abbaubar" },
    { id: "nivea", name: "Nivea / Creme", modul: "hygiene", phase: "packen" },
    { id: "sonnencreme", name: "Sonnencreme", modul: "hygiene", phase: "packen", geteilt: true },
    { id: "mueckenspray", name: "Mückenspray", modul: "hygiene", phase: "besorgen", geteilt: true, nichtBei: ["kaelte"] },
    { id: "nagelknipser", name: "Nagelknipser", modul: "hygiene", phase: "packen", geteilt: true },
    { id: "wattestaebchen", name: "Wattestäbchen", modul: "hygiene", phase: "packen", arten: ["stadt"] },
    { id: "feuchttuecher", name: "Feuchttücher", modul: "hygiene", einheit: "Pack", phase: "besorgen" },
    { id: "taschentuecher", name: "Taschentücher", modul: "hygiene", einheit: "Pack", menge: { basis: 1, proTag: 0.3, max: 4 }, phase: "packen" },
    { id: "oropax", name: "Oropax", modul: "hygiene", phase: "packen" },
    { id: "handtuch", name: "Handtuch (Mikrofaser)", modul: "hygiene", phase: "packen" },
    { id: "gesichtshandtuch", name: "Gesichtshandtuch", modul: "hygiene", phase: "packen", optional: true },
    { id: "medikamente", name: "Persönliche Medikamente", modul: "hygiene", phase: "packen" },

    // ---------- Reiseapotheke ----------
    { id: "erstehilfe", name: "Erste-Hilfe-Kit", modul: "apotheke", phase: "packen", geteilt: true, arten: ["wandern"] },
    { id: "pflaster", name: "Pflaster", modul: "apotheke", phase: "packen", geteilt: true },
    { id: "blasenpflaster", name: "Blasenpflaster", modul: "apotheke", einheit: "Pack", phase: "besorgen" },
    { id: "bepanthen", name: "Bepanthen", modul: "apotheke", phase: "packen", geteilt: true },
    { id: "ibuprofen", name: "Ibuprofen", modul: "apotheke", phase: "packen", geteilt: true },
    { id: "kohletabletten", name: "Kohletabletten", modul: "apotheke", phase: "packen", geteilt: true },
    { id: "desinfektionstuecher", name: "Desinfektionstücher", modul: "apotheke", einheit: "Pack", phase: "besorgen", geteilt: true },

    // ---------- Kleidung ----------
    // Basics (bei jeder Reiseart)
    { id: "unterwaesche", name: "Unterwäsche", modul: "kleidung", gruppe: "Basics", menge: { basis: 1, proTag: 1, max: 6 }, mengeJe: { wandern: { basis: 2, proTag: 0.34, max: 4 } }, phase: "packen", notiz: "ab Obergrenze wird gewaschen" },
    { id: "badehose", name: "Badehose", modul: "kleidung", gruppe: "Basics", phase: "packen", optional: true, nichtBei: ["kaelte"] },
    { id: "bh", name: "BH", modul: "kleidung", gruppe: "Basics", menge: { basis: 1, proTag: 0.3, max: 3 }, phase: "packen", optional: true },
    { id: "sport-bh", name: "Sport-BH", modul: "kleidung", gruppe: "Basics", menge: { basis: 1, proTag: 0.2, max: 2 }, phase: "packen", optional: true },
    // Stadt
    { id: "s-socken-kurz", name: "Socken, kurz", modul: "kleidung", gruppe: "Stadt", einheit: "Paar", menge: { basis: 1, proTag: 1, max: 6 }, phase: "packen", arten: ["stadt"] },
    { id: "s-socken-lang", name: "Socken, lang", modul: "kleidung", gruppe: "Stadt", einheit: "Paar", menge: { basis: 0, proTag: 0.5, max: 3 }, phase: "packen", arten: ["stadt"] },
    { id: "s-tshirts", name: "T-Shirts", modul: "kleidung", gruppe: "Stadt", menge: { basis: 1, proTag: 0.5, max: 4 }, phase: "packen", arten: ["stadt"] },
    { id: "s-hemd", name: "Hemd", modul: "kleidung", gruppe: "Stadt", phase: "packen", optional: true, arten: ["stadt"], notiz: "falls ein schöner Abend geplant ist" },
    { id: "s-longsleeve", name: "Longsleeve", modul: "kleidung", gruppe: "Stadt", phase: "packen", arten: ["stadt"] },
    { id: "s-merino-ls", name: "Merino-Longsleeve", modul: "kleidung", gruppe: "Stadt", menge: { basis: 1, proTag: 0.15, max: 2 }, phase: "packen", arten: ["stadt"] },
    { id: "s-pullover", name: "Pullover / Fleece", modul: "kleidung", gruppe: "Stadt", menge: { basis: 1, proTag: 0.15, max: 2 }, phase: "packen", arten: ["stadt"] },
    { id: "s-hose-lang", name: "Hose, lang", modul: "kleidung", gruppe: "Stadt", menge: { basis: 1, proTag: 0.15, max: 2 }, phase: "packen", arten: ["stadt"] },
    { id: "s-hose-kurz", name: "Hose, kurz", modul: "kleidung", gruppe: "Stadt", phase: "packen", optional: true, arten: ["stadt"], notiz: "je nach Wetterbericht", nichtBei: ["kaelte"] },
    { id: "s-leggins", name: "Leggins (Schlafen / drunter)", modul: "kleidung", gruppe: "Stadt", phase: "packen", arten: ["stadt"] },
    { id: "s-laufhose", name: "Laufhose", modul: "kleidung", gruppe: "Stadt", phase: "packen", optional: true, arten: ["stadt"] },
    // Wandern
    { id: "w-sunhoodie", name: "Sun Hoodie (Poly)", modul: "kleidung", gruppe: "Wanderoutfit", phase: "packen", arten: ["wandern"], nichtBei: ["kaelte"] },
    { id: "w-shirt-merino", name: "Merino-Shirt", modul: "kleidung", gruppe: "Wanderoutfit", phase: "packen", arten: ["wandern"] },
    { id: "w-shorts", name: "Shorts", modul: "kleidung", gruppe: "Wanderoutfit", phase: "packen", arten: ["wandern"], nichtBei: ["kaelte"] },
    { id: "w-beinlinge", name: "Beinlinge", modul: "kleidung", gruppe: "Wanderoutfit", einheit: "Paar", phase: "packen", arten: ["wandern"], nichtBei: ["kaelte"] },
    { id: "w-hose-lang", name: "Wanderhose, lang", modul: "kleidung", gruppe: "Wanderoutfit", phase: "packen", arten: ["wandern"], nurBei: ["kaelte"] },
    { id: "w-leggins-drunter", name: "Merino-Leggins (drunter)", modul: "kleidung", gruppe: "Wanderoutfit", phase: "packen", arten: ["wandern"], nurBei: ["kaelte"], touren: ["huette"] },
    { id: "w-socken-lang", name: "Wandersocken, lang", modul: "kleidung", gruppe: "Wanderoutfit", einheit: "Paar", menge: { basis: 2, proTag: 0.34, max: 4 }, phase: "packen", arten: ["wandern"] },
    { id: "w-fleece-duenn", name: "Fleece, dünn", modul: "kleidung", gruppe: "Wanderoutfit", phase: "packen", optional: true, arten: ["wandern"], notiz: "für kühle Etappen" },
    { id: "w-fleece-dick", name: "Fleece, dick", modul: "kleidung", gruppe: "Campoutfit", phase: "packen", arten: ["wandern"], gruppeJe: { huette: "Freizeitoutfit" } },
    { id: "w-ls-merino-duenn", name: "Merino-Langarm, dünn", modul: "kleidung", gruppe: "Campoutfit", phase: "packen", arten: ["wandern"], gruppeJe: { huette: "Freizeitoutfit" } },
    { id: "w-ziphose", name: "Zip-Hose", modul: "kleidung", gruppe: "Campoutfit", phase: "packen", arten: ["wandern"], gruppeJe: { huette: "Freizeitoutfit" } },
    { id: "w-longsleeve-poly", name: "Longsleeve (Poly)", modul: "kleidung", gruppe: "Campoutfit", phase: "packen", optional: true, arten: ["wandern"], notiz: "Backup", touren: ["zelt"] },
    { id: "w-ls-merino-dick", name: "Merino-Langarm, dick", modul: "kleidung", gruppe: "Schlafoutfit", phase: "packen", arten: ["wandern"], touren: ["zelt"] },
    { id: "w-leggins-merino", name: "Merino-Leggins", modul: "kleidung", gruppe: "Schlafoutfit", phase: "packen", arten: ["wandern"], touren: ["zelt"] },
    { id: "w-socken-dick", name: "Socken, lang & dick", modul: "kleidung", gruppe: "Schlafoutfit", einheit: "Paar", phase: "packen", arten: ["wandern"], touren: ["zelt"] },

    // ---------- Wetter ----------
    { id: "regenjacke", name: "Regenjacke", modul: "wetter", phase: "packen" },
    { id: "regenhose", name: "Regenhose", modul: "wetter", phase: "packen", arten: ["wandern"] },
    { id: "poncho", name: "Poncho", modul: "wetter", phase: "packen", optional: true },
    { id: "rucksackcover", name: "Rucksack-Cover", modul: "wetter", phase: "packen", arten: ["wandern"] },
    { id: "cap", name: "Cap", modul: "wetter", phase: "packen" },
    { id: "sonnenbrille", name: "Sonnenbrille", modul: "wetter", phase: "abreise" },
    { id: "buff", name: "Buff", modul: "wetter", phase: "packen" },

    // ---------- Kälte ----------
    { id: "muetze-duenn", name: "Mütze, dünn", modul: "kaelte", phase: "packen" },
    { id: "muetze-dick", name: "Mütze, dick", modul: "kaelte", phase: "packen", optional: true, notiz: "bei Frost" },
    { id: "stirnband", name: "Stirnband (Merino)", modul: "kaelte", phase: "packen", optional: true },
    { id: "handschuhe-duenn", name: "Handschuhe, dünn", modul: "kaelte", einheit: "Paar", phase: "packen" },
    { id: "handschuhe-dick", name: "Handschuhe, dick", modul: "kaelte", einheit: "Paar", phase: "packen", optional: true, notiz: "bei Frost" },
    { id: "daunenjacke", name: "Daunen- / Isojacke", modul: "kaelte", phase: "packen", optional: true },

    // ---------- Schuhe ----------
    { id: "wanderschuhe", name: "Wanderschuhe", modul: "schuhe", einheit: "Paar", phase: "packen", arten: ["wandern"] },
    { id: "sneaker", name: "Sneaker", modul: "schuhe", einheit: "Paar", phase: "packen", arten: ["stadt"] },
    { id: "badelatschen", name: "Crocs / Badelatschen", modul: "schuhe", einheit: "Paar", phase: "packen" },

    // ---------- Ausrüstung & Ordnung ----------
    { id: "rucksack", name: "Rucksack", modul: "ausruestung", phase: "packen", arten: ["wandern"] },
    { id: "bauchtasche", name: "Bauchtasche", modul: "ausruestung", phase: "packen" },
    { id: "stirnlampe", name: "Stirnlampe", modul: "ausruestung", phase: "packen", notiz: "Akku laden" },
    { id: "taschenmesser", name: "Taschenmesser", modul: "ausruestung", phase: "packen", notiz: "nicht ins Handgepäck" },
    { id: "trekkingstoecke", name: "Trekkingstöcke", modul: "ausruestung", einheit: "Paar", phase: "packen", arten: ["wandern"] },
    { id: "drysacks", name: "Dry Sacks", modul: "ausruestung", menge: { basis: 3 }, phase: "packen", arten: ["wandern"] },
    { id: "zipbeutel", name: "Zipbeutel", modul: "ausruestung", menge: { basis: 2, proTag: 0.5, max: 6 }, phase: "packen" },
    { id: "papiertueten", name: "Papiertüten, dick", modul: "ausruestung", menge: { basis: 3 }, phase: "packen", arten: ["wandern"] },
    { id: "muelltueten", name: "Kleine Mülltüten", modul: "ausruestung", menge: { basis: 1, proTag: 0.5, max: 5 }, phase: "packen", geteilt: true },
    { id: "plastiktuete", name: "Plastiktüte (Schmutzwäsche)", modul: "ausruestung", phase: "packen" },
    { id: "toilettenpapier", name: "Toilettenpapier", modul: "ausruestung", einheit: "Rolle", menge: { basis: 1, proTag: 0.25, max: 3 }, phase: "besorgen", geteilt: true, arten: ["wandern"] },
    { id: "desinfektionsmittel", name: "Hand-Desinfektionsmittel", modul: "ausruestung", phase: "besorgen", geteilt: true },
    { id: "gepaeckbaender", name: "Gepäckbänder", modul: "ausruestung", phase: "packen", optional: true, notiz: "bei Flug" },
    { id: "pfefferspray", name: "Pfefferspray (Tierabwehr)", modul: "ausruestung", phase: "packen", optional: true, notiz: "nicht ins Handgepäck" },

    // ---------- Schlafen – Zelt ----------
    { id: "zelt", name: "Zelt", modul: "schlafen-zelt", phase: "packen", geteilt: true },
    { id: "tarp", name: "Tarp", modul: "schlafen-zelt", phase: "packen", geteilt: true, optional: true },
    { id: "isomatte", name: "Isomatte", modul: "schlafen-zelt", phase: "packen" },
    { id: "schlafsack", name: "Schlafsack", modul: "schlafen-zelt", phase: "packen" },
    { id: "inlet", name: "Inlet", modul: "schlafen-zelt", phase: "packen" },
    { id: "sitzkissen", name: "Sitzkissen", modul: "schlafen-zelt", phase: "packen" },
    { id: "camplight", name: "Camplight", modul: "schlafen-zelt", phase: "packen", geteilt: true },

    // ---------- Schlafen – Hütte ----------
    { id: "huettenschlafsack", name: "Hüttenschlafsack", modul: "schlafen-huette", phase: "packen" },
    { id: "huettensocken", name: "Hüttensocken", modul: "schlafen-huette", einheit: "Paar", phase: "packen" },
    { id: "huettenbargeld", name: "Bargeld für die Hütten", modul: "schlafen-huette", phase: "abreise", notiz: "viele Hütten nehmen keine Karte" },
    { id: "huettenausweis", name: "DAV-Ausweis / Reservierung", modul: "schlafen-huette", phase: "packen" },

    // ---------- Kochen ----------
    { id: "gaskocher", name: "Gaskocher", modul: "kochen", phase: "packen", geteilt: true },
    { id: "gaskartusche", name: "Gaskartusche", modul: "kochen", menge: { basis: 1, proTag: 0.15, max: 3 }, phase: "besorgen", geteilt: true, notiz: "Faustregel – an deinen Kocher anpassen; nicht im Flugzeug" },
    { id: "windschutz", name: "Windschutz", modul: "kochen", phase: "packen", geteilt: true },
    { id: "feuerzeug", name: "Feuerzeug", modul: "kochen", menge: { basis: 2 }, phase: "packen", geteilt: true, notiz: "eins als Backup" },
    { id: "becher", name: "Große Koch-Tasse", modul: "kochen", phase: "packen", notiz: "kochen & essen in einem" },
    { id: "backpapier", name: "Backpapier, zugeschnitten", modul: "kochen", menge: { basis: 2, proTag: 0.5, max: 8 }, phase: "besorgen", notiz: "Einlage für Ei & Käse – nichts brennt an" },
    { id: "essensbeutel", name: "Essensbeutel (Zipbeutel)", modul: "kochen", menge: { basis: 0, proTag: 2, max: 30 }, phase: "besorgen", notiz: "fertig gepackte Mahlzeiten aus dem Essensplaner" },
    { id: "goeffel", name: "Göffel", modul: "kochen", phase: "packen" },
    { id: "thermoskanne", name: "Thermoskanne", modul: "kochen", phase: "packen", optional: true },

    // ---------- Wasser ----------
    { id: "trinkblase", name: "Trinkblase (3 l)", modul: "wasser", phase: "packen" },
    { id: "wasserflasche", name: "Wasserflasche (1 l)", modul: "wasser", phase: "packen" },
    { id: "wassersack", name: "Wassersack + Dusche (4–5 l)", modul: "wasser", phase: "packen", geteilt: true, touren: ["zelt"] },
    { id: "wassertabletten", name: "Wasserentkeimungstabletten", modul: "wasser", einheit: "Pack", phase: "besorgen", geteilt: true, touren: ["zelt"] },
    { id: "geschmacksneutralisierer", name: "Neutralisierer gegen Chlorgeschmack", modul: "wasser", einheit: "Pack", phase: "besorgen", geteilt: true, optional: true, touren: ["zelt"] },
    { id: "hydratabs", name: "HydraTabs / Elektrolyte", modul: "wasser", menge: { basis: 0, proTag: 1 }, phase: "besorgen" },

    // ---------- Komfort & Freizeit ----------
    { id: "ereader", name: "eReader", modul: "komfort", phase: "packen" },
    { id: "reisetagebuch", name: "Reisetagebuch", modul: "komfort", phase: "packen" },
    { id: "stifte", name: "Kuli, Bleistift, Radierer", modul: "komfort", phase: "packen" },
    { id: "schlafmaske", name: "Schlafmaske", modul: "komfort", phase: "packen" },
    { id: "reisekissen", name: "Reisekissen", modul: "komfort", phase: "packen", optional: true },
    { id: "flachmann", name: "Flachmann", modul: "komfort", phase: "besorgen", optional: true, notiz: "Whiskey / Rum / Kräuter" },

    // ---------- Reiseproviant (An-/Abreise, Stadt) ----------
    { id: "p-ramen", name: "Ramen", modul: "proviant", menge: { basis: 1, proTag: 0.3, max: 3 }, phase: "besorgen" },
    { id: "p-misosuppe", name: "Misosuppe (Instant)", modul: "proviant", menge: { basis: 1, proTag: 0.3, max: 3 }, phase: "besorgen" },
    { id: "p-pumpernickel", name: "Pumpernickel", modul: "proviant", einheit: "Pack", phase: "besorgen" },
    { id: "p-kekse", name: "Kekse", modul: "proviant", einheit: "Pack", phase: "besorgen" },
    { id: "p-muesliriegel", name: "Müsliriegel", modul: "proviant", menge: { basis: 2, proTag: 0.5, max: 6 }, phase: "besorgen" },
    { id: "p-instantkaffee", name: "Instantkaffee", modul: "proviant", phase: "besorgen" },
    { id: "p-tee", name: "Tee", modul: "proviant", phase: "besorgen" },
    { id: "p-milchpulver", name: "Milchpulver", modul: "proviant", phase: "besorgen", optional: true },
    { id: "p-ingwer", name: "Ingwer", modul: "proviant", phase: "abreise" },
    { id: "p-obst", name: "Obst", modul: "proviant", phase: "abreise" }
  ]
};
