<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# KI für Capability Development: Was bereits entsteht – und was davon für OE interessant ist

KI ist in diesem Feld vor allem auf drei Arten hilfreich: Sie kann Menschen beim Lernen und Üben unterstützen, vorhandene Expertise leichter zugänglich machen und die gemeinsame Reflexion über Arbeit erleichtern. Das sind unterschiedliche Beiträge – und sie sollten nicht mit automatisierter «Skill-Erkennung» oder der Digitalisierung von Lerninhalten verwechselt werden.

Für deinen Kontext an der Universität Basel erscheinen mir besonders interessant:

1. realistische Gesprächs- und Fallsimulationen;
2. die gemeinsame Aufarbeitung von Erfahrungswissen;
3. quellengebundener Zugang zu institutionellem Wissen;
4. KI als zusätzlicher Perspektivengeber in Fallarbeit und Communities.

Auf GitHub gibt es dafür bereits konkrete Bausteine. Die Evidenz ist allerdings ungleich verteilt: Ein öffentliches Repository belegt, dass jemand einen Ansatz implementiert hat – nicht, dass dadurch nachhaltig Fähigkeiten oder organisationale Zusammenarbeit verbessert werden.

## 1. Die wichtigste Unterscheidung: Was soll KI eigentlich verbessern?

| Beitrag von KI | Beispiel | Was tatsächlich besser werden soll | Womit nicht verwechseln |
| :-- | :-- | :-- | :-- |
| Performance Support | Eine schwierige Aufgabe mit Unterstützung bewältigen | Aktuelles Arbeitsergebnis | Eigenständigem Kompetenzerwerb |
| Learning Support | Hinweise, Rückfragen, Übungsfälle, Feedback | Verständnis und späteres Handeln | Der Produktion einer richtigen Antwort |
| Knowledge Access | Passende Quellen, frühere Fälle und Entscheidungen finden | Zugang zu institutionellem Wissen | Einer verlässlichen fachlichen Entscheidung |
| Knowledge Articulation | Erfahrene Personen zu ihrem Vorgehen befragen | Explizite, überprüfbare Darstellung von Praxis | Vollständiger Übertragung impliziter Expertise |
| Collective Sensemaking | Alternativen und Annahmen in einer Gruppe untersuchen | Gemeinsames Verständnis und bessere Entscheidungen | Simulierter Beteiligung realer Stakeholder |
| Skills Intelligence | Anforderungen aus Texten extrahieren und strukturieren | Orientierung über benannte Anforderungen | Valider Beurteilung des Könnens einer Person |

Die Trennung zwischen Leistung und Lernen ist empirisch wichtig. Shen und Tamkin untersuchten 2026 in einem kleinen randomisierten Experiment mit 52 Softwareentwickelnden das Erlernen einer neuen Python-Bibliothek. Mit KI lag die anschliessende Testleistung bei durchschnittlich 50 statt 67 Prozent – ein Unterschied von 17 Prozentpunkten. Der Zeitvorteil war nicht statistisch signifikant. Das Experiment misst kurzfristiges Verständnis, nicht langfristige berufliche Entwicklung; es ist ein Preprint aus der Forschung eines KI-Anbieters.[^1]

Das heisst nicht «KI verhindert Lernen». Es heisst: Die Art der Nutzung und das Interaktionsdesign sind entscheidend.

______________________________________________________________________

## 2. Konkrete Projekte und Praktiken

Ich habe öffentliche Repositories, Projektdokumentationen und Forschungsquellen recherchiert. Die folgende Auswahl ist keine Installations- oder Sicherheitsprüfung. Wo ein Projekt nur durch README oder Selbstbeschreibung belegt ist, behandle ich dessen Funktionen als dokumentierte Projektangaben, nicht als unabhängig geprüfte Leistung.

### 2.1 Gesprächssimulationen: schwierige Situationen üben

#### Was Menschen bereits bauen

**PocketMentor** wird vom Entwickler als offener Simulator für schwierige Arbeitsplatzgespräche beschrieben: Scope Pushback, Feedback nach oben und die Verteidigung technischer Qualitätsanforderungen. Der Ablauf verbindet Szenario, KI-Gegenüber und anschliessende Rückmeldung zu Klarheit, Ton und Trade-offs. Die Projektvorstellung vom 4. Oktober 2026 verlinkt den Code unter `dipanshurdev/pocket-mentor`. Die GitHub-Seite konnte ich nicht direkt abrufen; hier ist die Entwicklerbeschreibung die Quelle.[^2]

