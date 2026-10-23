# Karmadent: come mettere online il sito

Il sito ha due indirizzi:

- **karmadent.it**: il sito che vedono i pazienti. Nessun account, nessun login.
- **karmadent.it/admin.html**: il pannello del proprietario, protetto da email e password.

Ci sono due servizi da configurare, entrambi gratuiti:

- **Supabase** conserva testi, foto, video e le richieste dei pazienti, e gestisce il login del proprietario.
- **Netlify** mette il sito online.

Tempo totale: circa 20 minuti.

---

## Passo 1: crea il database

1. Vai su **supabase.com**, premi **Start your project** e registrati.
2. Premi **New project**:
   - Name: `karmadent`
   - Database password: inventane una e salvala da qualche parte
   - Region: **Central EU (Frankfurt)**, così i dati restano in Europa
3. Aspetta circa un minuto che il progetto sia pronto.

## Passo 2: prepara le tabelle

1. Nel menu a sinistra apri **SQL Editor** e premi **New query**.
2. Apri il file `supabase-setup.sql` con il Blocco note, copia tutto e incollalo.
3. Premi **Run**. Deve comparire "Success".

## Passo 3: crea l'account del proprietario

1. Apri **Authentication** e poi **Users**, premi **Add user** e poi **Create new user**.
2. Inserisci l'email e la password del proprietario e spunta **Auto Confirm User**.
3. **Importante:** vai in **Authentication**, poi **Sign In / Providers** (in alcune versioni si chiama "Settings"), e **disattiva "Allow new users to sign up"**. Così nessun altro può crearsi un account.

Puoi creare altri account (per esempio uno per la segreteria) ripetendo il punto 1.

## Passo 4: collega il sito al database

1. Apri **Project Settings** (l'ingranaggio), poi **API** (oppure **Data API** e **API Keys**).
2. Copia **Project URL** e la chiave **anon public**.
3. Apri il file `config.js` e incolla i due valori al posto delle scritte `INSERISCI_QUI…`.

Non usare mai la chiave "service_role": è segreta.

## Passo 5: metti il sito online

1. Vai su **netlify.com** e registrati.
2. Apri **Add new site** e scegli **Deploy manually**.
3. Trascina **l'intera cartella del sito**, cioè quella con `index.html`, `admin.html`, `config.js` e gli altri file.
4. In pochi secondi ricevi un indirizzo, tipo `karmadent-xyz.netlify.app`.
5. Per usare **karmadent.it** apri **Domain management**, poi **Add a domain**, e segui le istruzioni. Si cambiano due impostazioni dove avete comprato il dominio.

Per aggiornare i file in futuro: **Deploys**, poi trascina di nuovo la cartella. Per cambiare testi, foto, video e numeri, invece, non serve: lo fa il proprietario dal pannello.

## Passo 6: primo accesso del proprietario

1. Apri `karmadent.it/admin.html` ed entra con email e password.
2. Premi **Pubblica sul sito** una prima volta, per salvare i contenuti iniziali.
3. Da qui in poi il proprietario usa le schede del pannello:
   - **📥 Richieste**: tutte le richieste di preventivo, con telefono, WhatsApp e messaggio. Si segnano come "gestite".
   - **🎬 Video** e **📷 Foto**: si trascinano i file (video fino a 50 MB).
   - **✏️ Testi**, **📝 Modulo preventivi**, **📞 Numeri e sedi**.
   - Ogni modifica diventa visibile ai pazienti dopo **Pubblica sul sito**.

Consiglio: salvate `admin.html` tra i preferiti del telefono e del computer del proprietario.

---

## Domande frequenti

**Il proprietario ha dimenticato la password.**
Su Supabase apri Authentication, poi Users, poi i tre puntini accanto al suo nome, e scegli "Send password recovery" oppure cambia la password.

**Quanto costa?**
Il piano gratuito di Supabase (500 MB di database, 1 GB di file) e quello di Netlify bastano per iniziare. Se caricate molti video, conviene metterli su YouTube e usare nel pannello "Oppure link a YouTube/Instagram". Si paga solo il dominio, circa 10–15 € l'anno.

Attenzione: sul piano gratuito Supabase mette in pausa i progetti inattivi per 7 giorni. Le visite al sito di solito bastano a tenerlo attivo. Se il progetto va in pausa, si riattiva dalla dashboard di Supabase.

**Privacy (GDPR).**
Il sito salva nome, telefono ed email di chi chiede un preventivo. Prima di andare online serve una pagina **Privacy Policy** (e una Cookie Policy), da far preparare a un consulente o con un servizio come iubenda. Il link va aggiunto vicino alla casella del consenso.

**Posso provare il sito prima di configurare tutto?**
Sì. Apri `index.html` con il browser: si vede con i contenuti di esempio. Il pannello invece funziona solo dopo i passi 1–4.
