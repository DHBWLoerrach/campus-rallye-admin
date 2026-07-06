# Campus Rallye Admin

Dieser Kontext definiert die gemeinsame Sprache für Inhalte, Standorte und Rallyes der Campus-Rallye.

## Sprache

### Standorte und Bereiche

**Standort**:
Ein DHBW-Standort, unter dem Bereiche und eine Campus-Tour verwaltet werden.
_Vermeiden_: Organisation, Mandant, Zwischenebene

**Bereich**:
Eine fachliche Gruppe innerhalb eines Standorts, die Rallyes für eine bestimmte Zielgruppe oder einen bestimmten Zweck anbieten kann.
_Vermeiden_: Department, Abteilung

**Studiengang**:
Ein Bereich, der einen akademischen Studiengang repräsentiert.
_Vermeiden_: Program department

**Studienzentrum**:
Ein Bereich, der mehrere zusammengehörige Studiengänge bündelt.
_Vermeiden_: Study center

### Rallyes

**Rallye**:
Eine spielbare Zusammenstellung von Fragen für eine Campus-Tour oder einen Bereich.
_Vermeiden_: Tour

**Campus-Tour**:
Eine Rallye, die ein Standort als freie Erkundungstour verwendet, ohne Teams, Spielzeit oder gespeicherte Antworten.
_Vermeiden_: Erkundungsmodus, Tour-Mode

**Team-Rallye**:
Ein konkreter Rallye-Durchlauf, bei dem Teams teilnehmen, Team-Antworten erhalten bleiben und die Spielzeit in das Ergebnis eingehen kann.
_Vermeiden_: Team event, Rallye-Durchlauf

**Bereichs-Rallye**:
Eine Team-Rallye, die von genau einem Bereich angeboten wird.
_Vermeiden_: Event-Rallye

**Studiengangs-Rallye**:
Eine Bereichs-Rallye, deren Bereich ein Studiengang ist.
_Vermeiden_: Program rallye

**Studienzentrums-Rallye**:
Eine Bereichs-Rallye, deren Bereich ein Studienzentrum ist.
_Vermeiden_: Study center rallye

**Rallye-Vorlage**:
Eine nicht spielbare, wiederverwendbare Vorlage, aus der konkrete Team-Rallyes erstellt werden können.
_Vermeiden_: Wiedergeöffnete Rallye

**Rallye-Code**:
Ein geteilter Zugangscode, mit dem Teilnehmende eine Team-Rallye in der App betreten.
_Vermeiden_: Passwort

**Rallye-Ende**:
Der Zeitpunkt, zu dem eine Team-Rallye regulär endet.
_Vermeiden_: Endzeitpunkt, end time

### Fragen

**Frage**:
Eine wiederverwendbare Frage, die unabhängig von einer konkreten Rallye existiert.
_Vermeiden_: Katalogfrage, question template

**Frage-Herkunft**:
Die fachliche Herkunft einer Frage, entweder Standort oder Bereich.
_Vermeiden_: Eigentümer, Owner, Ownership

**Standortfrage**:
Eine Frage, die zu genau einem Standort gehört und in Rallyes aller Bereiche dieses Standorts verwendet werden darf.
_Vermeiden_: allgemeine Frage

**Bereichsfrage**:
Eine Frage, die zu genau einem Bereich gehört und nur in Rallyes dieses Bereichs verwendet werden darf.
_Vermeiden_: private Frage

**Rallye-Frage**:
Eine Frage, die einer konkreten Rallye zugeordnet ist.
_Vermeiden_: Assigned question

**Vorlagen-Frage**:
Eine Frage, die einer Rallye-Vorlage zugeordnet ist.
_Vermeiden_: Template question

**Lösungsoption**:
Eine vorbereitete Antwortmöglichkeit einer Frage.
_Vermeiden_: Antwort

**Fragebild**:
Ein Bild, das Teil einer Bildfrage ist.
_Vermeiden_: Bild, uploaded image

**QR-Code**:
Die maschinenlesbare Darstellung der Lösungsoption einer QR-Code-Frage.
_Vermeiden_: QR image