Ein noch einfacheres Beispiel ist ein öffentliches «AI Roleplay Coach»-Prompt von Peter Munro, veröffentlicht im Juli 2025. Es beschreibt eine anspruchsvolle Gegenrolle, Widerstand gegen vage Aussagen und eine Auswertung nach Ende des Rollenspiels. Das ist kein vollständiges Produkt, sondern eine nachvollziehbare Interaktionsanleitung.[^3]

#### Warum das für OE interessant ist

Die praktische Chance liegt weniger in «KI-Coaching» als grossem Versprechen, sondern in zusätzlicher Übungszeit:

- einen unklaren Auftrag zurückverhandeln;
- einen Zielkonflikt ansprechen;
- in einer Sitzung begründet widersprechen;
- Verantwortung zwischen Fachstelle und Linie klären;
- die Grenzen einer KI-Ausgabe gegenüber einer Führungsperson erklären.

Meine Einschätzung: Solche Situationen sind für einen ersten Versuch geeigneter als automatisierte Persönlichkeits- oder Führungskräftebewertungen.

#### Wo es irreführen kann

Ein Modell kann sprachlich elegante, aber sachlich oder politisch unpassende Antworten belohnen. Es kennt die realen Beziehungen, Machtverhältnisse und institutionellen Konsequenzen nicht zuverlässig.

Deshalb würde ich das Feedback nicht als Score «Empathie: 82 Prozent» gestalten, sondern als überprüfbare Beobachtung:

> «Du hast die Zuständigkeit angesprochen, aber noch nicht geklärt, wer den Entscheid treffen darf. Welche Frage würdest du ergänzen?»

Für die genannten Projekte habe ich keine unabhängige Transferstudie gefunden. Die technische Demonstration ist weiter als der Wirksamkeitsnachweis.

______________________________________________________________________

### 2.2 Strukturierte Tutorien: nicht nur erklären, sondern Denken anregen

#### Was bereits existiert

Unter dem Namen OpenTutor gibt es mehrere unterschiedliche Projekte. Sie dürfen nicht als ein einziges System behandelt werden.

Das Repository `zijinz456/OpenTutor` beschreibt einen lokal betreibbaren Lernarbeitsplatz: Dokumente werden in Notizen, Fragen und Karteikarten überführt; ein Tutor soll quellenbezogen antworten und einen sokratischen Modus unterstützen. Das Projekt bezeichnet sich ausdrücklich als lokale Single-user Public Beta. Aussagen wie «cognitive load detection» oder Anpassung an Müdigkeit sind Projektclaims, keine hier verifizierten diagnostischen Fähigkeiten.[^4]

Daneben existiert die GitHub-Organisation `opentutor`, die von ICT Learning Sciences betreut wird und Werkzeuge für ein kontinuierlich verbessertes Tutoring Framework entwickelt. Das ist ein anderer Ansatz und ein anderer Träger.[^5]

#### Was daran nützlich ist

Das interessante Muster ist nicht «PDF hochladen, Lerninhalte erhalten», sondern:

1. eine reale Aufgabe stellen;
2. zuerst einen eigenen Versuch verlangen;
3. gezielte Hinweise statt sofortiger Komplettlösung geben;
4. Begründungen erfragen;
5. einen neuen Fall ohne Hilfe bearbeiten lassen.

Für eine Universität könnte das etwa die Interpretation einer Richtlinie, die Vorbereitung eines schwierigen Gesprächs oder die Bearbeitung eines administrativen Ausnahmefalls betreffen.

#### Die entscheidende Einschränkung

Eine zutreffende Antwort auf Basis eines Dokuments beweist weder Verständnis noch Anwendungskompetenz. Bei institutionellen Regeln kommen zusätzlich Zuständigkeit und Gültigkeit hinzu: Ein Tutor darf einen plausiblen Lösungsvorschlag nicht als verbindliche Auslegung ausgeben.

Meine Empfehlung wäre deshalb: Tutoring dort einsetzen, wo Aufgaben und Rückmeldungen fachlich prüfbar sind. Für offene Organisationskonflikte eher Reflexionshilfe als «richtige Antwort».

