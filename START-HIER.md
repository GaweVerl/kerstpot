# De kerstpot

Eenvoudige Nederlandse Secret Santa-site voor één familie en één trekking. Geschikt voor Netlify, met Supabase als gedeelde opslag. Geen accounts, e-mails of betaalde frontend-diensten nodig.

## Online zetten

1. Maak een Supabase-project aan. Open **SQL Editor**, plak de inhoud van `supabase.sql` en voer deze eenmalig uit.
2. Zet deze hele map in een eigen Git-repository en importeer die in Netlify. Als deze map onderdeel van een grotere repository is, stel **Base directory** in op `secret-santa`. De overige instellingen staan in `netlify.toml`.
3. Voeg in Netlify bij **Environment variables** deze drie waarden toe, beschikbaar voor Functions:
   - `SUPABASE_URL`: de project-URL uit Supabase.
   - `SUPABASE_SECRET_KEY`: de geheime `sb_secret_…`-sleutel uit Supabase. Een bestaande legacy `service_role`-sleutel werkt ook. Gebruik geen openbare sleutel.
   - `OWNER_PASSWORD`: een uniek wachtwoord van minstens 16 tekens. Het voorbeeldwachtwoord voor de lokale demo mag je hiervoor niet gebruiken.
4. Laat Netlify opnieuw deployen. Deel het gewone websiteadres met de familie.

Upload niet alleen `dist` met Netlify Drop: deze site heeft ook de serverfuncties nodig. Gebruik een repository-deploy of Netlify CLI met ondersteuning voor functies.

## Zo gebruik je het

- Iedereen opent de site en stopt zijn eigen naam in de pot. Gelijke voornamen? Voeg een achternaam toe.
- Elke deelnemer bewaart zijn persoonlijke terugkeerlink. De browser onthoudt die ook, zolang browseropslag beschikbaar blijft. De link geeft toegang tot het eigen lootje; deel hem niet.
- Jij gaat naar `https://jouw-site.netlify.app/beheer`. Er staat geen beheerlink op de gewone pagina. Alleen met jouw wachtwoord kan de trekking worden geopend.
- Controleer de namen, vink aan dat iedereen meedoet en klik **Open de trekking**. Minimaal twee deelnemers nodig.
- Iedereen kan vervolgens **Trek mijn lootje** gebruiken. Wie de site al open had, klikt eerst op **Is de trekking al open?**
- Niemand trekt zichzelf, iedereen ontvangt precies één keer en opnieuw klikken toont hetzelfde lootje. De verdeling wordt atomair vastgelegd. Na opening kunnen geen deelnemers meer worden toegevoegd en kan niet opnieuw worden geschud.

Een persoonlijke link is het toegangsbewijs. Er is bewust geen herstel op basis van alleen een naam: anders zou iemand andermans lootje kunnen openen. Gebruik bij voorkeur één deelnemer per browserprofiel. Op een gedeeld toestel kun je wisselen door de persoonlijke links te openen.

De namenlijst is zichtbaar voor iedereen die het siteadres heeft; getrokken namen worden alleen aan de juiste deelnemer teruggegeven. Iedereen met het siteadres kan zich inschrijven zolang de pot open is. Houd dat adres binnen de familie. Het beheerderswachtwoord beschermt de actie op de server, ook als iemand `/beheer` ontdekt. Als database-eigenaar kun je technisch de verdeling in Supabase bekijken.

## Lokaal bekijken

Installeer Node.js 22 of nieuwer. Voer in deze map `npm ci` en `npm run preview` uit. Open `http://localhost:4173`. Dit is een tijdelijke lokale demo met een echte PostgreSQL-testomgeving in het geheugen. Bij stoppen verdwijnen de namen. Het demowachtwoord voor `/beheer` is `kerstpot-demo-2026`. Deze demodatabase en dit wachtwoord worden niet gepubliceerd.

## Controles

`npm test` controleert de SQL-verdeling, dubbele namen, privacy, het blokkeren van late inschrijvingen, herhaalde klikken en serverautorisatie. `npm run build` maakt de statische bestanden voor Netlify. De productieomgeving moet na het instellen van je eigen sleutels nog worden gecontroleerd: schrijf twee proefdeelnemers in vanuit twee browserprofielen, open de trekking en controleer beide lootjes. Gebruik hiervoor een apart testproject als je de echte pot leeg wilt houden.

De website gebruikt geen frontend-framework en laadt geen externe lettertypes of trackers. Supabase en Netlify zijn nog niet verbonden vanuit deze werkmap; daarvoor zijn je eigen accounts en bovenstaande instellingen nodig.

Browsers die WebMCP ondersteunen krijgen ook een aanmeldactie voor assistenten. Deze optionele browserintegratie is niet in een ondersteunde WebMCP-browser getest; de gewone formulieren werken onafhankelijk daarvan.

Documentatie: [Netlify Functions](https://docs.netlify.com/build/functions/get-started/), [Netlify configuratie](https://docs.netlify.com/build/configure-builds/file-based-configuration/), [Supabase API-sleutels](https://supabase.com/docs/guides/getting-started/api-keys).