**Kategorie**:
Ein frei vergebener Ordnungsbegriff für Fragen.
_Vermeiden_: Category tag

**Hinweis**:
Eine optionale Hilfestellung zu einer Frage.
_Vermeiden_: Help text

**Punktwert**:
Die maximal erreichbare Punktzahl einer Frage.
_Vermeiden_: Punkte

### Fragetypen

**Wissensfrage**:
Eine Frage mit freier Texteingabe und einer erwarteten Lösungsoption.
_Vermeiden_: Knowledge question

**Multiple-Choice-Frage**:
Eine Frage mit mehreren Lösungsoptionen, von denen genau eine korrekt ist.
_Vermeiden_: Multiple Choice

**Bildfrage**:
Eine Frage, bei der ein Bild Teil der Aufgabenstellung ist und deren Antwortform offen bleibt.
_Vermeiden_: Bild

**QR-Code-Frage**:
Eine Frage, deren Lösungsoption als QR-Code bereitgestellt wird.
_Vermeiden_: QR Code

**Upload-Frage**:
Eine Frage, die ein Upload-Foto als Team-Antwort erwartet.
_Vermeiden_: Upload

### Antworten, Bewertung und Ergebnis

**Team**:
Eine teilnehmende Gruppe in einer Team-Rallye.
_Vermeiden_: Spieler, Teilnehmergruppe

**Teilnehmende**:
Personen, die eine Rallye in der Rallye-App nutzen.
_Vermeiden_: Spieler, users

**Team-Antwort**:
Die Antwort, die ein Team zu einer Rallye-Frage abgibt.
_Vermeiden_: Antwort, submission

**Upload-Foto**:
Ein Foto, das ein Team als Team-Antwort zu einer Upload-Frage abgibt.
_Vermeiden_: Upload answer, photo answer

**Bewertung**:
Die Entscheidung, wie viele Team-Punkte eine Team-Antwort erhält.
_Vermeiden_: Scoring

**Team-Punkte**:
Die Punkte, die ein Team für eine Rallye-Frage erhält.
_Vermeiden_: Punkte

**Ergebnis**:
Die Rangliste der Teams einer Team-Rallye.
_Vermeiden_: Result

**Endstand**:
Das finale angezeigte Ergebnis einer Team-Rallye.
_Vermeiden_: Final ranking

**Spielzeit**:
Die Dauer, die ein Team für eine Team-Rallye benötigt.
_Vermeiden_: Time played, duration

### Status

**Campus-Tour-Status**:
Die Sichtbarkeitsphase einer Campus-Tour.
_Vermeiden_: Rallye-Status

**Aktiv**:
Ein Campus-Tour-Status, in dem die Campus-Tour in der Rallye-App sichtbar und spielbar ist.
_Vermeiden_: Gestartet

**Team-Rallye-Status**:
Die Lebenszyklusphase einer Team-Rallye.
_Vermeiden_: Rallye-Status, State

**Vorbereitung**:
Ein Team-Rallye-Status, in dem die Team-Rallye eingerichtet wird und noch unvollständig sein kann.
_Vermeiden_: Preparing

**Inaktiv**:
Ein Campus-Tour-Status oder Team-Rallye-Status, in dem die Rallye nicht sichtbar oder nicht aktiv spielbar ist.
_Vermeiden_: Inactive

**Gestartet**:
Ein Team-Rallye-Status, in dem Teams die Team-Rallye aktiv spielen können.
_Vermeiden_: Running

**Abstimmung**:
Ein Team-Rallye-Status kurz vor Abschluss, in dem Teams nach Freigabe durch den Organisator Antworten oder Upload-Fotos anderer Teams bewerten.
_Vermeiden_: Voting

**Abstimmungsfrage**:
Eine Rallye-Frage, deren Team-Antworten in der Abstimmung bewertet werden.
_Vermeiden_: Voting question

**Ranking**:
Ein Team-Rallye-Status, in dem das Ergebnis sichtbar, aber noch nicht final ist.
_Vermeiden_: Ranking phase

**Beendet**:
Ein Team-Rallye-Status, in dem die Team-Rallye geschlossen und der Endstand final ist.
_Vermeiden_: Ended