______________________________________________________________________

### 2.3 Erfahrungswissen artikulieren: vom Experteninterview zu prüfbaren Arbeitsmustern

#### Was bereits entsteht

`COLLEAGUE.SKILL` beschreibt einen Ansatz, aus Materialien einer Person oder Rolle wiederverwendbare KI-Skill-Pakete zu erzeugen. Der Preprint vom Mai 2026 unterscheidet einen «capability track» für Praktiken, mentale Modelle und Entscheidungsheuristiken von einem begrenzten «behavior track» für Interaktionsregeln und Kommunikationsstil. Als Arbeitsmaterialien werden beispielsweise Designentscheidungen, Review-Kommentare und Incident Notes genannt. Die Pakete sollen versioniert, korrigiert und zurückgesetzt werden können. Das ist eine Systembeschreibung, kein Nachweis erfolgreicher menschlicher Kompetenzentwicklung.[^6]

Hier ist eine begriffliche Falle besonders wichtig:

> Ein «Agent Skill» ist eine Anweisung oder Ressource für ein KI-System. Er ist nicht dasselbe wie ein Skill eines Menschen.

#### Was für OE daran wirklich interessant ist

Nicht das «Klonen» einer Expertin, sondern ein unterstützter Artikulationsprozess:

- Welche Hinweise erkennst du früh?
- Welche Ausnahme verändert dein Vorgehen?
- Was fragen weniger Erfahrene meist zu spät?
- Wann entscheidest du selbst, wann eskalierst du?
- Welche scheinbar gute Lösung ist gefährlich?
- Wo bist auch du unsicher?

KI kann daraus einen ersten Entwurf einer Fallheuristik, Checkliste oder Entscheidungshilfe erstellen. Der fachliche Wert entsteht aber erst durch Prüfung, Gegenbeispiele und Anwendung.

#### Eine bessere Übersetzung für deinen Kontext

Nicht:

> «Wir extrahieren das Wissen unserer erfahrenen Mitarbeitenden.»

Sondern:

> «Wir helfen erfahrenen Mitarbeitenden, ausgewählte Praktiken gemeinsam mit anderen verständlich, diskutierbar und wiederverwendbar zu machen.»

Das verändert auch die Machtbeziehung: Expertise wird nicht einfach als Rohstoff behandelt.

Ein sinnvoller Test wäre, eine zweite Person mit einem neuen Fall arbeiten zu lassen. Kann sie die Entscheidungshilfe verstehen, Grenzen erkennen und angemessen handeln? Erst dann gibt es einen Hinweis auf Übertragbarkeit.

______________________________________________________________________

### 2.4 Institutionelles Wissen zugänglich machen: Enterprise Search und RAG

#### Konkretes Beispiel: Onyx

Onyx, früher Danswer, verbindet Dokumentensuche und KI-Antworten mit organisationsinternen Quellen. Das Repository beschreibt Konnektoren, die Übernahme von Metadaten und Berechtigungen sowie unterschiedliche Betriebs- und Lizenzmodelle. Diese Angaben stammen aus der Projektdokumentation; ich habe keine konkrete Universitätsinstallation oder Berechtigungskonfiguration geprüft.[^7]

Der relevante Ansatz heisst Retrieval-Augmented Generation: Das System sucht passende Inhalte und verwendet diese als Grundlage einer Antwort.

#### Wie das Capability Development unterstützen kann

- Neue Mitarbeitende finden frühere Fälle.
- Teams können Entscheidungen und ihre Begründungen wiederfinden.
- Communities müssen dieselben Grundlagen weniger häufig erklären.
- Beschäftigte können sich vor einem Expertengespräch orientieren.

Das ist zunächst verbesserter Wissenszugang, nicht automatisch Lernen.

#### Der eigentliche OE-Engpass

Ein Suchsystem löst nicht:

- widersprüchliche Dokumente;
- fehlende Verantwortlichkeit;
- unklare Verbindlichkeit;
- überholte Regeln;
- Wissen, das nie dokumentiert wurde.

Meine Einschätzung: Für Basel wäre eine kleine kuratierte Fallsammlung häufig der bessere erste Schritt als «alle Quellen verbinden». Ein begrenzter Bestand erlaubt, Qualität, Zuständigkeit und tatsächliche Nutzung zu verstehen.

