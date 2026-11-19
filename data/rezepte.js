/*
  WANDERGERICHTE – Register & Rezeptesammlung
  -------------------------------------------
  Baukasten-Prinzip: Jedes Gericht = Carbs + Gemüse + Protein + Geschmack (+ Fett/Extras).

  ZUTATEN (Register)
    id            eindeutige Kennung
    name          Anzeigename
    kat           "carbs" | "gemuese" | "protein" | "geschmack" | "extra"
    kcal          ca. kcal pro 100 g (trocken bzw. wie eingepackt) – grobe Richtwerte
    diaet         "vegan" | "vegetarisch" | "fisch" | "fleisch"
    herkunft      "kaufen" | "dehydrieren" (selbst trocknen) | "frisch" (unterwegs frisch/als Dose)
    vorbereitung  Hinweis zum Einkaufen / Trocknen / Haltbarkeit
    kurz          Kurzname für Rezepttexte (wird beim Austauschen ersetzt)
    portion       übliche Gramm pro Portion (Grundlage fürs Austauschen & Freestyle)
    wasser        ml Wasser pro Gramm, das diese Zutat zum Garen/Quellen braucht
    zeit          Minuten Garzeit
    zubereitung   kurzer Zubereitungsschritt (erscheint beim Austauschen & Freestyle)
    klebt         true = brennt in der Tasse leicht an (Backpapier-Hinweis)

  REZEPTE
    mahlzeit      "fruehstueck" | "snack" | "dinner"
    basis         Kurzlabel der Carb-Basis (für Filter)
    zutaten       [{ z: Zutat-id, g: Gramm pro Portion }]
    wasser        ml heißes/kaltes Wasser pro Portion (0 = ohne Wasser)
    zeit          Minuten unterwegs
    kocher        true = Kocher nötig
    zuhause       was zu Hause vorbereitet wird (Beutel packen, mischen)
    unterwegs     Zubereitung auf Tour als Liste von Schritten.
                  {wasser}  = Wassermenge des Gerichts (passt sich an Portionen & Austausch an)
                  {ml:130}  = feste Teilmenge pro Portion (wird mit den Portionen multipliziert)
*/
window.REZEPT_DATA = {
  version: 1,

  kategorien: [
    { id: "carbs", name: "Carbs" },
    { id: "gemuese", name: "Gemüse & Obst" },
    { id: "protein", name: "Protein" },
    { id: "geschmack", name: "Geschmack" },
    { id: "extra", name: "Fett & Extras" }
  ],

  zutaten: [
    // ---------- Carbs ----------
    { id: "couscous", name: "Couscous (Instant)", kurz: "Couscous", portion: 100, wasser: 1.2, zeit: 5, zubereitung: "mit kochendem Wasser übergießen, abgedeckt 5 min quellen lassen", kat: "carbs", kcal: 360, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Quillt in 5 min ohne Kochen – Wasser 1:1,2." },
    { id: "bulgur-fein", name: "Bulgur, fein", kurz: "Bulgur", portion: 100, wasser: 1.6, zeit: 12, zubereitung: "aufkochen, dann abgedeckt 10 min quellen lassen (Tasse in die Jacke wickeln spart Gas)", kat: "carbs", kcal: 350, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Feiner Bulgur quillt ähnlich wie Couscous (10 min, abgedeckt)." },
    { id: "nudeln-schnell", name: "Schnellkoch-Nudeln (3 min)", kurz: "Nudeln", portion: 110, wasser: 2.8, zeit: 8, zubereitung: "in knapp bemessenem Wasser 3–4 min köcheln, bis es fast aufgesogen ist – nicht abgießen", kat: "carbs", kcal: 355, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Dünne Sorten (Fadennudeln, Mini-Penne 3 min) sparen Gas." },
    { id: "ramen", name: "Ramen-Nudeln (ohne Würzbeutel)", kurz: "Ramen", portion: 100, wasser: 3, zeit: 4, zubereitung: "in kochendem Wasser 3 min garen", kat: "carbs", kcal: 440, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Asia-Laden: Blocknudeln, Würzbeutel durch eigene Mischung ersetzen." },
    { id: "haferflocken", name: "Haferflocken, zart", kurz: "Haferflocken", portion: 80, wasser: 3, zeit: 4, zubereitung: "in das heiße Wasser rühren, kurz aufkochen, 3 min ziehen lassen", kat: "carbs", kcal: 370, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Zarte Flocken quellen auch kalt." },
    { id: "instantreis", name: "Instant-Reis", kurz: "Reis", portion: 90, wasser: 2.5, zeit: 8, zubereitung: "aufkochen, 5 min köcheln, abgedeckt quellen lassen", kat: "carbs", kcal: 350, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Oder Reis kochen und selbst dehydrieren (55 °C, 6–8 h)." },
    { id: "kartoffelpueree", name: "Kartoffelpüree-Flocken", kurz: "Püree", portion: 80, wasser: 3.5, zeit: 2, zubereitung: "Tasse vom Herd nehmen, Flocken in das heiße Wasser rühren", klebt: true, kat: "carbs", kcal: 350, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Ohne Milch-Fertigmischung kaufen, Milchpulver extra dazu." },
    { id: "tortilla", name: "Weizentortilla", kurz: "Tortilla", portion: 80, zubereitung: "kalt essen oder kurz über der Flamme erwärmen", kat: "carbs", kcal: 300, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Hält ungekühlt ca. 1 Woche, platt im Deckelfach packen." },
    { id: "pumpernickel", name: "Pumpernickel", kurz: "Pumpernickel", portion: 100, kat: "carbs", kcal: 190, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Ungeöffnet sehr lange haltbar." },
    { id: "granola", name: "Granola / Knuspermüsli", kurz: "Granola", portion: 90, kat: "carbs", kcal: 450, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Selbst gebacken oder gekauft." },
    { id: "cracker", name: "Cracker / Knäckebrot", kurz: "Cracker", portion: 50, kat: "carbs", kcal: 420, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Bricht leicht – oben in den Rucksack." },

    // ---------- Gemüse & Obst ----------
    { id: "erbsen-tr", name: "Erbsen, dehydriert", kurz: "Erbsen", portion: 20, wasser: 3, zeit: 5, kat: "gemuese", kcal: 340, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "TK-Erbsen direkt aufs Blech, 55 °C, 8–10 h." },
    { id: "paprika-tr", name: "Paprika, dehydriert", kurz: "Paprika", portion: 10, wasser: 3, zeit: 5, kat: "gemuese", kcal: 300, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "Kleine Würfel (5 mm), 55 °C, 8–12 h." },
    { id: "zucchini-tr", name: "Zucchini, dehydriert", kurz: "Zucchini", portion: 10, wasser: 3, zeit: 5, kat: "gemuese", kcal: 270, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "Dünne Halbmonde, 55 °C, 6–8 h." },
    { id: "karotte-tr", name: "Karotte, dehydriert", kurz: "Karotte", portion: 10, wasser: 3, zeit: 5, kat: "gemuese", kcal: 320, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "Raspeln oder 2 min blanchieren, 55 °C, 8–10 h." },
    { id: "pilze-tr", name: "Pilze, getrocknet", kurz: "Pilze", portion: 8, wasser: 4, zeit: 5, kat: "gemuese", kcal: 300, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "Champignons in Scheiben selbst trocknen oder Shiitake kaufen." },
    { id: "tomate-tr", name: "Tomaten, getrocknet", kurz: "Tomaten", portion: 15, wasser: 2, zeit: 3, kat: "gemuese", kcal: 260, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Ohne Öl kaufen und klein schneiden." },
    { id: "spinat-tr", name: "Spinat, dehydriert", kurz: "Spinat", portion: 5, wasser: 4, zeit: 3, kat: "gemuese", kcal: 280, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "TK-Blattspinat auftauen, ausdrücken, 50 °C, 4–6 h." },
    { id: "mais-tr", name: "Mais, dehydriert", kurz: "Mais", portion: 10, wasser: 3, zeit: 5, kat: "gemuese", kcal: 350, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "TK-Mais, 55 °C, 8–10 h." },
    { id: "bohnen-tr", name: "Kidneybohnen, dehydriert", kurz: "Bohnen", portion: 30, wasser: 3, zeit: 8, kat: "gemuese", kcal: 330, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "Dosenbohnen abspülen, leicht andrücken, 55 °C, 8–10 h." },
    { id: "fruehlingszwiebel-tr", name: "Frühlingszwiebel, getrocknet", kurz: "Frühlingszwiebel", portion: 3, wasser: 2, zeit: 1, kat: "gemuese", kcal: 300, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "Feine Ringe, 50 °C, 3–4 h." },
    { id: "lauch-tr", name: "Lauch, dehydriert", kurz: "Lauch", portion: 5, wasser: 3, zeit: 3, kat: "gemuese", kcal: 300, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "Feine Ringe, 55 °C, 6–8 h." },
    { id: "wakame", name: "Wakame", kurz: "Wakame", portion: 2, wasser: 10, zeit: 2, kat: "gemuese", kcal: 200, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Asia-Laden. Quillt stark auf – wenig reicht." },
    { id: "apfel-tr", name: "Apfelringe, getrocknet", kurz: "Apfel", portion: 15, wasser: 2, kat: "gemuese", kcal: 300, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "Dünne Ringe mit Zitronenwasser, 55 °C, 6–8 h." },
    { id: "bananenchips", name: "Bananenchips", kurz: "Bananenchips", portion: 15, kat: "gemuese", kcal: 520, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "trockenobst", name: "Trockenobst-Mix", kurz: "Trockenobst", portion: 25, kat: "gemuese", kcal: 300, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Rosinen, Aprikosen, Datteln …" },

    // ---------- Protein ----------
    { id: "eipulver", name: "Vollei-Pulver", kurz: "Ei", portion: 20, wasser: 2.5, zeit: 2, zubereitung: "mit etwas kaltem Wasser im Beutel glatt rühren und erst zum Schluss, vom Herd genommen, unterrühren", klebt: true, kat: "protein", kcal: 590, diaet: "vegetarisch", herkunft: "kaufen", vorbereitung: "15 g ≈ 1 Ei. Trocken und dunkel lagern." },
    { id: "tvp", name: "Sojaschnetzel, fein (TVP)", kurz: "Soja", portion: 25, wasser: 3, zeit: 6, kat: "protein", kcal: 340, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Feine Sorte quillt in 5–10 min in heißer Brühe." },
    { id: "linsen-tr", name: "Rote Linsen, gekocht & dehydriert", kurz: "Linsen", portion: 50, wasser: 3, zeit: 6, kat: "protein", kcal: 350, diaet: "vegan", herkunft: "dehydrieren", vorbereitung: "Weich kochen, dünn aufs Backpapier streichen, 55 °C, 8–10 h, dann zerbröseln." },
    { id: "thunfisch", name: "Thunfisch (Dose)", kurz: "Thunfisch", portion: 80, zubereitung: "frisch aus der Dose untermischen", kat: "protein", kcal: 115, diaet: "fisch", herkunft: "frisch", vorbereitung: "Dose oder Pouch (leichter). Unterwegs öffnen und frisch untermischen." },
    { id: "hartkaese", name: "Hartkäse / Bergkäse", kurz: "Käse", portion: 40, kat: "protein", kcal: 400, diaet: "vegetarisch", herkunft: "frisch", vorbereitung: "Hält ungekühlt einige Tage, in Wachspapier wickeln." },
    { id: "salami", name: "Trockensalami", kurz: "Salami", portion: 40, kat: "protein", kcal: 450, diaet: "fleisch", herkunft: "frisch", vorbereitung: "Am Stück lange haltbar, unterwegs aufschneiden." },
    { id: "chorizo", name: "Chorizo, luftgetrocknet", kurz: "Chorizo", portion: 50, zubereitung: "gewürfelt zum Schluss unterheben", kat: "protein", kcal: 450, diaet: "fleisch", herkunft: "frisch", vorbereitung: "Am Stück, ungekühlt mehrere Tage." },
    { id: "speckwuerfel", name: "Speckwürfel, kross & getrocknet", kurz: "Speck", portion: 20, wasser: 0.5, kat: "protein", kcal: 500, diaet: "fleisch", herkunft: "dehydrieren", vorbereitung: "Kross anbraten, Fett gut abtupfen, 60 °C, 4–6 h. Nur ein paar Tage haltbar." },
    { id: "erdnussbutter", name: "Erdnussbutter", kurz: "Erdnussbutter", portion: 30, kat: "protein", kcal: 600, diaet: "vegan", herkunft: "kaufen", vorbereitung: "In Tube oder Zipbeutel umfüllen." },
    { id: "nuesse", name: "Nüsse / Kerne-Mix", kurz: "Nüsse", portion: 25, kat: "protein", kcal: 600, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "milchpulver", name: "Vollmilchpulver", kurz: "Milchpulver", portion: 20, wasser: 7, klebt: true, kat: "protein", kcal: 500, diaet: "vegetarisch", herkunft: "kaufen", vorbereitung: "Vorab in die Frühstücksbeutel mischen." },

    // ---------- Geschmack ----------
    { id: "kaesepulver", name: "Käsepulver / getr. Parmesan", kurz: "Käse", portion: 20, klebt: true, kat: "geschmack", kcal: 430, diaet: "vegetarisch", herkunft: "kaufen", vorbereitung: "Parmesan fein reiben und 1–2 h bei 50 °C nachtrocknen – hält dann länger." },
    { id: "gemuesebruehe", name: "Gemüsebrühe (Pulver)", kurz: "Brühe", portion: 5, kat: "geschmack", kcal: 250, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "dashi", name: "Dashi-Pulver", kurz: "Dashi", portion: 5, kat: "geschmack", kcal: 230, diaet: "fisch", herkunft: "kaufen", vorbereitung: "Klassisch mit Bonito (Fisch). Kombu-Dashi für vegetarisch." },
    { id: "miso", name: "Miso (Instant oder Paste)", kurz: "Miso", portion: 15, zubereitung: "erst vom Herd genommen einrühren", kat: "geschmack", kcal: 200, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Paste in kleiner Dose, Instant-Tütchen leichter." },
    { id: "sojasauce", name: "Sojasauce (Portionstütchen)", kurz: "Soja", portion: 10, kat: "geschmack", kcal: 60, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Tütchen vom Asia-Imbiss oder kleines Fläschchen." },
    { id: "curry", name: "Currypulver", kurz: "Curry", portion: 4, kat: "geschmack", kcal: 320, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "chilimix", name: "Chili-Mix (Guajillo, Kreuzkümmel, Oregano)", kurz: "Chili", portion: 4, kat: "geschmack", kcal: 300, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Getrocknete Chilis mahlen, mit Kreuzkümmel und mexikanischem Oregano mischen." },
    { id: "knoblauch", name: "Knoblauch-Granulat", kurz: "Knoblauch", portion: 1, kat: "geschmack", kcal: 330, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "kraeuter", name: "Ital. Kräuter / Basilikum, getr.", kurz: "Kräuter", portion: 1, kat: "geschmack", kcal: 250, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "pfeffer", name: "Schwarzer Pfeffer, grob", kurz: "Pfeffer", portion: 1, kat: "geschmack", kcal: 250, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "roestzwiebeln", name: "Röstzwiebeln", kurz: "Röstzwiebeln", portion: 10, zubereitung: "erst beim Essen drüberstreuen", kat: "geschmack", kcal: 590, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Erst beim Essen drüber, sonst werden sie weich." },
    { id: "zimt", name: "Zimt", kurz: "Zimt", portion: 1, kat: "geschmack", kcal: 250, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "kakao", name: "Kakaopulver", kurz: "Kakao", portion: 8, kat: "geschmack", kcal: 380, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "kokosmilchpulver", name: "Kokosmilchpulver", kurz: "Kokosmilch", portion: 20, wasser: 3, kat: "geschmack", kcal: 690, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Asia-Laden. Macht Currys cremig und liefert Fett." },
    { id: "sesam", name: "Sesam, geröstet", kurz: "Sesam", portion: 5, kat: "geschmack", kcal: 570, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },

    // ---------- Fett & Extras ----------
    { id: "olivenoel", name: "Olivenöl", kurz: "Öl", portion: 10, kat: "extra", kcal: 880, diaet: "vegan", herkunft: "kaufen", vorbereitung: "Kleine dichte Flasche, in Zipbeutel stellen." },
    { id: "zucker", name: "Zucker / Honigpulver", kurz: "Zucker", portion: 10, kat: "extra", kcal: 400, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" },
    { id: "schokolinsen", name: "Schokolinsen / Schokolade", kurz: "Schokolade", portion: 15, kat: "extra", kcal: 500, diaet: "vegetarisch", herkunft: "kaufen", vorbereitung: "Bei Hitze: Schokolinsen statt Tafel." },
    { id: "muesliriegel", name: "Müsliriegel", kurz: "Riegel", portion: 50, kat: "extra", kcal: 420, diaet: "vegetarisch", herkunft: "kaufen", vorbereitung: "" },
    { id: "kekse", name: "Kekse", kurz: "Kekse", portion: 30, kat: "extra", kcal: 480, diaet: "vegetarisch", herkunft: "kaufen", vorbereitung: "" },
    { id: "honig", name: "Honig (Portion)", kurz: "Honig", portion: 15, kat: "extra", kcal: 300, diaet: "vegetarisch", herkunft: "kaufen", vorbereitung: "" }
  ],

  rezepte: [
    // ================= FRÜHSTÜCK =================
    {
      id: "porridge-apfel-zimt", name: "Apfel-Zimt-Porridge", mahlzeit: "fruehstueck", basis: "Haferflocken",
      zutaten: [{ z: "haferflocken", g: 80 }, { z: "milchpulver", g: 20 }, { z: "apfel-tr", g: 15 }, { z: "nuesse", g: 20 }, { z: "zimt", g: 1 }, { z: "zucker", g: 10 }],
      wasser: 250, zeit: 5, kocher: true,
      zuhause: "Alles in einen Zipbeutel pro Portion mischen, Apfelringe klein schneiden.",
      unterwegs: ["{wasser} Wasser in der Tasse zum Kochen bringen.", "Flamme klein stellen und den Beutelinhalt einrühren.", "1–2 min unter Rühren leicht köcheln lassen, bis der Brei andickt. Dabei immer wieder über den Boden rühren, damit nichts ansetzt.", "Vom Herd nehmen, abdecken und 3 min quellen lassen. Ist er zu fest, einen Schluck heißes Wasser unterrühren.", "Kalte Variante: abends den Beutelinhalt mit {wasser} kaltem Wasser in der Tasse verrühren und abgedeckt über Nacht stehen lassen."]
    },
    {
      id: "porridge-schoko-erdnuss", name: "Schoko-Erdnuss-Porridge", mahlzeit: "fruehstueck", basis: "Haferflocken",
      zutaten: [{ z: "haferflocken", g: 80 }, { z: "milchpulver", g: 20 }, { z: "kakao", g: 8 }, { z: "erdnussbutter", g: 25 }, { z: "bananenchips", g: 15 }, { z: "zucker", g: 10 }],
      wasser: 250, zeit: 5, kocher: true,
      zuhause: "Beutel: Haferflocken, Milchpulver, Kakao, Zucker. Separat: Erdnussbutter (Tube) und Bananenchips.",
      unterwegs: ["{wasser} Wasser in der Tasse zum Kochen bringen.", "Flamme klein stellen und den Beutelinhalt einrühren.", "1–2 min unter Rühren leicht köcheln lassen, bis der Brei andickt. Dabei immer wieder über den Boden rühren, damit nichts ansetzt.", "Vom Herd nehmen, abdecken und 3 min quellen lassen.", "Die Erdnussbutter unterrühren und die Bananenchips obendrauf streuen."]
    },
    {
      id: "porridge-miso-ei", name: "Herzhaftes Miso-Porridge mit Ei", mahlzeit: "fruehstueck", basis: "Haferflocken",
      zutaten: [{ z: "haferflocken", g: 70 }, { z: "eipulver", g: 15 }, { z: "miso", g: 12 }, { z: "fruehlingszwiebel-tr", g: 3 }, { z: "sesam", g: 5 }, { z: "sojasauce", g: 5 }],
      wasser: 280, zeit: 6, kocher: true,
      zuhause: "Beutel A: Haferflocken, Frühlingszwiebel. Beutel B (klein): Eipulver. Separat: Miso, Sojasauce, Sesam.",
      unterwegs: ["{ml:40} kaltes Wasser in Beutel B gießen, verschließen und kneten, bis das Ei glatt ist.", "{ml:240} Wasser in der Tasse aufkochen.", "Beutel A einrühren und bei kleiner Flamme 2–3 min unter Rühren köcheln, bis der Brei sämig ist.", "Vom Herd nehmen und den Ei-Mix zügig einrühren. Die Hitze lässt das Ei stocken, ohne dass es am Boden ansetzt.", "Miso und Sojasauce einrühren, Sesam drüberstreuen."]
    },
    {
      id: "granola-kalt", name: "Granola mit Milch (kalt)", mahlzeit: "fruehstueck", basis: "Granola",
      zutaten: [{ z: "granola", g: 90 }, { z: "milchpulver", g: 25 }, { z: "trockenobst", g: 20 }],
      wasser: 200, zeit: 2, kocher: false,
      zuhause: "Granola, Milchpulver und Obst in einen Beutel.",
      unterwegs: ["{wasser} kaltes Wasser direkt in den Beutel gießen.", "Beutel verschließen und etwa 30 s kneten, bis sich das Milchpulver gelöst hat.", "Direkt aus dem Beutel löffeln – die Tasse bleibt sauber."]
    },
    {
      id: "ruehrei-wrap", name: "Rührei-Wrap mit Paprika & Käse", mahlzeit: "fruehstueck", basis: "Tortilla",
      zutaten: [{ z: "tortilla", g: 80 }, { z: "eipulver", g: 30 }, { z: "paprika-tr", g: 8 }, { z: "kaesepulver", g: 10 }, { z: "olivenoel", g: 5 }],
      wasser: 80, zeit: 8, kocher: true,
      zuhause: "Beutel: Eipulver, Paprika, Käsepulver. Separat: Tortillas, Öl, ein Stück Backpapier (ca. 25 × 25 cm).",
      unterwegs: ["{wasser} kaltes Wasser in den Ei-Beutel gießen, verschließen und kneten, bis alles glatt ist. 5 min quellen lassen, damit die Paprika weich wird.", "Das Backpapier in die Tasse drücken und das Öl hineingeben. Das Papier darf nicht über den Rand in die Flamme hängen.", "Ei-Mix hineingießen und bei kleinster Flamme 2–3 min mit dem Göffel rühren, bis das Ei gestockt ist.", "Das Rührei mit dem Papier aus der Tasse heben, auf die Tortillas verteilen und einrollen."]
    },

    // ================= SNACKS =================
    {
      id: "trailmix", name: "Trail Mix", mahlzeit: "snack", basis: "Nüsse",
      zutaten: [{ z: "nuesse", g: 40 }, { z: "trockenobst", g: 25 }, { z: "schokolinsen", g: 15 }],
      wasser: 0, zeit: 0, kocher: false,
      zuhause: "Großen Batch mischen und in Tagesbeutel portionieren.",
      unterwegs: ["Griffbereit in die Hüftgurttasche packen und über den Tag verteilt immer wieder eine kleine Handvoll essen."]
    },
    {
      id: "pumpernickel-kaese", name: "Pumpernickel mit Bergkäse", mahlzeit: "snack", basis: "Pumpernickel",
      zutaten: [{ z: "pumpernickel", g: 100 }, { z: "hartkaese", g: 40 }],
      wasser: 0, zeit: 2, kocher: false,
      zuhause: "Käse am Stück einpacken.",
      unterwegs: ["Käse mit dem Taschenmesser in Scheiben schneiden.", "Pumpernickel damit belegen.", "Den angeschnittenen Käse wieder einwickeln."]
    },
    {
      id: "salami-cracker", name: "Salami & Cracker", mahlzeit: "snack", basis: "Cracker",
      zutaten: [{ z: "cracker", g: 50 }, { z: "salami", g: 40 }],
      wasser: 0, zeit: 2, kocher: false,
      zuhause: "Salami am Stück, Cracker in eine feste Dose.",
      unterwegs: ["Salami mit dem Taschenmesser in dünne Scheiben schneiden.", "Zusammen mit den Crackern essen.", "Die angeschnittene Salami wieder einwickeln."]
    },
    {
      id: "pb-wrap", name: "Erdnussbutter-Honig-Wrap", mahlzeit: "snack", basis: "Tortilla",
      zutaten: [{ z: "tortilla", g: 60 }, { z: "erdnussbutter", g: 30 }, { z: "honig", g: 15 }, { z: "bananenchips", g: 10 }],
      wasser: 0, zeit: 2, kocher: false,
      zuhause: "Erdnussbutter in Tube, Honig als Portionstütchen.",
      unterwegs: ["Tortilla ausbreiten und die Erdnussbutter dünn aufstreichen.", "Honig darüber verteilen und die Bananenchips daraufstreuen.", "Fest einrollen und in der Pause essen."]
    },
    {
      id: "riegel-kekse", name: "Müsliriegel & Kekse", mahlzeit: "snack", basis: "Riegel",
      zutaten: [{ z: "muesliriegel", g: 50 }, { z: "kekse", g: 30 }],
      wasser: 0, zeit: 0, kocher: false,
      zuhause: "Riegel und Kekse zusammen in einen Beutel.", unterwegs: ["Griffbereit in die Deckel- oder Hüftgurttasche packen – für Energietiefs zwischendurch."]
    },

    // ================= DINNER =================
    {
      id: "couscous-carbonara", name: "Couscous-Carbonara", mahlzeit: "dinner", basis: "Couscous",
      zutaten: [{ z: "couscous", g: 100 }, { z: "eipulver", g: 20 }, { z: "kaesepulver", g: 25 }, { z: "erbsen-tr", g: 20 }, { z: "pfeffer", g: 1 }, { z: "roestzwiebeln", g: 10 }, { z: "olivenoel", g: 10 }],
      wasser: 170, zeit: 8, kocher: true,
      zuhause: "Beutel A: Couscous + Erbsen. Beutel B: Eipulver + Käsepulver + Pfeffer. Röstzwiebeln separat.",
      unterwegs: ["{ml:130} Wasser in der Tasse aufkochen.", "Vom Herd nehmen, Beutel A einrühren, abdecken und 5 min quellen lassen.", "Inzwischen {ml:40} warmes Wasser und das Öl in Beutel B geben, verschließen und zu einer glatten Creme kneten.", "Couscous mit dem Göffel auflockern und die Creme unterheben. Das Ei stockt in der Restwärme, ohne am Boden anzusetzen.", "Röstzwiebeln drüberstreuen."]
    },
    {
      id: "pasta-carbonara", name: "Pasta-Carbonara mit Pilzen", mahlzeit: "dinner", basis: "Nudeln",
      zutaten: [{ z: "nudeln-schnell", g: 110 }, { z: "eipulver", g: 20 }, { z: "kaesepulver", g: 25 }, { z: "pilze-tr", g: 8 }, { z: "pfeffer", g: 1 }, { z: "olivenoel", g: 10 }],
      wasser: 400, zeit: 10, kocher: true,
      zuhause: "Beutel A: Nudeln, Pilze. Beutel B: Eipulver, Käsepulver, Pfeffer. Öl separat.",
      unterwegs: ["{ml:360} Wasser in der Tasse aufkochen.", "Beutel A einrühren und bei mittlerer Flamme etwa 4 min köcheln. Oft umrühren, bis das Wasser fast aufgesogen ist – nicht abgießen, die Stärke bindet die Sauce. Wird es zu trocken, einen Schluck Wasser nachgießen.", "Inzwischen {ml:40} warmes Wasser und das Öl in Beutel B geben und zu einer Creme kneten.", "Tasse vom Herd nehmen und die Creme sofort unterrühren. Nicht mehr erhitzen, sonst brennt das Ei an."]
    },
    {
      id: "carbonara-speck", name: "Couscous-Carbonara mit Speck", mahlzeit: "dinner", basis: "Couscous",
      zutaten: [{ z: "couscous", g: 100 }, { z: "eipulver", g: 20 }, { z: "kaesepulver", g: 20 }, { z: "speckwuerfel", g: 20 }, { z: "erbsen-tr", g: 15 }, { z: "pfeffer", g: 1 }],
      wasser: 170, zeit: 8, kocher: true,
      zuhause: "Beutel A: Couscous, Erbsen, Speckwürfel. Beutel B: Eipulver, Käsepulver, Pfeffer. Für die ersten Tourtage einplanen – der Speck hält nur wenige Tage.",
      unterwegs: ["{ml:130} Wasser in der Tasse aufkochen.", "Vom Herd nehmen, Beutel A einrühren, abdecken und 5 min quellen lassen.", "Inzwischen {ml:40} warmes Wasser in Beutel B geben, verschließen und zu einer glatten Creme kneten.", "Couscous mit dem Göffel auflockern und die Creme unterheben."]
    },
    {
      id: "dashi-ramen", name: "Dashi-Ramen mit Ei & Wakame", mahlzeit: "dinner", basis: "Ramen",
      zutaten: [{ z: "ramen", g: 100 }, { z: "dashi", g: 5 }, { z: "miso", g: 15 }, { z: "pilze-tr", g: 8 }, { z: "wakame", g: 2 }, { z: "fruehlingszwiebel-tr", g: 3 }, { z: "eipulver", g: 15 }, { z: "sesam", g: 5 }],
      wasser: 450, zeit: 6, kocher: true,
      zuhause: "Tütchen: Dashi, Pilze, Wakame, Frühlingszwiebel. Separat: Ramen, Eipulver (kleiner Beutel), Miso, Sesam.",
      unterwegs: ["{ml:420} Wasser mit dem Tütchen-Inhalt in der Tasse aufkochen und 2 min köcheln, damit Pilze und Wakame weich werden.", "Ramen hineinbrechen und 3 min garen, dabei mit dem Göffel auseinanderzupfen.", "Inzwischen {ml:30} kaltes Wasser in den Ei-Beutel geben und kneten, bis es glatt ist.", "Den Ei-Mix langsam in die siedende Brühe gießen und dabei rühren. So entstehen Eierflocken, und in Suppe brennt nichts an.", "Vom Herd nehmen, Miso einrühren, bis es sich gelöst hat (nicht mehr kochen), Sesam drüberstreuen."]
    },
    {
      id: "couscous-thunfisch", name: "Mediterraner Couscous mit Thunfisch", mahlzeit: "dinner", basis: "Couscous",
      zutaten: [{ z: "couscous", g: 100 }, { z: "thunfisch", g: 80 }, { z: "tomate-tr", g: 15 }, { z: "paprika-tr", g: 10 }, { z: "zucchini-tr", g: 10 }, { z: "gemuesebruehe", g: 5 }, { z: "kraeuter", g: 1 }, { z: "olivenoel", g: 15 }],
      wasser: 180, zeit: 8, kocher: true,
      zuhause: "Beutel A: getrocknete Tomaten, Paprika, Zucchini, Brühe, Kräuter. Beutel B: Couscous. Separat: Thunfisch-Dose, Öl.",
      unterwegs: ["{wasser} Wasser mit Beutel A in der Tasse aufkochen und 2 min köcheln, damit das Gemüse weich wird.", "Vom Herd nehmen, Couscous einrühren, abdecken und 5 min quellen lassen.", "Thunfisch abtropfen lassen und zusammen mit dem Öl unter den Couscous mischen.", "Leere Dose flach drücken und im Müllbeutel mitnehmen."]
    },
    {
      id: "chili-reis", name: "Chili sin Carne mit Reis", mahlzeit: "dinner", basis: "Reis",
      zutaten: [{ z: "instantreis", g: 80 }, { z: "tvp", g: 25 }, { z: "bohnen-tr", g: 30 }, { z: "mais-tr", g: 10 }, { z: "tomate-tr", g: 15 }, { z: "chilimix", g: 4 }, { z: "gemuesebruehe", g: 5 }, { z: "olivenoel", g: 10 }],
      wasser: 350, zeit: 12, kocher: true,
      zuhause: "Alles außer Öl in einen Beutel. Tomaten sehr klein schneiden.",
      unterwegs: ["{wasser} Wasser in der Tasse aufkochen und den Beutelinhalt einrühren.", "Bei kleiner Flamme 5 min köcheln, oft umrühren – Reis und Bohnen setzen sonst an.", "Vom Herd nehmen, abdecken und 5 min ziehen lassen, bis Bohnen und Soja weich sind.", "Öl unterrühren. In Tortillas gewickelt wird daraus ein Burrito."]
    },
    {
      id: "pueree-kaese", name: "Käse-Püree mit Röstzwiebeln", mahlzeit: "dinner", basis: "Kartoffelpüree",
      zutaten: [{ z: "kartoffelpueree", g: 80 }, { z: "milchpulver", g: 15 }, { z: "kaesepulver", g: 20 }, { z: "lauch-tr", g: 5 }, { z: "roestzwiebeln", g: 15 }, { z: "olivenoel", g: 10 }],
      wasser: 300, zeit: 5, kocher: true,
      zuhause: "Beutel A: Püreeflocken, Milchpulver, Käsepulver. Separat: Lauch, Röstzwiebeln, Öl.",
      unterwegs: ["{wasser} Wasser mit dem Lauch in der Tasse aufkochen und 1 min köcheln.", "Tasse vom Herd nehmen und etwa 30 s abkühlen lassen.", "Beutel A nach und nach einrühren, bis ein cremiges Püree entsteht. Nicht mehr erhitzen – Püree und Käse brennen sonst am Boden an.", "Öl unterrühren, Röstzwiebeln drüberstreuen."]
    },
    {
      id: "linsen-dal", name: "Rote-Linsen-Dal mit Couscous", mahlzeit: "dinner", basis: "Couscous",
      zutaten: [{ z: "couscous", g: 70 }, { z: "linsen-tr", g: 50 }, { z: "kokosmilchpulver", g: 20 }, { z: "curry", g: 4 }, { z: "karotte-tr", g: 10 }, { z: "spinat-tr", g: 5 }, { z: "gemuesebruehe", g: 5 }],
      wasser: 300, zeit: 10, kocher: true,
      zuhause: "Beutel A: Linsen, Kokosmilchpulver, Curry, Gemüse, Brühe. Beutel B: Couscous.",
      unterwegs: ["{wasser} Wasser mit Beutel A in der Tasse aufkochen.", "Bei kleiner Flamme 5 min köcheln, oft umrühren, bis die Linsen zerfallen und das Dal cremig wird.", "Vom Herd nehmen, Beutel B (Couscous) einrühren, abdecken und 5 min quellen lassen."]
    },
    {
      id: "pesto-pasta", name: "Pesto-Pasta mit Trockentomaten", mahlzeit: "dinner", basis: "Nudeln",
      zutaten: [{ z: "nudeln-schnell", g: 110 }, { z: "olivenoel", g: 15 }, { z: "kaesepulver", g: 15 }, { z: "kraeuter", g: 2 }, { z: "knoblauch", g: 1 }, { z: "nuesse", g: 15 }, { z: "tomate-tr", g: 15 }],
      wasser: 400, zeit: 8, kocher: true,
      zuhause: "Beutel A: Nudeln, Trockentomaten. Beutel B („Pesto-Pulver“): Käsepulver, Kräuter, Knoblauch, gehackte Nüsse (Pinienkerne oder Walnüsse). Öl separat.",
      unterwegs: ["{wasser} Wasser in der Tasse aufkochen.", "Beutel A einrühren und bei mittlerer Flamme etwa 4 min köcheln. Oft umrühren, bis das Wasser fast aufgesogen ist – nicht abgießen.", "Vom Herd nehmen, Öl und Beutel B unterrühren. Die Stärke der Nudeln macht daraus eine Sauce."]
    },
    {
      id: "erdnuss-nudeln", name: "Scharfe Erdnuss-Nudeln", mahlzeit: "dinner", basis: "Ramen",
      zutaten: [{ z: "ramen", g: 100 }, { z: "erdnussbutter", g: 30 }, { z: "sojasauce", g: 10 }, { z: "tvp", g: 20 }, { z: "karotte-tr", g: 8 }, { z: "paprika-tr", g: 8 }, { z: "fruehlingszwiebel-tr", g: 3 }, { z: "knoblauch", g: 1 }],
      wasser: 350, zeit: 6, kocher: true,
      zuhause: "Ramen, TVP, Gemüse und Knoblauch in einen Beutel. Erdnussbutter und Soja separat.",
      unterwegs: ["{wasser} Wasser in der Tasse aufkochen und den Beutelinhalt einrühren, die Ramen dabei zerbrechen.", "3 min köcheln, bis die Nudeln weich sind und nur noch ein paar Esslöffel Wasser übrig sind.", "Vom Herd nehmen, Erdnussbutter und Sojasauce einrühren, bis eine cremige Sauce entsteht. Nach Lust Chiliflocken dazu."]
    },
    {
      id: "couscous-chorizo", name: "Paprika-Couscous mit Chorizo", mahlzeit: "dinner", basis: "Couscous",
      zutaten: [{ z: "couscous", g: 100 }, { z: "chorizo", g: 50 }, { z: "paprika-tr", g: 15 }, { z: "tomate-tr", g: 10 }, { z: "gemuesebruehe", g: 5 }, { z: "knoblauch", g: 1 }],
      wasser: 170, zeit: 8, kocher: true,
      zuhause: "Beutel A: Paprika, Tomaten, Brühe, Knoblauch. Beutel B: Couscous. Chorizo am Stück.",
      unterwegs: ["{wasser} Wasser mit Beutel A in der Tasse aufkochen und 2 min köcheln.", "Vom Herd nehmen, Couscous einrühren, abdecken und 5 min quellen lassen.", "Chorizo klein würfeln und unterheben. Nicht in der Tasse anrösten – das brennt an."]
    },
    {
      id: "bulgur-pilz", name: "Pilz-Bulgur mit Bergkäse", mahlzeit: "dinner", basis: "Bulgur",
      zutaten: [{ z: "bulgur-fein", g: 100 }, { z: "pilze-tr", g: 10 }, { z: "lauch-tr", g: 5 }, { z: "gemuesebruehe", g: 6 }, { z: "hartkaese", g: 40 }, { z: "pfeffer", g: 1 }, { z: "olivenoel", g: 10 }],
      wasser: 220, zeit: 12, kocher: true,
      zuhause: "Bulgur, Pilze, Lauch, Brühe und Pfeffer in einen Beutel.",
      unterwegs: ["{wasser} Wasser mit dem Beutelinhalt in der Tasse aufkochen.", "1 min köcheln, dann vom Herd nehmen, abdecken und 10 min quellen lassen. Die Tasse in Jacke oder Mütze wickeln, damit sie heiß bleibt.", "Mit dem Göffel auflockern, den Käse drüberreiben oder würfeln und das Öl dazugeben."]
    }
  ]
};