### Bearbeitung und Apps

**Admin-App**:
Die Webanwendung, in der Bearbeitende Standorte, Bereiche, Rallyes und Fragen verwalten.
_Vermeiden_: App

**Rallye-App**:
Die mobile App, in der Teilnehmende Rallyes nutzen.
_Vermeiden_: App, mobile App

**Bearbeitende**:
Personen, die Inhalte oder Struktur in der Admin-App pflegen dürfen.
_Vermeiden_: Mitarbeitende, User, staff user

**Admin**:
Ein Bearbeitender mit Vollzugriff auf Standorte, Bereiche, Rallyes und Fragen.
_Vermeiden_: Superuser

**Organisator**:
Ein Bearbeitender, der eine konkrete Team-Rallye durchführt und Status sowie Abstimmung steuert.
_Vermeiden_: Admin

**Zuständigkeit**:
Der fachliche Verantwortungsbereich eines Bearbeitenden für einen Standort oder einen Bereich.
_Vermeiden_: Rolle, permission scope, ownership

**Standort-Zuständigkeit**:
Eine Zuständigkeit für einen Standort, dessen Bereiche und die dazugehörigen Rallyes und Fragen.
_Vermeiden_: Standort-Rolle

**Bereichs-Zuständigkeit**:
Eine Zuständigkeit für einen Bereich und die dazugehörigen Rallyes und Fragen.
_Vermeiden_: Bereichs-Rolle

**Berechtigung**:
Ein aus Rolle und Zuständigkeit abgeleitetes Zugriffsrecht in der Admin-App.
_Vermeiden_: Zuständigkeit

## Begriffsbrücke für Code und Datenmodell

Die Fachsprache in diesem Dokument bleibt deutsch. Code, APIs und Datenmodell verwenden englische Begriffe. Die folgende Tabelle beschreibt die Zielnamen für neue oder zu überarbeitende Bezeichnungen.

Für Code-Bezeichner wird die Camel-Case-Form verwendet; Typen, Klassen und Komponenten können daraus PascalCase ableiten. Für Datenmodell-Bezeichner wird die Snake-Case-Form verwendet; Tabellen dürfen gemäß bestehender Datenbankkonvention pluralisiert werden.