Bei einem späteren Systemtest würde ich nicht nur Antwortqualität prüfen, sondern auch:

- Findet es die richtige gültige Quelle?
- Zeigt es Unsicherheit bei Widersprüchen?
- Erkennt die nutzende Person, wann sie fachlich nachfragen muss?
- Bleiben Berechtigungen in der konkreten Installation wirksam?

______________________________________________________________________

### 2.5 KI als Perspektivengeber: Co-STORM und gemeinsame Wissenserschliessung

#### Konkretes Forschungsprojekt

Stanford entwickelt mit STORM und Co-STORM Systeme zur Wissenserschliessung. STORM recherchiert ein Thema aus verschiedenen Perspektiven und erstellt einen quellenbezogenen Bericht. Co-STORM ergänzt einen interaktiven Austausch zwischen quellenbasierten KI-Rollen, einer Moderationsrolle und einem Menschen, der Fragen und Richtungswechsel einbringen kann. Eine dynamische Wissensstruktur soll die Orientierung unterstützen. Die zugehörigen Arbeiten wurden 2024 bei NAACL beziehungsweise EMNLP veröffentlicht.[^8]

Die Forschenden sagen ausdrücklich, dass die erzeugten Texte nicht ohne Weiteres publikationsreif sind.[^8]

#### Warum das für Communities interessant ist

Das übertragbare Muster lautet:

> Nicht nur Antworten erzeugen, sondern unterschiedliche Fragen sichtbar machen.

Eine Community könnte beispielsweise untersuchen:

- Welche Annahmen stecken hinter unserem Entwicklungsprogramm?
- Welche Gegenargumente fehlen?
- Welche Evidenz gilt nur für einzelne Arbeitskontexte?
- Welche Perspektiven wurden bisher nicht berücksichtigt?

Meine Anwendungsidee: Eine KI bereitet vor einer Peer-Sitzung eine Quellen- und Fragenlandkarte vor. Die Menschen prüfen und bearbeiten sie gemeinsam.

#### Die Grenze

Eine simulierte Perspektive ist keine Beteiligung.

Ein KI-«Mitarbeitendenvertreter» ersetzt keine Mitarbeitendenvertretung. Ein KI-«Professor» repräsentiert nicht die Interessen oder Erfahrung einer Fakultät. Solche Rollen können Hypothesen anregen, dürfen aber nicht als empirische Stimmen behandelt werden.

Co-STORM ist deshalb eher ein interessanter Baustein für gemeinsame Wissenserschliessung als ein fertiges OE-Diagnoseinstrument.

______________________________________________________________________

### 2.6 Skills Intelligence: Anforderungen aus Texten erschliessen

#### Konkretes Beispiel: Nesta

Nesta dokumentiert mit OJD DAPS Skills eine Pipeline, die Skills aus englischsprachigen Stellenanzeigen extrahiert und mit Taxonomien wie ESCO verknüpft. Der Ansatz kombiniert unter anderem Named Entity Recognition und semantisches Matching. Die Dokumentation nennt ausdrücklich Grenzen: andere Sprachen, andere Textarten und das Ableiten neuer, bisher unbekannter Skills gehören nicht zum vorgesehenen Einsatz.[^9]

Besonders wertvoll ist die offene Darstellung von Fehlern. Bei einer manuellen Prüfung von 202 extrahierten Einträgen wurden 73 Prozent als ausgezeichnete Skill-Entities und zehn Prozent als unpassend bewertet. Die Qualität der Zuordnung hing unter anderem von der Ebene der Taxonomie ab. Das ist keine allgemeine Genauigkeitsquote für alle Anwendungen.[^9]

#### Für OE sinnvoll – aber enger als oft behauptet

Ein vertretbarer Einsatz wäre:

- mehrere Stellen- oder Rollenbeschreibungen vergleichen;
- unterschiedliche Begriffe für ähnliche Anforderungen sichtbar machen;
- erste Hypothesen für eine Capability Map erstellen;
- externe Anforderungssignale als Diskussionsmaterial aufbereiten.

Nicht gerechtfertigt wäre:

- aus einem Lebenslauf tatsächliches Können ableiten;
- aus E-Mails individuelle Skill-Scores erzeugen;
- fehlende Dokumentation als fehlende Fähigkeit interpretieren;
- Entwicklungs- und Personalauswahlentscheide automatisieren.