| Fachbegriff            | Code-Bezeichner            | Datenmodell-Bezeichner      | Hinweis                                          |
| ---------------------- | -------------------------- | --------------------------- | ------------------------------------------------ |
| Standort               | `location`                 | `location`                  | Nicht `organization` verwenden.                  |
| Bereich                | `department`               | `department`                | Oberbegriff für Studiengänge und andere Gruppen. |
| Studiengang            | `studyProgram`             | `study_program`             | Spezielle Art von Bereich.                       |
| Studienzentrum         | `studyCenter`              | `study_center`              | Spezielle Art von Bereich.                       |
| Campus-Tour            | `campusTour`               | `campus_tour`               | Getrennt von Team-Rallyes modellieren.           |
| Rallye                 | `rallye`                   | `rallye`                    | Produktbegriff; nicht `tour`.                    |
| Team-Rallye            | `teamRallye`               | `team_rallye`               | Konkreter Team-Durchlauf.                        |
| Bereichs-Rallye        | `departmentRallye`         | `department_rallye`         | Primäres Modell für Team-Rallyes.                |
| Studiengangs-Rallye    | `studyProgramRallye`       | `study_program_rallye`      | Auffindbarkeit über Studiengang.                 |
| Studienzentrums-Rallye | `studyCenterRallye`        | `study_center_rallye`       | Auffindbarkeit über Studienzentrum.              |
| Rallye-Vorlage         | `rallyeTemplate`           | `rallye_template`           | Nicht spielbar.                                  |
| Rallye-Code            | `rallyeCode`               | `rallye_code`               | Nicht `password`.                                |
| Rallye-Ende            | `rallyeEnd`                | `rallye_end`                | Nur für Team-Rallyes.                            |
| Frage                  | `question`                 | `question`                  | Wiederverwendbare Frage.                         |
| Frage-Herkunft         | `questionOrigin`           | `question_origin`           | Nicht `owner` oder `ownership`.                  |
| Standortfrage          | `locationQuestion`         | `location_question`         | Frage mit Standort-Herkunft.                     |
| Bereichsfrage          | `departmentQuestion`       | `department_question`       | Frage mit Bereichs-Herkunft.                     |
| Rallye-Frage           | `rallyeQuestion`           | `rallye_question`           | Frage in einer konkreten Rallye.                 |
| Vorlagen-Frage         | `templateQuestion`         | `template_question`         | Frage in einer Rallye-Vorlage.                   |
| Lösungsoption          | `solutionOption`           | `solution_option`           | Vorbereitete Antwortmöglichkeit.                 |
| Fragebild              | `questionImage`            | `question_image`            | Bild als Teil einer Frage.                       |
| QR-Code                | `qrCode`                   | `qr_code`                   | Maschinenlesbare Lösungsoption.                  |
| Kategorie              | `category`                 | `category`                  | Konzept ist noch fachlich offen.                 |
| Hinweis                | `hint`                     | `hint`                      | Optionale Hilfestellung.                         |
| Punktwert              | `pointValue`               | `point_value`               | Erreichbare Punkte einer Frage.                  |
| Wissensfrage           | `knowledgeQuestion`        | `knowledge_question`        | Freitext mit erwarteter Lösungsoption.           |
| Multiple-Choice-Frage  | `multipleChoiceQuestion`   | `multiple_choice_question`  | Mehrere Lösungsoptionen, genau eine korrekt.     |
| Bildfrage              | `imageQuestion`            | `image_question`            | Frage mit Fragebild.                             |
| QR-Code-Frage          | `qrCodeQuestion`           | `qr_code_question`          | Lösungsoption wird als QR-Code bereitgestellt.   |
| Upload-Frage           | `uploadQuestion`           | `upload_question`           | Nur für Team-Rallyes.                            |
| Team                   | `team`                     | `team`                      | Teilnehmende Gruppe.                             |
| Teilnehmende           | `participant`              | `participant`               | Personen in der Rallye-App.                      |
| Team-Antwort           | `teamAnswer`               | `team_answer`               | Abgegebene Antwort eines Teams.                  |
| Upload-Foto            | `uploadedPhoto`            | `uploaded_photo`            | Foto als Team-Antwort.                           |
| Bewertung              | `evaluation`               | `evaluation`                | Vergibt Team-Punkte.                             |
| Team-Punkte            | `teamPoints`               | `team_points`               | Vergebene Punkte eines Teams.                    |
| Ergebnis               | `result`                   | `result`                    | Rangliste einer Team-Rallye.                     |
| Endstand               | `finalResult`              | `final_result`              | Finales Ergebnis.                                |
| Spielzeit              | `playTime`                 | `play_time`                 | Dauer eines Teams in der Team-Rallye.            |
| Campus-Tour-Status     | `campusTourStatus`         | `campus_tour_status`        | Statuskonzept nur für Campus-Touren.             |
| Team-Rallye-Status     | `teamRallyeStatus`         | `team_rallye_status`        | Statuskonzept nur für Team-Rallyes.              |
| Aktiv                  | `active`                   | `active`                    | Campus-Tour-Statuswert.                          |
| Inaktiv                | `inactive`                 | `inactive`                  | Campus-Tour- oder Team-Rallye-Statuswert.        |
| Vorbereitung           | `preparing`                | `preparing`                 | Team-Rallye-Statuswert.                          |
| Gestartet              | `running`                  | `running`                   | Team-Rallye-Statuswert.                          |
| Abstimmung             | `voting`                   | `voting`                    | Team-Rallye-Statuswert und Bewertungsphase.      |
| Abstimmungsfrage       | `votingQuestion`           | `voting_question`           | Rallye-Frage in der Abstimmung.                  |
| Ranking                | `ranking`                  | `ranking`                   | Team-Rallye-Statuswert.                          |
| Beendet                | `ended`                    | `ended`                     | Finaler Team-Rallye-Statuswert.                  |
| Admin-App              | `adminApp`                 | `admin_app`                 | Webanwendung für Bearbeitende.                   |
| Rallye-App             | `rallyeApp`                | `rallye_app`                | App für Teilnehmende.                            |
| Bearbeitende           | `editor`                   | `editor`                    | Nicht `staff user`.                              |
| Admin                  | `admin`                    | `admin`                     | Bearbeitender mit Vollzugriff.                   |
| Organisator            | `organizer`                | `organizer`                 | Führt eine konkrete Team-Rallye durch.           |
| Zuständigkeit          | `responsibility`           | `responsibility`            | Nicht `role` oder `permission`.                  |
| Standort-Zuständigkeit | `locationResponsibility`   | `location_responsibility`   | Zuständigkeit für einen Standort.                |
| Bereichs-Zuständigkeit | `departmentResponsibility` | `department_responsibility` | Zuständigkeit für einen Bereich.                 |
| Berechtigung           | `permission`               | `permission`                | Abgeleitetes Zugriffsrecht.                      |

**Antwort** wird nicht als eigener Code-Begriff verwendet, weil der deutsche Begriff überladen ist. Für vorbereitete Antwortmöglichkeiten gilt `solutionOption`; für abgegebene Team-Antworten gilt `teamAnswer`.

## Beziehungen

### Struktur und Auffindbarkeit

- Ein **Standort** hat null oder mehr **Bereiche**.
- Zwischen **Standort** und **Bereich** gibt es keine weiteren fachlichen Ebenen.
- Ein **Studiengang** und ein **Studienzentrum** sind jeweils ein **Bereich**.
- Ein **Studienzentrum** bündelt einen oder mehrere **Studiengänge**.
- Andere Gruppen wie Studierendenvertretung oder Hochschulkommunikation sind **Bereiche** ohne eigenen Untertyp.
- Ein **Standort** hat null oder eine **Campus-Tour**.
- Eine **Campus-Tour** wird über ihren **Standort** gefunden.
- Eine **Bereichs-Rallye** wird über ihre **Bereich** gefunden.
- Eine **Studiengangs-Rallye** wird über ihren **Studiengang** gefunden.
- Eine **Studienzentrums-Rallye** wird über ihr **Studienzentrum** und dessen **Studiengänge** gefunden.

### Rallyes und Vorlagen

- Eine **Campus-Tour** und eine **Bereichs-Rallye** sind jeweils eine **Rallye**.
- Eine **Bereichs-Rallye** ist eine **Team-Rallye** und wird von genau einem **Bereich** angeboten.
- Eine **Studiengangs-Rallye** und eine **Studienzentrums-Rallye** sind jeweils eine **Bereichs-Rallye**.
- **Studiengangs-Rallyes** und **Studienzentrums-Rallyes** unterscheiden sich von anderen **Bereichs-Rallyes** nur durch Einordnung und Auffindbarkeit, nicht durch Regeln oder Teilnehmererlebnis.
- Eine **Rallye-Vorlage** gehört zu genau einem **Bereich**.
- Eine **Bereich** kann null oder mehr **Rallye-Vorlagen** haben.
- Eine **Rallye-Vorlage** ist keine **Rallye** und ist nicht spielbar.
- Aus einer **Rallye-Vorlage** können null oder mehr **Team-Rallyes** erstellt werden.
- Aus einer **Rallye-Vorlage** entstehen keine **Campus-Touren**.
- Eine **Campus-Tour** wird direkt am **Standort** gepflegt.
- Eine **Rallye-Vorlage** enthält wiederverwendbare **Vorlagen-Fragen**, aber keine **Teams**, **Team-Antworten**, **Spielzeiten** oder **Ergebnisse**.
- Eine **Rallye-Vorlage** definiert keine fachliche Reihenfolge ihrer **Vorlagen-Fragen**.

### Fragen und Verwendung