Der Unterschied ist fundamental: Textanalyse erkennt Aussagen über Fähigkeiten, nicht die Fähigkeiten selbst.

______________________________________________________________________

## 3. Was Organisationen bereits jenseits von GitHub tun

### 3.1 KI in fachübergreifender Zusammenarbeit erproben

Dell’Acqua et al. untersuchten in einem vorregistrierten Experiment mit 776 Fachpersonen bei Procter \& Gamble individuelle und gemeinsame Arbeit mit beziehungsweise ohne KI. Die 2026 veröffentlichte Studie berichtet, dass Einzelpersonen mit KI die Leistung von Zweierteams ohne KI erreichen konnten. KI half zudem, technische und kommerzielle Perspektiven stärker zu verbinden.[^10][^11]

Das ist für Capability Development interessant, weil KI möglicherweise den Zugang zu ergänzenden Perspektiven erleichtert.

Es beweist jedoch nicht:

- dass menschliche Zusammenarbeit überflüssig wird;
- dass fachübergreifende Beziehungen langfristig besser werden;
- dass neues Wissen ohne KI erhalten bleibt;
- dass organisationale Silos verschwinden.

Die Studie untersucht eine begrenzte Innovationsaufgabe. Die langfristige organisationale Entwicklung ist eine zusätzliche Frage.

### 3.2 KI-Kompetenz als reflektierte Zusammenarbeit vermitteln

Rick Dakan, Joseph Feller und Anthropic haben öffentlich zugängliche AI-Fluency-Kurse entwickelt. Seit August 2025 werden unter anderem Varianten für Lehrende, Studierende und die Vermittlung von AI Fluency angeboten; die Ankündigung nennt eine Creative-Commons-Lizenz zur institutionellen Anpassung.[^12]

Das ist ein Beispiel für einen curricularen Ansatz statt einer reinen Prompt-Sammlung. Die Veröffentlichung belegt die verfügbaren Materialien, nicht ihre Wirksamkeit.

Für deine Arbeit ist daran besonders relevant, dass man solche Ressourcen gemeinsam prüfen und lokal anpassen kann, statt sofort eine eigene Lernplattform aufzubauen.

### 3.3 Praxisbeispiele systematisch beobachten – ohne sie als Lernnachweis zu behandeln

Anthropic analysierte 2026 rund 400'000 Coding-Sessions und berichtet, dass fachliches Domänenwissen mit erfolgreicher Nutzung zusammenhängt. Das ist eine grosse Beobachtungsanalyse eines Anbieters, keine randomisierte Studie über Lernwirkungen. Sie stützt die vorsichtige Annahme, dass Fachverständnis beim Steuern und Prüfen von KI wertvoll bleibt; sie beweist keinen Kompetenzzuwachs durch Nutzung.[^13]

Die praktische Frage lautet damit nicht nur «Wer nutzt KI?», sondern:

> «Wer kann das Problem sinnvoll rahmen, Ergebnisse beurteilen und bei Fehlern wirksam eingreifen?»

______________________________________________________________________

## 4. Was ich aus der Landschaft ableiten würde

### 4.1 Vier unterschiedliche Reifegrade

| Feld | Was bereits überzeugend sichtbar ist | Was noch schwächer belegt ist |
| :-- | :-- | :-- |
| Wissenszugang | Technische Umsetzung von Suche, Quellenbezug und Dokumentenchat | Nachhaltige Kompetenzentwicklung und institutionelle Wissensqualität |
| Tutoring | Umsetzbare strukturierte Dialoge, Übungen und Rückfragen | Übertragbarkeit auf komplexe berufliche Urteilssituationen |
| Simulation | Niedrige Einstiegshürde für zusätzliche Übungsgelegenheiten | Valides Feedback und Transfer in reale Beziehungen |
| Erfahrungswissen / Reflexion | Entwürfe, Strukturierung, Fragen und wiederverwendbare Artefakte | Vollständigkeit, Erhalt impliziter Expertise und kollektiver Lerneffekt |
| Skills Intelligence | Extraktion und Zuordnung von Anforderungsbegriffen | Valide Beurteilung individuellen Könnens |