- Eine **Frage** hat genau eine **Frage-Herkunft**.
- Eine **Frage** ist entweder eine **Standortfrage** oder eine **Bereichsfrage**.
- Eine **Standortfrage** gehört zu genau einem **Standort**.
- Eine **Bereichsfrage** gehört zu genau einem **Bereich**.
- Es gibt keine standortübergreifenden **Fragen**.
- Eine **Standortfrage** darf in **Campus-Touren** und in **Bereichs-Rallyes** ihres **Standorts** verwendet werden, sofern ihr Fragetyp dort fachlich erlaubt ist.
- Eine **Bereichsfrage** darf nur in **Bereichs-Rallyes** ihrer eigenen **Bereich** verwendet werden.
- Eine **Bereichs-Rallye** darf **Bereichsfragen** ihrer eigenen **Bereich** und **Standortfragen** ihres **Standorts** verwenden.
- Eine **Bereichs-Rallye** darf keine **Bereichsfragen** anderer **Bereiche** verwenden.
- Eine **Rallye-Vorlage** darf **Bereichsfragen** ihrer eigenen **Bereich** und **Standortfragen** ihres **Standorts** verwenden.
- Eine **Rallye-Vorlage** darf keine **Bereichsfragen** anderer **Bereiche** verwenden.
- Eine **Campus-Tour** darf **Standortfragen** ihres **Standorts** verwenden und keine **Bereichsfragen**.
- **Frage**-Herkunft und Fragetyp sind getrennte Eigenschaften.
- Eine **Rallye-Frage** entsteht, wenn eine **Frage** einer **Rallye** zugeordnet wird.
- Eine **Vorlagen-Frage** entsteht, wenn eine **Frage** einer **Rallye-Vorlage** zugeordnet wird.
- Aus **Vorlagen-Fragen** werden beim Erstellen einer **Team-Rallye** **Rallye-Fragen**.

### Fragetypen und Antworten

- Eine **Frage** hat genau einen Fragetyp.
- **Wissensfrage**, **Multiple-Choice-Frage**, **Bildfrage**, **QR-Code-Frage** und **Upload-Frage** sind jeweils eine **Frage**.
- Eine **Frage** hat null oder mehr **Lösungsoptionen**.
- Eine **Wissensfrage** hat genau eine erwartete **Lösungsoption**.
- Eine **Multiple-Choice-Frage** hat mindestens zwei **Lösungsoptionen**, von denen genau eine korrekt ist.
- Eine **Bildfrage** hat genau ein **Fragebild**; ihre Antwortform bleibt offen.
- Eine **QR-Code-Frage** hat genau eine **Lösungsoption** und kann daraus einen **QR-Code** erzeugen.
- Eine **Upload-Frage** hat keine **Lösungsoption** und gehört nur in eine **Team-Rallye**.
- Eine **Campus-Tour** sollte keine **Upload-Fragen** enthalten.
- Eine **Frage** hat null oder eine **Kategorie**, null oder einen **Hinweis** und null oder einen **Punktwert**.

### Teams, Bewertung und Ergebnis

- Eine **Team-Rallye** hat null oder mehr **Teams**.
- Ein **Team** gehört zu genau einer **Team-Rallye**.
- Eine **Rallye** kann null oder mehr **Teilnehmende** haben.
- In einer **Team-Rallye** nehmen **Teilnehmende** als **Teams** teil.
- In einer **Campus-Tour** bilden **Teilnehmende** keine **Teams**.
- Ein **Team** kann pro **Rallye-Frage** eine **Team-Antwort** abgeben.
- **Team-Antwort** ist der Oberbegriff für ausgewählte Optionen, freien Text, QR-Code-Eingaben und Upload-Fotos eines **Teams**.
- Ein **Upload-Foto** ist eine **Team-Antwort**.
- Eine **Bewertung** vergibt **Team-Punkte** für eine **Team-Antwort**.
- Eine **Bewertung** kann automatisch oder durch **Abstimmung** entstehen.
- **Abstimmung** ist eine Form der **Bewertung** durch **Teams**.
- Eine **Team-Antwort** hat null oder einen Wert für **Team-Punkte**.
- Eine **Team-Rallye** hat null oder ein **Ergebnis**.
- Ein **Endstand** ist das finale **Ergebnis**.
- Ein **Ergebnis** sortiert **Teams** zuerst nach **Team-Punkten**, dann nach **Spielzeit**.