Das ist meine Synthese der recherchierten Projekte und Studien, keine formale Markt- oder Reifegradmessung.

### 4.2 Die grössere Lücke liegt nicht beim nächsten Chatbot

Die spannendere Entwicklungslinie wäre ein überprüfbarer Lernkreislauf:

1. Ein Mensch oder Team bearbeitet eine relevante Situation.
2. KI unterstützt mit Fragen, Quellen, Simulation oder Strukturierung.
3. Fachlich Verantwortliche prüfen die Interpretation.
4. Ein kleiner Versuch verändert tatsächliche Arbeit.
5. Die Beteiligten untersuchen Ergebnis und Nebenfolgen.
6. Nur die brauchbaren Erkenntnisse werden kuratiert und geteilt.

Viele Projekte decken einzelne Schritte ab. Der vollständige Kreis – einschliesslich Mandaten, Arbeitsbedingungen und gemeinsamer Bewertung – bleibt eine OE-Aufgabe.

______________________________________________________________________

## 5. Meine Priorisierung für deinen Kontext

Die folgende Rangfolge ist eine praktische Einschätzung, keine empirisch ermittelte Überlegenheit.


| Priorität | Ansatz | Warum zuerst? | Wichtige Grenze |
| :-- | :-- | :-- | :-- |
| 1 | KI-unterstützte Fallreflexion mit menschlicher Peer-Gruppe | Nah an deiner Arbeit; prüft auch strukturelle Erklärungen; kaum neue Infrastruktur nötig | KI darf die Problemdeutung nicht dominieren. |
| 2 | Eine lokal entwickelte Gesprächssimulation | Konkrete Übungsgelegenheit; begrenzter, beobachtbarer Anwendungsfall | Feedback braucht fachliche Kalibrierung. |
| 3 | Kuratierte Fälle mit quellengebundener Suchhilfe | Verbindet Wissenstransfer, Communities und Onboarding | Kuratierung und Verantwortung sind wichtiger als Datenmenge. |
| 4 | Tutor für einen klar abgegrenzten Gegenstand | Eigenständiges Lernen lässt sich vergleichsweise gut prüfen. | Keine vorschnelle Übertragung auf offene Organisationsfragen |
| Später | Institutionelle Skills-Inferenz | Hohe Governance- und Validitätsanforderungen | Nicht aus Kommunikationsspuren ein Personenmodell bauen |

### Experiment A: Eine Fallreflexion mit und ohne KI-Vorbereitung

Sechs Personen bringen je einen anonymisierten Arbeitsfall ein. KI hilft vorab lediglich dabei, Beobachtungen, Interpretationen und konkurrierende Hypothesen zu trennen.

Prüfen:

- Werden strukturelle Ursachen häufiger sichtbar?
- Entstehen tatsächlich bessere nächste Schritte?
- Welche Annahmen hat die KI unbegründet eingeführt?
- Hilft die Vorbereitung der Peer-Gruppe oder verengt sie deren Blick?

Es geht nicht um die Qualität des generierten Textes, sondern um die Qualität der anschliessenden gemeinsamen Arbeit.

### Experiment B: Eine schwierige Mandatsklärung simulieren

Ein einziges Szenario: Eine Person erhält einen bereichsübergreifenden Auftrag ohne ausreichendes Mandat.

Eine erfahrene OE-Person und eine fachlich verantwortliche Führungskraft definieren gemeinsam wenige Kriterien, beispielsweise:

- Auftrag und erwartetes Ergebnis klären;
- Entscheidungskompetenz benennen;
- Ressourcenkonflikt sichtbar machen;
- konkrete Vereinbarung erreichen.

Dann kurze Simulation, menschliche Auswertung und später Rückblick auf eine reale Anwendung. Kein automatisierter Leadership-Score.

### Experiment C: Fünf Erfahrungsfälle statt einer grossen Wissensplattform

Zwei erfahrene Mitarbeitende rekonstruieren fünf schwierige Fälle. KI hilft beim Nachfragen und Strukturieren. Danach prüfen andere Personen:

- Was ist verständlich?
- Was ist nur unter lokalen Bedingungen gültig?
- Welche Warnsignale fehlen?
- Wann muss eine Fachperson beigezogen werden?

Erst wenn diese Fälle tatsächlich genutzt werden, lohnt sich die Frage nach einer Such- oder Tutoring-Schicht.