### Status und Ablauf

- Eine **Campus-Tour** hat genau einen **Campus-Tour-Status**.
- **Aktiv** und **Inaktiv** sind **Campus-Tour-Status**-Werte.
- Eine **Team-Rallye** hat genau einen **Team-Rallye-Status**.
- **Vorbereitung**, **Inaktiv**, **Gestartet**, **Abstimmung**, **Ranking** und **Beendet** sind **Team-Rallye-Status**-Werte.
- Eine **Team-Rallye** startet fachlich durch den Statuswechsel zu **Gestartet**, nicht durch einen eigenen Startzeitpunkt.
- Eine **Team-Rallye** in **Vorbereitung** kann keinen **Rallye-Code** haben.
- Eine **Team-Rallye** im Status **Gestartet** braucht genau einen **Rallye-Code**.
- Eine **Team-Rallye** hat genau ein **Rallye-Ende**.
- Das **Rallye-Ende** markiert den regulären Spielschluss, löst aber keinen automatischen Statuswechsel aus.
- Nach dem **Rallye-Ende** steuert der **Organisator** die Übergänge in **Abstimmung**, **Ranking** und **Beendet**.
- Im Status **Ranking** ist das **Ergebnis** sichtbar, aber noch nicht der **Endstand**.
- Im Status **Beendet** ist das **Ergebnis** der **Endstand**.
- **Beendet** ist für eine konkrete **Team-Rallye** final.
- Eine beendete **Team-Rallye** wird nicht wieder geöffnet; Wiederverwendung erfolgt über eine neue **Team-Rallye** aus einer **Rallye-Vorlage**.
- Eine **Abstimmungsfrage** ist eine **Rallye-Frage** und gehört nur in eine **Team-Rallye**.
- Eine **Campus-Tour** hat keine **Abstimmungsfragen**, keinen **Rallye-Code** und kein **Rallye-Ende**.

### Bearbeitung und Berechtigung

- **Bearbeitende** nutzen die **Admin-App**.
- **Teilnehmende** nutzen die **Rallye-App**.
- Ein **Admin** ist ein **Bearbeitender** und kann alle **Standorte**, **Bereiche**, **Rallyes** und **Fragen** bearbeiten.
- Ein **Organisator** ist ein **Bearbeitender**.
- Ein **Bearbeitender** kann null oder mehr **Zuständigkeiten** haben.
- Eine **Zuständigkeit** bezieht sich auf einen **Standort** oder einen **Bereich**.
- Eine **Standort-Zuständigkeit** und eine **Bereichs-Zuständigkeit** sind jeweils eine **Zuständigkeit**.
- Eine **Standort-Zuständigkeit** umfasst alle **Bereiche** des **Standorts**.
- Eine **Bereichs-Zuständigkeit** umfasst genau einen **Bereich**.
- Die **Bereichs-Zuständigkeit** für ein **Studienzentrum** umfasst nicht automatisch die gebündelten **Studiengänge**.
- Eine **Zuständigkeit** bestimmt die fachliche Verantwortung eines **Bearbeitenden**.
- Eine **Berechtigung** bestimmt, welche **Rallyes** und **Fragen** ein **Bearbeitender** in der **Admin-App** bearbeiten darf.
- Eine **Berechtigung** kann aus einer **Zuständigkeit** abgeleitet werden.
- Ein **Admin** darf alle **Standortfragen** und **Bereichsfragen** bearbeiten.
- Ein **Bearbeitender** mit **Standort-Zuständigkeit** darf die **Standortfragen** dieses **Standorts** und die **Bereichsfragen** aller **Bereiche** dieses **Standorts** bearbeiten.
- Ein **Bearbeitender** mit **Bereichs-Zuständigkeit** darf **Bereichsfragen** genau dieses **Bereichs** bearbeiten.
- Ein **Bearbeitender** mit nur **Bereichs-Zuständigkeit** darf **Standortfragen** verwenden, aber nicht bearbeiten.
- Ein **Bearbeitender** ohne passende **Zuständigkeit** darf **Bereichsfragen** weder verwenden noch bearbeiten.

## Beispieldialog

> **Dev:** "Soll diese Rallye direkt an den **Standort** gehängt werden?"
> **Domain Expert:** "Nur eine **Campus-Tour** gehört direkt zum **Standort**. Eine **Team-Rallye** ist eine **Bereichs-Rallye**, also hänge sie an den **Bereich**, der sie anbietet."

## Geklärte Unschärfen

- `department` taucht in Produkt- und Codesprache sowohl als "Bereich" als auch als "Studiengang" auf. Geklärt: **Bereich** ist der kanonische Oberbegriff; **Studiengang** ist eine bestimmte Art von Bereich.
- "Abteilung" ist ein älteres Synonym für **Bereich**, aber nicht mehr der bevorzugte Domänenbegriff.
- "Erkundungsmodus" und "Tour-Mode" tauchen rund um Default-Rallyes auf. Geklärt: **Campus-Tour** ist der kanonische Domänenbegriff.
- "Weitere Rallyes" ist eine UI-Auffanggruppe. Geklärt: Das ist kein Domänenkonzept; solche Rallyes sind unklassifizierte Daten, die korrigiert werden sollten.
- "Antwort" meint sowohl vorbereitete Antwortdaten als auch die Antwort eines Teams. Geklärt: **Lösungsoption** für vorbereitete Optionen, **Team-Antwort** für abgegebene Antworten.
- "Korrekte Lösungsoption" sollte nur bei **Multiple-Choice-Fragen** verwendet werden; bei **Wissensfragen** und **QR-Code-Fragen** heißt es erwartete **Lösungsoption**.
- "Bild", "QR Code" und "Upload" tauchen als kurze UI-Labels auf. Geklärt: In der Domänensprache heißen sie **Bildfrage**, **QR-Code-Frage** und **Upload-Frage**.
- "Punkte" meint sowohl erreichbare als auch vergebene Punkte. Geklärt: **Punktwert** für Fragen, **Team-Punkte** für vergebene Punkte.
- "Admin" und "Organisator" werden manchmal vermischt. Geklärt: **Admin** hat Vollzugriff; **Organisator** führt eine Team-Rallye durch.
- Studierende mit Sonderzugriff auf die **Admin-App** sind **Bearbeitende**, keine eigene Domänenrolle.
- "Rolle" sollte nicht für fachliche Verantwortungsbereiche verwendet werden. Geklärt: Dafür heißt der Begriff **Zuständigkeit**.
- "Passwort" taucht für Rallye-Zugang auf. Geklärt: **Rallye-Code** ist treffender, weil es ein geteilter Zugangscode ist.
- "Fragenkatalog" ist UI-Wording für die Liste aller **Fragen**, aber kein eigenes Domänenkonzept.
- "Zuordnung" ist UI-Aktionssprache für das Zuordnen von **Fragen** zu **Rallyes**, aber kein eigenes Domänenkonzept.
- **Standort** meint einen DHBW-Standort, keine beliebige Organisationshierarchie.
- "Organisation" ist bestehendes Code- und UI-Wording für **Standort**, aber kein akzeptiertes fachliches Synonym.
- **Kategorie** ist aktuell ein loser Ordnungsbegriff. Ob Kategorien ein gepflegtes Vokabular werden und ob sie standort- oder bereichsspezifisch sind, ist offen.
- "Event-Rallye" und **Event-Bereich** wurden als eigene Konzepte erwogen. Geklärt: Eine Team-Rallye ist eine **Bereichs-Rallye**; ein Event-Kontext sollte erst modelliert werden, wenn er ein echtes Konzept wird.
- Eine eigene Organisator-Bewertung gibt es aktuell nicht; nicht automatisch bewertete **Team-Antworten** werden über **Abstimmung** bewertet.
- **Rallye-Vorlage** ist fachlich beschlossen, aber im aktuellen Datenmodell noch nicht umgesetzt.
- Der aktuelle Code modelliert **Campus-Touren** noch als normale Rallyes; fachlich haben Campus-Touren nur **Aktiv**/**Inaktiv**, keinen **Rallye-Code** und kein **Rallye-Ende**.