______________________________________________________________________

## 6. Welche Projekte ich genauer ansehen würde

Für eine vertiefte Erkundung würde ich nicht zwanzig Repositories sammeln, sondern diese fünf Muster vergleichen:

1. `stanford-oval/storm` – wegen des expliziten Designs für Perspektiven, Fragen und menschliche Steuerung; Forschung und Code sind miteinander verbunden.[^8]
2. `onyx-dot-app/onyx` – als Referenz dafür, was organisationsinterner Wissenszugang technisch und organisatorisch verlangt; nicht als automatische Empfehlung für Basel.[^7]
3. Nestas OJD-DAPS-Dokumentation – besonders wegen der offengelegten Fehler, Messgrenzen und ausgeschlossenen Anwendungen.[^9]
4. Peter Munros Roleplay-Coach-Gist – als Beispiel, wie wenig Software für einen ersten Simulationstest erforderlich sein kann.[^3]
5. `COLLEAGUE.SKILL` – als kritischen Diskussionsgegenstand: Was bedeutet es, Expertise in ein Agent-Artefakt zu überführen, und was geht dabei verloren?[^6]

Vor einer Nutzung müssten jeweils Lizenz, Wartungszustand, Abhängigkeiten, Datenflüsse und konkrete Eignung separat geprüft werden. Diese Prüfung habe ich hier nicht durchgeführt.

Die wichtigste Verschiebung gegenüber einer üblichen Tool-Recherche ist: Nicht nach «KI für Skill Development» suchen, sondern nach einem konkreten Lern- oder Arbeitsmechanismus. Soll KI mehr Übung ermöglichen, bessere Fragen stellen, relevantes Wissen auffindbar machen oder gemeinsame Reflexion vorbereiten? Erst danach lässt sich beurteilen, ob ein bestehendes Projekt wirklich hilfreich ist.

<span style="display:none">[^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44][^45][^46][^47][^48][^49][^50][^51][^52][^53][^54][^55][^56][^57][^58][^59][^60][^61][^62][^63][^64][^65][^66][^67][^68][^69][^70][^71][^72][^73][^74][^75][^76]</span>

<div align="center">⁂</div>

[^1]: https://www.anthropic.com/research/AI-assistance-coding-skills

[^2]: https://dev.to/dipanshurdev/pocketmentor-an-open-source-workplace-conversation-simulator-built-for-my-junior-batchmate-5676

[^3]: https://gist.github.com/petermunro/731ba53bdac90fe83e5eb71e5ce88933

[^4]: https://github.com/zijinz456/OpenTutor/

[^5]: https://github.com/opentutor

[^6]: https://arxiv.org/html/2605.31264v1

[^7]: https://github.com/onyx-dot-app/onyx

[^8]: https://github.com/stanford-oval/storm

[^9]: https://nestauk.github.io/ojd_daps_skills/pipeline_summary/

[^10]: https://pubsonline.informs.org/doi/10.1287/orsc.2025.20702

[^11]: https://aiinstitute.hbs.edu/the-cybernetic-teammate-how-ai-is-reshaping-collaboration-and-expertise-in-the-workplace/

[^12]: https://www.anthropic.com/news/anthropic-higher-education-initiatives

[^13]: https://www.anthropic.com/research/claude-code-expertise

[^14]: https://mexicobusiness.news/talent/news/ai-tutors-corporate-training-design-determines-results

[^15]: https://arxiv.org/html/2603.11808

[^16]: https://github.com/topics/skill-extraction

[^17]: https://github.com/Saxenaayan/ConvoCoach-AI-Conversation-Simulator

[^18]: https://github.com/topics/skills-extraction

[^19]: https://github.com/topics/ai-roleplay

[^20]: https://workforce-data-initiative.github.io/skills-ml/examples/

[^21]: https://workforce-data-initiative.github.io/skills-ml/

[^22]: https://harmoniousdiscourse.substack.com/p/who-will-be-left-to-know

[^23]: https://www.libhunt.com/topic/roleplay

[^24]: https://github.com/topics/organizational-learning

[^25]: https://github.com/agnxxt/enterprise-search

[^26]: https://github.com/GaDevs/OpenTutor

[^27]: https://github.com/opentutor-ai/opentutor

[^28]: https://github.com/opentutor-ai/

[^29]: https://github.com/opentutor-io

[^30]: https://github.com/cabify/onyx

[^31]: https://github.com/stanford-oval/storm/releases

[^32]: https://github.com/tutornew/OpenTutor

[^33]: https://github.com/danswer-ai/danswerai

[^34]: https://github.com/stanford-oval/storm/blob/main/examples/costorm_examples/run_costorm_gpt.py

[^35]: https://github.com/rith321-lab/onyx-ai-enterprise-demo

[^36]: https://www.hbs.edu/faculty/Pages/item.aspx?num=68582

[^37]: https://www.hbs.edu/faculty/Pages/item.aspx?num=66680

[^38]: https://www.hbs.edu/faculty/research/publications/Pages/default.aspx?faculty=klakhani

[^39]: https://www.library.hbs.edu/working-knowledge/gen-ai-boosts-productivity-but-cant-turn-novices-into-experts

[^40]: https://www.library.hbs.edu/working-knowledge/ai-persuasion-bombing-can-make-experts-question-themselves

[^41]: https://aiinstitute.hbs.edu/the-real-ai-divide-isnt-who-uses-it-most/

[^42]: https://aiinstitute.hbs.edu/the-gender-divide-in-generative-ai-a-global-challenge-update/

[^43]: https://aiinstitute.hbs.edu/lish/

[^44]: https://www.hbs.edu/faculty/research/publications/Pages/default.aspx?faculty=rsadun

[^45]: https://aiinstitute.hbs.edu/lish/publications/

[^46]: https://www.hbs.edu/faculty/research/publications/Pages/default.aspx?topic=AI+and+Machine+Learning

[^47]: https://online.hbs.edu/blog/post/ai-in-procurement

[^48]: https://online.hbs.edu/blog/post/ai-dispute-resolution

[^49]: https://online.hbs.edu/podcast/will-ai-take-my-job

[^50]: https://www.anthropic.com/research/vibe-physics

[^51]: https://www-cdn.anthropic.com/519c17a5d23a794e8b6d50a854048d0b61e0d73a.pdf

[^52]: https://www.anthropic.com/research/team/alignment

[^53]: https://www.anthropic.com/research/impact-software-development

[^54]: https://www.anthropic.com/engineering

[^55]: https://www-cdn.anthropic.com/files/4zrzovbb/website/a6b3eb802a87e5516a302a9db3ebb357313f08e9.pdf

[^56]: https://www.anthropic.com/news

[^57]: https://www.anthropic.com/news/anthropic-teach-for-all

[^58]: https://www-cdn.anthropic.com/files/4zrzovbb/website/a11d9019e4a6b4ce2fa2cbf4317093726b68267c.pdf

[^59]: https://resources.anthropic.com/hubfs/The 2026 State of AI Agents Report.pdf

[^60]: https://resources.anthropic.com/hubfs/2026 Agentic Coding Trends Report.pdf

[^61]: https://alignment.anthropic.com/

[^62]: https://www.nature.com/collections/jcejfhfjic

[^63]: https://www.nature.com/collections/jcejfhfjic

[^64]: https://www.oneusefulthing.org/p/the-cybernetic-teammate

[^65]: https://fortune.com/2025/10/31/ai-artificial-intelligence-cybernetic-teammate-business-collaboration/

[^66]: https://whatsmyname.io/

[^67]: https://www.mindomax.com/can-ai-replace-human-tutors

[^68]: https://whatismyname.org/

[^69]: https://neuralhorizons.substack.com/p/growing-up-after-the-answer-human

[^70]: https://rottendog.substack.com/p/the-homework-got-an-a-what-did-the

[^71]: https://reclaimchildhoodmedia.substack.com/p/what-we-now-know

[^72]: https://researchre.s3.us-east-2.amazonaws.com/The+Cybernetic+Teammate-+A+Field+Experiment+on+Generative+AI+Reshaping+Teamwork+and+Expertise+|+Working+Paper.pdf

[^73]: https://www.linkedin.com/posts/vetonkrasniqi_edtech-aiineducation-highered-activity-7495253852020023296-wZpg

[^74]: work.university_of_basel

[^75]: [conversation link omitted for public copy]

[^76]: https://www.hbs.edu/faculty/Pages/item.aspx?num=67197
