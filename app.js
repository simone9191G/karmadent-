/* Karmadent — sito pubblico e pannello di gestione */
(function(){
var MODE=window.KD_MODE||'site';
function clone(o){return JSON.parse(JSON.stringify(o))}
var S=clone(window.KD_DEFAULTS);var sb=null,session=null,requests=[],loginErr='',loginBusy=false;
var draft=null, isAdmin=false, artifactApi=null, assetsApi=null, adminOpen=false, tab='richieste', dirty=false, saving=false, menuOpen=false, sentInfo=null, featured=0;
var app=document.getElementById('app');

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function uid(){return Math.random().toString(36).slice(2,9)}
function digits(n){return String(n||'').replace(/[^\d]/g,'')}
function waNum(n){var d=digits(n);if(!d)return '';if(d.indexOf('00')===0)d=d.slice(2);if(d.length<=10)d='39'+d;return d}
function paras(t){return String(t||'').split(/\n\s*\n/).map(function(p){return '<p>'+esc(p)+'</p>'}).join('')}
var PLAY='<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z" fill="#fff"/></svg>';
var PLAYS='<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z" fill="#fff"/></svg>';
var ARR='<span class="arr"><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="3" fill="none"/></svg></span>';
var DOTS='<span class="dots"><i></i><i></i><i></i></span>';

function render(){
  if(MODE==='admin'){app.innerHTML=(session&&draft)?renderAdmin():renderLogin();return}
  app.innerHTML=renderSite(S);
  attach3D();
}
function renderLogin(){
  var body=!sb?'<p>Il pannello non è ancora collegato al database. Segui la guida (file GUIDA) ai passi 1–4 e inserisci i dati in <b>config.js</b>.</p>':
    '<form id="loginForm" style="display:grid;gap:16px"><label class="f">Email<input id="l_email" type="email" autocomplete="username" required></label>'+
    '<label class="f">Password<input id="l_pass" type="password" autocomplete="current-password" required></label>'+
    (loginErr?'<div class="err">'+esc(loginErr)+'</div>':'')+
    '<button class="btn" type="submit"'+(loginBusy?' disabled':'')+'>'+(loginBusy?'Accesso in corso…':'Entra nel pannello')+'</button></form>';
  return '<div class="login"><div class="wrap" style="display:grid;place-items:center;width:100%"><div class="login-card"><span class="brand" role="img" aria-label="Karmadent"></span><h1>Area gestione</h1><p>Accesso riservato allo staff Karmadent.</p>'+body+'</div></div></div>';
}
function fmtDate(s){try{return new Date(s).toLocaleString('it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
function renderRequests(){
  var head='<div class="help"><b>Richieste di preventivo</b>Qui trovi tutte le richieste arrivate dal modulo del sito, anche quelle in cui il paziente non ha premuto il pulsante WhatsApp. Quando hai richiamato il paziente, premi "Segna come gestita".</div>'+
    '<div><button class="btn ghost small" id="reloadReq">↻ Aggiorna elenco</button></div>';
  if(!requests.length)return head+'<p class="note" style="font-size:15px">Nessuna richiesta per ora.</p>';
  return head+'<div class="items">'+requests.map(function(r){var wa=waNum(r.telefono);
    return '<div class="req'+(r.gestita?' done':'')+'"><div class="req-top"><b>'+esc(r.nome)+'</b><time>'+fmtDate(r.created_at)+'</time></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+(r.sede?'<span class="chip">'+esc(r.sede)+'</span>':'')+(r.trattamento?'<span class="chip">'+esc(r.trattamento)+'</span>':'')+(r.gestita?'<span class="chip" style="background:transparent">✓ Gestita</span>':'')+'</div>'+
    '<div class="req-line">📞 <a href="tel:'+esc(r.telefono)+'">'+esc(r.telefono)+'</a>'+(wa?' · <a href="https://wa.me/'+wa+'" target="_blank" rel="noopener">Scrivi su WhatsApp</a>':'')+'</div>'+
    (r.email?'<div class="req-line">✉️ <a href="mailto:'+esc(r.email)+'">'+esc(r.email)+'</a></div>':'')+
    (r.messaggio?'<div class="req-msg">'+esc(r.messaggio)+'</div>':'')+
    '<div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small'+(r.gestita?' ghost':'')+'" data-rdone="'+r.id+'">'+(r.gestita?'Riapri':'✓ Segna come gestita')+'</button><button class="btn danger small" data-rdel="'+r.id+'" data-armed="0">Elimina</button></div></div>'}).join('')+'</div>';
}

function playerHtml(v){
  if(!v)return '<div class="ph-video"><div class="center"><span class="playbtn">'+PLAY+'</span><span>Nessun video</span></div></div>';
  if(v.src)return '<video controls playsinline preload="metadata" src="'+esc(v.src)+'"></video>';
  var inner='<div class="center">'+(v.link?'<a class="playbtn" href="'+esc(v.link)+'" target="_blank" rel="noopener" aria-label="Guarda il video">'+PLAY+'</a><span>Guarda il video</span>':'<span class="playbtn">'+PLAY+'</span>')+'</div>';
  return '<div class="ph-video">'+inner+'</div>'+(v.link?'':'<span class="badge">Esempio</span>')+'<div class="player-cap"><h3>'+esc(v.title)+'</h3>'+(v.text?'<p>'+esc(v.text)+'</p>':'')+'</div>';
}

function renderSite(s){
  if(featured>=s.videos.length)featured=0;
  var fv=s.videos[featured];
  var pl=s.videos.map(function(v,i){
    return '<button class="pl-item" data-feat="'+i+'" aria-current="'+(i===featured)+'"><span class="pl-thumb">'+(v.src?'<video src="'+esc(v.src)+'#t=1" muted preload="metadata"></video>':'')+PLAYS+'</span><span><b>'+esc(v.title)+'</b>'+(v.text?'<small>'+esc(v.text)+'</small>':'')+'</span></button>';
  }).join('');
  var photos=s.photos.map(function(p){
    return '<figure>'+(p.src?'<img src="'+esc(p.src)+'" alt="'+esc(p.caption)+'" loading="lazy">':'<div class="ph"><i></i></div>')+(p.caption?'<figcaption>'+esc(p.caption)+'</figcaption>':'')+'</figure>';
  }).join('');
  var mq=(s.marquee||[]).filter(Boolean).map(function(x){return '<span>'+esc(x)+'</span>'}).join('');
  var f=s.form;
  var sedi=s.sedi.map(function(x,i){return '<label><input type="radio" name="sede" value="'+esc(x.id)+'"'+(i===0?' checked':'')+'> '+esc(x.city)+'</label>'}).join('');
  var formBody;
  if(sentInfo){
    formBody='<div class="sent" role="status"><span class="tick"><svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10" stroke="#fff" stroke-width="3" fill="none"/></svg></span><strong>'+esc(f.thanks)+'</strong>'+
      (sentInfo.wa?'<span style="color:var(--muted)">Ultimo passo: tocca il pulsante per inviare la richiesta su WhatsApp alla sede di '+esc(sentInfo.city)+'.</span><a class="btn" href="'+esc(sentInfo.wa)+'" target="_blank" rel="noopener">Invia su WhatsApp '+ARR+'</a>':'')+
      (sentInfo.phone?'<span style="color:var(--muted)">Oppure chiamaci: <b style="color:var(--ink);user-select:all">'+esc(sentInfo.phone)+'</b></span>':'')+
      '<button type="button" class="btn ghost small" id="newReq">Nuova richiesta</button></div>';
  }else{
    formBody=
      '<div><div class="lbl">Sede preferita</div><div class="sedi-pick">'+sedi+'</div></div>'+
      '<div class="row2"><label class="f">Nome e cognome *<input id="q_name" name="name" required autocomplete="name" placeholder="Mario Rossi"></label>'+
      '<label class="f">Telefono *<input id="q_phone" name="phone" type="tel" required autocomplete="tel" placeholder="333 123 4567"></label></div>'+
      (f.showEmail?'<label class="f">Email'+(f.requireEmail?' *':'')+'<input id="q_email" name="email" type="email"'+(f.requireEmail?' required':'')+' autocomplete="email" placeholder="nome@email.it"></label>':'')+
      (f.showTreatment?'<label class="f">Trattamento di interesse<select id="q_tr" name="tr">'+f.treatments.map(function(t){return '<option>'+esc(t)+'</option>'}).join('')+'</select></label>':'')+
      (f.showMessage?'<label class="f">Messaggio<textarea id="q_msg" name="msg" placeholder="Raccontaci brevemente di cosa hai bisogno"></textarea></label>':'')+
      '<label class="chk"><input type="checkbox" id="q_priv" required> <span>'+esc(f.privacy)+'</span></label>'+
      '<div class="err" id="q_err" hidden></div>'+
      '<button class="btn" type="submit" style="justify-self:start">Richiedi il preventivo '+ARR+'</button>';
  }
  var contacts=s.sedi.map(function(x){return '<div class="contact"><div><b>'+esc(x.city)+'</b><br><span>'+esc(x.address)+'</span></div>'+(x.phone?'<span class="num">'+esc(x.phone)+'</span>':'<span>'+esc(x.hours)+'</span>')+'</div>'}).join('');
  var foot=s.sedi.map(function(x){return '<div><h3>'+esc(x.city)+'</h3><p>'+esc(x.address)+'</p><p>'+esc(x.hours)+'</p>'+(x.phone?'<p>Tel. <span style="user-select:all;color:var(--ink)">'+esc(x.phone)+'</span></p>':'')+'</div>'}).join('');
  var ddSedi=s.sedi.map(function(x){return '<div class="dd-sede"><h3>'+esc(x.city)+'</h3><p>'+esc(x.address)+' · '+esc(x.hours)+'</p>'+(x.phone?'<p style="color:var(--ink);user-select:all">'+esc(x.phone)+'</p>':'')+'</div>'}).join('');
  return ''+
  '<header class="bar"><div class="wrap"><a class="brand" href="#top" aria-label="'+esc(s.brand)+' — Igiene dentale professionale"></a>'+
  '<div class="bar-r"><a class="btn cta" href="#preventivo">Preventivo gratuito</a><button class="menu-btn" id="menuBtn" aria-expanded="'+menuOpen+'" aria-controls="dd"><span class="burger"><i></i><i></i><i></i></span>Menu</button></div></div>'+
  '<div class="dropdown" id="dd"'+(menuOpen?'':' hidden')+'><div class="wrap"><nav class="dd-links">'+
    '<a href="#video"><span class="txt"><b>Video</b> pazienti</span><span>→</span></a><a href="#chi-siamo"><span class="txt"><b>Chi</b> siamo</span><span>→</span></a><a href="#preventivo"><span class="txt"><b>Preventivo</b> gratuito</span><span>→</span></a><a href="#sedi"><span class="txt"><b>Sedi</b> e orari</span><span>→</span></a>'+
  '</nav><div class="dd-side"><div class="eyebrow">'+DOTS+'Le nostre sedi</div>'+ddSedi+'</div></div></div></header>'+
  '<main id="top">'+
  '<section class="hero3d" id="hero3d"><div class="pin"><div class="wrap hero-grid">'+
    '<div class="hero-copy"><div class="eyebrow">'+DOTS+'Igiene dentale professionale</div><h1>'+esc(s.heroThin)+'<br><b>'+esc(s.heroBold)+'</b></h1><p>'+esc(s.heroText)+'</p>'+
    '<ul class="phases" id="phases"><li>Placca rimossa</li><li>Tartaro via</li><li>Macchie via</li><li>Lucidatura</li></ul>'+
    '<div class="hero-actions"><a class="btn" href="#preventivo">Preventivo gratuito '+ARR+'</a><a class="btn ghost" href="#video">Guarda i video</a></div>'+
    '<div class="scroll-hint"><span class="mouse"></span><span id="hintTxt">Scorri per pulire il dente</span></div></div>'+
    '<div class="tooth-slot" id="toothSlot"><div class="bgword" aria-hidden="true">KARMA<b>DENT</b></div><div class="ring" aria-hidden="true"></div><div class="fallback"></div><div class="hud"><small>Placca rimossa</small><b><span id="hudPct">0</span>%</b><div class="bar"><i id="hudBar"></i></div></div></div>'+
  '</div></div></section>'+
  '<div class="solid">'+
  '<section class="videos" id="video"><div class="wrap"><div class="eyebrow">'+DOTS+'Video dei pazienti</div><h2>'+esc(s.videoThin||'Le storie dei')+' <b>'+esc(s.videoBold||'nostri pazienti')+'</b></h2><p class="lead">Guarda come lavoriamo e cosa raccontano le persone che si sono affidate a noi a Cagliari e a Olbia.</p>'+
  '<div class="theatre"><div class="player" id="player">'+playerHtml(fv)+'</div><div class="playlist" role="list">'+pl+'</div></div></div></section>'+
  (mq?'<div class="marquee" aria-hidden="true"><div class="track">'+mq+mq+'</div></div>':'')+
  '<section class="about" id="chi-siamo"><div class="wrap"><div><div class="eyebrow">'+DOTS+'Chi siamo</div><h2>'+esc(s.aboutThin)+' <b>'+esc(s.aboutBold)+'</b></h2>'+paras(s.aboutText)+
  '<div class="facts">'+s.facts.filter(Boolean).map(function(x){return '<div>'+esc(x)+'</div>'}).join('')+'</div></div><div class="mosaic">'+photos+'</div></div></section>'+
  '<section class="quote" id="preventivo"><div class="wrap"><aside><div class="eyebrow">'+DOTS+'Preventivi</div><h2>'+esc(f.thin)+' <b>'+esc(f.bold)+'</b></h2><p>'+esc(f.text)+'</p><div class="contacts">'+contacts+'</div></aside><form class="qf" id="qform" novalidate>'+formBody+'</form></div></section></div></main>'+
  '<footer id="sedi"><div class="wrap top"><div><span class="brand" role="img" aria-label="'+esc(s.brand)+'"></span><p style="margin-top:14px">Igiene dentale professionale in Sardegna.</p></div>'+foot+'</div><div class="wrap legal">© '+new Date().getFullYear()+' '+esc(s.brand)+' · Cagliari · Olbia</div></footer>';
}

/* ---------- ADMIN ---------- */
var TABS=[['richieste','📥 Richieste'],['video','🎬 Video'],['foto','📷 Foto'],['testi','✏️ Testi'],['modulo','📝 Modulo preventivi'],['numeri','📞 Numeri e sedi']];
function fid(key){return 'a_'+key.replace(/\W/g,'_')}
function field(label,key,val,type,hint){
  var inp=type==='area'?'<textarea data-k="'+key+'" id="'+fid(key)+'">'+esc(val)+'</textarea>':'<input data-k="'+key+'" id="'+fid(key)+'" value="'+esc(val)+'"'+(type?' type="'+type+'"':'')+'>';
  return '<label class="f">'+label+inp+(hint?'<span class="note">'+hint+'</span>':'')+'</label>';
}
function listEditor(title,path,arr,addLabel){
  return '<div><div class="lbl" style="color:#d8d8db">'+title+'</div><div class="items">'+arr.map(function(x,i){return '<div class="opt"><input data-k="'+path+'.'+i+'" id="'+fid(path+'.'+i)+'" value="'+esc(x)+'">'+delBtn(path,i)+'</div>'}).join('')+'</div></div>'+
  '<button class="btn ghost" data-addtext="'+path+'">＋ '+addLabel+'</button>';
}
function renderAdmin(){
  var d=draft, body='';
  if(tab==='richieste'){body=renderRequests();
  }else if(tab==='video'){
    body='<div class="help"><b>Come aggiungere un video</b>Trascina un file video nel riquadro qui sotto, oppure toccalo per sceglierlo dal computer o dal telefono (massimo 50 MB). Il primo video della lista è quello grande in cima al sito.</div>'+
    '<div class="drop" data-drop="video" tabindex="0" role="button"><strong>＋ Aggiungi video</strong><span>MP4 o MOV, fino a 50 MB</span></div>'+
    '<div class="items">'+d.videos.map(function(v,i){return '<div class="item"><div class="thumb">'+(v.src?'<video src="'+esc(v.src)+'" muted preload="metadata"></video>':'<div class="ph-s">'+(v.link?'Link':'Esempio')+'</div>')+'</div><div class="fields">'+
      field('Titolo','videos.'+i+'.title',v.title)+field('Descrizione breve','videos.'+i+'.text',v.text)+
      field('Oppure link a YouTube/Instagram (facoltativo)','videos.'+i+'.link',v.link||'','url')+
      '<div class="acts"><button class="btn ghost small" data-move="videos,'+i+',-1"'+(i===0?' disabled':'')+'>↑ Su</button><button class="btn ghost small" data-move="videos,'+i+',1"'+(i===d.videos.length-1?' disabled':'')+'>↓ Giù</button>'+delBtn('videos',i)+'</div></div></div>'}).join('')+'</div>'+
    '<button class="btn ghost" data-addempty="videos">＋ Aggiungi video solo con link</button>';
  }else if(tab==='foto'){
    body='<div class="help"><b>Come aggiungere una foto</b>Trascina una o più foto nel riquadro, oppure toccalo per sceglierle. Le foto appaiono nella sezione "Chi siamo", nell\'ordine della lista.</div>'+
    '<div class="drop" data-drop="image" tabindex="0" role="button"><strong>＋ Aggiungi foto</strong><span>JPG o PNG, puoi sceglierne più di una</span></div>'+
    '<div class="items">'+d.photos.map(function(p,i){return '<div class="item"><div class="thumb">'+(p.src?'<img src="'+esc(p.src)+'" alt="">':'<div class="ph-s">Esempio</div>')+'</div><div class="fields">'+
      field('Didascalia (facoltativa)','photos.'+i+'.caption',p.caption)+
      '<div class="acts"><button class="btn ghost small" data-move="photos,'+i+',-1"'+(i===0?' disabled':'')+'>↑ Su</button><button class="btn ghost small" data-move="photos,'+i+',1"'+(i===d.photos.length-1?' disabled':'')+'>↓ Giù</button>'+delBtn('photos',i)+'</div></div></div>'}).join('')+'</div>';
  }else if(tab==='testi'){
    body='<div class="help"><b>I titoli hanno due parti</b>La prima è scritta sottile, la seconda in grassetto arancione, come nel logo.</div>'+
    '<div class="row2">'+field('Titolo in cima · parte sottile','heroThin',d.heroThin)+field('Titolo in cima · parte arancione','heroBold',d.heroBold)+'</div>'+
    field('Frase sotto il titolo','heroText',d.heroText)+
    '<div class="row2">'+field('Titolo sezione video · sottile','videoThin',d.videoThin||'Le storie dei')+field('Titolo sezione video · arancione','videoBold',d.videoBold||'nostri pazienti')+'</div>'+
    listEditor('Scritte della fascia arancione che scorre','marquee',d.marquee,'Aggiungi scritta')+
    '<div class="row2">'+field('Titolo "Chi siamo" · sottile','aboutThin',d.aboutThin)+field('Titolo "Chi siamo" · arancione','aboutBold',d.aboutBold)+'</div>'+
    field('Testo "Chi siamo"','aboutText',d.aboutText,'area','Lascia una riga vuota per iniziare un nuovo paragrafo.')+
    listEditor('Punti di forza','facts',d.facts,'Aggiungi punto di forza');
  }else if(tab==='modulo'){
    var f=d.form;
    body='<div class="help"><b>Il modulo dei preventivi</b>Qui scegli cosa chiedere ai pazienti. Nome, telefono e sede sono sempre presenti.</div>'+
    '<div class="row2">'+field('Titolo · sottile','form.thin',f.thin)+field('Titolo · arancione','form.bold',f.bold)+'</div>'+field('Frase sotto il titolo','form.text',f.text)+
    listEditor('Trattamenti che il paziente può scegliere','form.treatments',f.treatments,'Aggiungi trattamento')+
    sw('Mostra il campo Email','form.showEmail',f.showEmail)+sw('Email obbligatoria','form.requireEmail',f.requireEmail)+
    sw('Mostra la scelta del trattamento','form.showTreatment',f.showTreatment)+sw('Mostra il campo Messaggio','form.showMessage',f.showMessage)+
    field('Testo privacy','form.privacy',f.privacy,'area')+field('Messaggio dopo l\'invio','form.thanks',f.thanks);
  }else{
    body='<div class="help"><b>Dove arrivano le richieste</b>Quando un paziente compila il modulo, gli compare un pulsante che apre WhatsApp con il suo messaggio già scritto, indirizzato al numero della sede che ha scelto. Scrivi il numero con il prefisso, ad esempio <b>+39 333 1234567</b>.</div>'+
    d.sedi.map(function(x,i){return '<div class="item" style="grid-template-columns:1fr"><div class="fields"><h3 style="font-size:20px">Sede di '+esc(x.city)+'</h3>'+
      field('Numero WhatsApp che riceve le richieste','sedi.'+i+'.whatsapp',x.whatsapp,'tel',x.whatsapp?'<a href="https://wa.me/'+waNum(x.whatsapp)+'" target="_blank" rel="noopener">Prova questo numero su WhatsApp</a>':'Finché è vuoto, il paziente vedrà solo il numero di telefono.')+
      field('Telefono da mostrare sul sito','sedi.'+i+'.phone',x.phone,'tel')+field('Indirizzo','sedi.'+i+'.address',x.address)+field('Orari','sedi.'+i+'.hours',x.hours)+'</div></div>'}).join('');
  }
  return '<div class="sheet" role="dialog" aria-label="Area gestione"><div class="sheet-top"><div class="wrap"><h2><i></i>Area gestione</h2><span style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn ghost small" href="index.html" target="_blank" rel="noopener">👁 Vedi il sito</a><button class="btn ghost small" id="logout">Esci</button></span></div>'+
  '<div class="wrap"><div class="tabs" role="tablist">'+TABS.map(function(t){var n=t[0]==='richieste'?requests.filter(function(r){return !r.gestita}).length:0;return '<button role="tab" data-tab="'+t[0]+'" aria-selected="'+(tab===t[0])+'">'+t[1]+(n?'<span class="count">'+n+'</span>':'')+'</button>'}).join('')+'</div></div></div>'+
  '<div class="wrap"><div class="panel">'+body+'</div></div>'+
  '<input type="file" id="filePick" hidden multiple>'+
  '<div class="savebar"><div class="wrap"><span class="st'+(dirty?' dirty':'')+'" id="saveSt">'+(saving?'Pubblicazione in corso…':dirty?'● Modifiche non ancora pubblicate':'✓ Tutto pubblicato')+'</span><span style="display:flex;gap:8px;flex-wrap:wrap">'+
  '<button class="btn ghost" id="discard"'+(dirty?'':' hidden')+'>Annulla modifiche</button><button class="btn" id="publish"'+(!dirty||saving?' disabled':'')+'>Pubblica sul sito</button></span></div></div></div>';
}
function delBtn(list,i){return '<button class="btn danger small" data-del="'+list+','+i+'" data-armed="0">Elimina</button>'}
function sw(label,key,val){return '<label class="switch">'+label+'<input type="checkbox" data-k="'+key+'" id="'+fid(key)+'"'+(val?' checked':'')+'></label>'}

function setVal(path,v){var ks=path.split('.'),last=ks.pop(),o=draft;ks.forEach(function(k){o=o[k]});o[last]=v;markDirty()}
function listAt(path){return path.split('.').reduce(function(a,k){return a[k]},draft)}
function markDirty(){dirty=true;var st=document.getElementById('saveSt');if(st){st.textContent='● Modifiche non ancora pubblicate';st.className='st dirty'}var pb=document.getElementById('publish');if(pb)pb.disabled=false;var dc=document.getElementById('discard');if(dc)dc.hidden=false}
function refreshAdmin(){var y=document.querySelector('.sheet');var sc=y?y.scrollTop:0;var s0=S;S=draft;render();S=s0;var y2=document.querySelector('.sheet');if(y2)y2.scrollTop=sc}

/* events */
document.addEventListener('click',function(e){
  var t=e.target.closest('button,a,.drop');
  if(!t){if(menuOpen&&!e.target.closest('.dropdown')){menuOpen=false;render()}return}
  if(t.id==='menuBtn'){menuOpen=!menuOpen;render();return}
  if(t.closest('.dropdown')){menuOpen=false;setTimeout(render,0);return}
  if(t.dataset.feat!=null){featured=+t.dataset.feat;var p=document.getElementById('player');if(p)p.innerHTML=playerHtml(S.videos[featured]);document.querySelectorAll('.pl-item').forEach(function(b,i){b.setAttribute('aria-current',String(i===featured))});return}
  if(t.id==='newReq'){sentInfo=null;render();return}
  if(t.id==='logout'){if(dirty&&t.dataset.armed!=='1'){t.dataset.armed='1';t.textContent='Hai modifiche non salvate: tocca ancora per uscire';return}sb.auth.signOut();session=null;draft=null;dirty=false;render();return}
  if(t.id==='reloadReq'){loadRequests().then(refreshAdmin);return}
  if(t.dataset.rdone){var rq=requests.filter(function(r){return String(r.id)===t.dataset.rdone})[0];if(!rq)return;var nv=!rq.gestita;sb.from('richieste').update({gestita:nv}).eq('id',rq.id).then(function(res){if(res.error){toast('Non riuscito: '+res.error.message,true);return}rq.gestita=nv;refreshAdmin()});return}
  if(t.dataset.rdel){if(t.dataset.armed!=='1'){t.dataset.armed='1';t.textContent='Tocca ancora per confermare';setTimeout(function(){if(t.isConnected){t.dataset.armed='0';t.textContent='Elimina'}},4000);return}
    var rid=t.dataset.rdel;sb.from('richieste').delete().eq('id',rid).then(function(res){if(res.error){toast('Non riuscito: '+res.error.message,true);return}requests=requests.filter(function(r){return String(r.id)!==rid});refreshAdmin()});return}
  if(t.id==='openAdmin'){draft=JSON.parse(JSON.stringify(S));dirty=false;adminOpen=true;refreshAdmin();return}
  if(t.id==='closeAdmin'){adminOpen=false;render();return}
  if(t.dataset.tab){tab=t.dataset.tab;refreshAdmin();var sh=document.querySelector('.sheet');if(sh)sh.scrollTop=0;return}
  if(t.id==='discard'){draft=JSON.parse(JSON.stringify(S));dirty=false;refreshAdmin();return}
  if(t.id==='publish'){doPublish();return}
  if(t.dataset.drop){var fp=document.getElementById('filePick');fp.accept=t.dataset.drop==='video'?'video/*':'image/*';fp.multiple=t.dataset.drop==='image';fp.dataset.kind=t.dataset.drop;fp.click();return}
  if(t.dataset.move){var m=t.dataset.move.split(','),L=listAt(m[0]),i=+m[1],j=i+(+m[2]);var x=L[i];L[i]=L[j];L[j]=x;dirty=true;refreshAdmin();return}
  if(t.dataset.del){
    if(t.dataset.armed!=='1'){t.dataset.armed='1';t.textContent='Tocca ancora per confermare';setTimeout(function(){if(t.isConnected){t.dataset.armed='0';t.textContent='Elimina'}},4000);return}
    var d2=t.dataset.del.split(',');listAt(d2[0]).splice(+d2[1],1);dirty=true;refreshAdmin();return}
  if(t.dataset.addtext){listAt(t.dataset.addtext).push('');dirty=true;refreshAdmin();var ins=document.querySelectorAll('input[data-k^="'+t.dataset.addtext+'."]');if(ins.length)ins[ins.length-1].focus();return}
  if(t.dataset.addempty){draft.videos.push({id:uid(),title:'Nuovo video',text:'',src:'',link:''});dirty=true;refreshAdmin();return}
});
document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('drop')){e.preventDefault();e.target.click()}if(e.key==='Escape'&&menuOpen){menuOpen=false;render()}});
document.addEventListener('input',function(e){var k=e.target.dataset&&e.target.dataset.k;if(!k||!draft)return;setVal(k,e.target.type==='checkbox'?e.target.checked:e.target.value)});
document.addEventListener('change',function(e){
  if(e.target.id==='filePick'){handleFiles(e.target.files,e.target.dataset.kind);e.target.value='';return}
  var k=e.target.dataset&&e.target.dataset.k;if(k&&draft&&e.target.type==='checkbox'){setVal(k,e.target.checked)}
});
['dragover','dragleave','drop'].forEach(function(ev){document.addEventListener(ev,function(e){var d=e.target.closest&&e.target.closest('.drop');if(!d)return;e.preventDefault();d.classList.toggle('over',ev==='dragover');if(ev==='drop')handleFiles(e.dataTransfer.files,d.dataset.drop)})});

function toast(msg,bad){var st=document.getElementById('saveSt');if(st){st.textContent=msg;st.className='st'+(bad?' dirty':'')}}
async function handleFiles(files,kind){
  if(!files||!files.length)return;
  if(!sb||!session){toast('Sessione scaduta: esci e rientra.',true);return}
  for(var i=0;i<files.length;i++){
    var f=files[i];
    if(kind==='video'&&!/^video\//.test(f.type)){toast('"'+f.name+'" non è un video.',true);continue}
    if(kind==='image'&&!/^image\//.test(f.type)){toast('"'+f.name+'" non è una foto.',true);continue}
    if(f.size>50*1024*1024){toast('"'+f.name+'" è più grande di 50 MB: comprimilo e riprova.',true);continue}
    toast('Caricamento di "'+f.name+'"…');
    try{
      var path=(kind==='video'?'video/':'foto/')+Date.now()+'-'+f.name.replace(/[^\w.-]+/g,'_');
      var up=await sb.storage.from('media').upload(path,f,{contentType:f.type,upsert:false});if(up.error)throw up.error;
      var src=sb.storage.from('media').getPublicUrl(path).data.publicUrl;var r={id:path};
      var name=f.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
      if(kind==='video'){draft.videos.unshift({id:r.id,title:name,text:'',src:src,link:''})}
      else{draft.photos.push({id:r.id,caption:'',src:src})}
      dirty=true;refreshAdmin();toast('Caricato. Ricorda di premere "Pubblica sul sito".',true);
    }catch(err){toast('Caricamento non riuscito ('+(err&&err.message||'errore')+'). Riprova.',true)}
  }
}
async function doPublish(){
  if(!sb||!session){toast('Sessione scaduta: esci e rientra.',true);return}
  ['facts','marquee'].forEach(function(k){draft[k]=(draft[k]||[]).filter(function(x){return x.trim()})});
  draft.form.treatments=draft.form.treatments.filter(function(x){return x.trim()});
  saving=true;refreshAdmin();
  var res=await sb.from('site_content').upsert({id:1,data:draft,updated_at:new Date().toISOString()});
  saving=false;
  if(res.error){refreshAdmin();toast('Salvataggio non riuscito: '+res.error.message,true);return}
  S=clone(draft);dirty=false;refreshAdmin();toast('✓ Pubblicato: il sito è aggiornato');
}
async function loadContent(){
  if(!sb)return;
  try{var r=await sb.from('site_content').select('data').eq('id',1).maybeSingle();if(r.data&&r.data.data){S=Object.assign(clone(window.KD_DEFAULTS),r.data.data)}}catch(e){}
}
async function loadRequests(){
  if(!sb||!session)return;
  var r=await sb.from('richieste').select('*').order('created_at',{ascending:false}).limit(300);
  if(!r.error)requests=r.data||[];
}

/* quote form */
document.addEventListener('submit',function(e){
  if(e.target.id==='loginForm'){e.preventDefault();var em=document.getElementById('l_email').value.trim(),pw=document.getElementById('l_pass').value;loginBusy=true;loginErr='';render();
    sb.auth.signInWithPassword({email:em,password:pw}).then(async function(res){loginBusy=false;
      if(res.error){loginErr='Email o password non corretti.';render();var le=document.getElementById('l_email');if(le)le.value=em;return}
      session=res.data.session;await loadContent();draft=clone(S);await loadRequests();render()});return}
  if(e.target.id!=='qform')return;e.preventDefault();
  var g=function(id){var el=document.getElementById(id);return el?el.value.trim():''};
  var errEl=document.getElementById('q_err');
  var name=g('q_name'),phone=g('q_phone'),email=g('q_email'),tr=g('q_tr'),msg=g('q_msg');
  var sedeId=(document.querySelector('input[name=sede]:checked')||{}).value;
  var problems=[];
  if(!name)problems.push('il nome');
  if(digits(phone).length<6)problems.push('un numero di telefono valido');
  if(S.form.showEmail&&S.form.requireEmail&&!/^\S+@\S+\.\S+$/.test(email))problems.push('un\'email valida');
  if(!document.getElementById('q_priv').checked)problems.push('il consenso privacy');
  if(problems.length){errEl.hidden=false;errEl.textContent='Manca '+problems.join(', ')+'.';return}
  var sede=S.sedi.filter(function(x){return x.id===sedeId})[0]||S.sedi[0];
  var text='Richiesta preventivo dal sito Karmadent\nSede: '+sede.city+'\nNome: '+name+'\nTelefono: '+phone+(email?'\nEmail: '+email:'')+(tr?'\nTrattamento: '+tr:'')+(msg?'\nMessaggio: '+msg:'');
  var n=waNum(sede.whatsapp);
  sentInfo={city:sede.city,phone:sede.phone,wa:n?'https://wa.me/'+n+'?text='+encodeURIComponent(text):''};
  if(sb){sb.from('richieste').insert({sede:sede.city,nome:name,telefono:phone,email:email||null,trattamento:tr||null,messaggio:msg||null}).then(function(){},function(){})}
  render();var q=document.getElementById('preventivo');if(q)q.scrollIntoView({block:'start'});
});

/* ---------- 3D TOOTH ---------- */
var T3={target:0,cl:0,mx:0,my:0,canvas:null,ro:null,resize:null,lastPct:-1,lastPh:-1};
function attach3D(){
  var slot=document.getElementById('toothSlot');if(!slot)return;
  T3.lastPct=-1;T3.lastPh=-1;
  if(T3.canvas){slot.insertBefore(T3.canvas,slot.firstChild);slot.classList.add('has3d')}
  if(T3.ro){T3.ro.disconnect()}
  if(window.ResizeObserver&&T3.resize){T3.ro=new ResizeObserver(T3.resize);T3.ro.observe(slot)}
  onHeroScroll();
}
function onHeroScroll(){
  var h=document.getElementById('hero3d');if(!h)return;
  var r=h.getBoundingClientRect();
  var t=Math.min(1,Math.max(0,-r.top/200));
  T3.target=t; // scroll down cleans, scroll up dirties again
  T3.visible=r.bottom>0;
}
function setup3D(){
  addEventListener('scroll',onHeroScroll,{passive:true});addEventListener('resize',onHeroScroll);
  addEventListener('pointermove',function(e){T3.mx=e.clientX/innerWidth*2-1;T3.my=e.clientY/innerHeight*2-1},{passive:true});
  var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  s.onload=function(){try{initTooth()}catch(e){console.warn(e)}};document.head.appendChild(s);
}
function initTooth(){
  var THREE=window.THREE;if(!THREE)return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  var scene=new THREE.Scene();
  var cam=new THREE.PerspectiveCamera(30,1,0.1,100);cam.position.set(0,0.15,9.2);
  T3.canvas=renderer.domElement;
  T3.resize=function(){var sl=document.getElementById('toothSlot');if(!sl)return;var w=sl.clientWidth,h=sl.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;
    var fitH=4.9, fitW=3.0; var dH=fitH/2/Math.tan(cam.fov*Math.PI/360), dW=fitW/2/Math.tan(cam.fov*Math.PI/360)/cam.aspect; T3.camZ=Math.max(dH,dW);cam.position.z=T3.camZ;cam.updateProjectionMatrix()};
  attach3D();T3.resize();

  // studio light environment
  var pm=new THREE.PMREMGenerator(renderer),es=new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(30,32,16),new THREE.MeshBasicMaterial({color:0x0c0c0d,side:THREE.BackSide})));
  function panel(c,x,y,z,w,h,int){var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(int||1),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m)}
  panel(0xffffff,-2,14,6,16,5,1.6);panel(0xffffff,-13,3,7,5,14,1.1);panel(0xfff4ea,12,4,8,4,10,0.7);panel(0xff6a3d,10,-1,-10,8,12,1.2);panel(0x9aa8b8,0,-12,8,16,4,0.5);
  scene.environment=pm.fromScene(es,0.035).texture;
  var key=new THREE.DirectionalLight(0xfff6ee,1.25);key.position.set(-4,6,6);scene.add(key);
  var rim=new THREE.DirectionalLight(0xff6a3d,1.9);rim.position.set(5,2,-6);scene.add(rim);
  var fill=new THREE.DirectionalLight(0xc9d8ff,0.35);fill.position.set(5,-2,5);scene.add(fill);

  // ---- geometry: anatomical upper molar ----
  function lathe(profile,seg){var g=new THREE.LatheGeometry(profile,seg);return g}
  function smoothProfile(pts,n){var c=new THREE.SplineCurve(pts.map(function(p){return new THREE.Vector2(p[0],p[1])}));return c.getPoints(n)}
  function seamFix(g,seg,np){g.computeVertexNormals();var n=g.attributes.normal;for(var j=0;j<np;j++){var a=j,b=seg*np+j;var x=(n.getX(a)+n.getX(b))/2,y=(n.getY(a)+n.getY(b))/2,z=(n.getZ(a)+n.getZ(b))/2,l=Math.hypot(x,y,z)||1;n.setXYZ(a,x/l,y/l,z/l);n.setXYZ(b,x/l,y/l,z/l)}}
  var SEG=160;
  var crownProf=smoothProfile([[0.001,0.40],[0.14,0.42],[0.30,0.50],[0.46,0.60],[0.60,0.60],[0.72,0.50],[0.80,0.34],[0.85,0.12],[0.855,-0.05],[0.82,-0.22],[0.74,-0.40],[0.66,-0.53],[0.62,-0.62],[0.60,-0.80],[0.57,-0.98],[0.50,-1.12],[0.30,-1.20],[0.001,-1.22]],150);
  crownProf.reverse();
  var cg=lathe(crownProf,SEG),pa=cg.attributes.position,v=new THREE.Vector3();
  var cusps=[[0.40,0.36,0.11],[-0.40,0.34,0.09],[0.38,-0.36,0.12],[-0.36,-0.38,0.06]];
  function g2(x,z,cx,cz,s){var dx=x-cx,dz=z-cz;return Math.exp(-(dx*dx+dz*dz)/s)}
  for(var i=0;i<pa.count;i++){
    v.fromBufferAttribute(pa,i);var th=Math.atan2(v.z,v.x),r=Math.hypot(v.x,v.z);
    var sq=1+0.045*Math.cos(4*th-0.2)+0.02*Math.cos(2*th);
    var x=v.x*sq*1.08,z=v.z*sq*0.94,y=v.y;
    var occ=THREE.MathUtils.smoothstep(y,0.25,0.5);
    if(occ>0){
      var b=0;cusps.forEach(function(c){b+=c[2]*g2(x,z,c[0],c[1],0.075)});
      var groove=0.07*Math.exp(-x*x/0.006)*Math.exp(-z*z/0.35)+0.06*Math.exp(-z*z/0.005)*Math.exp(-x*x/0.25)+0.05*Math.exp(-Math.pow(z+x*0.25,2)/0.004)*(x>0?1:0)*Math.exp(-x*x/0.3);
      var oblique=-0.03*Math.exp(-Math.pow(x+z+0.05,2)/0.02)*Math.exp(-(x*x+z*z)/0.3);
      y+=occ*(b-groove-oblique)*(0.4+0.6*Math.min(1,r/0.35));
    }
    // slight buccal bulge (cervical ridge)
    var bulge=0.03*Math.exp(-Math.pow((y+0.25)/0.18,2))*Math.max(0,Math.sin(th));
    x*=1+bulge;z*=1+bulge*1.5;
    pa.setXYZ(i,x,y,z);
  }
  seamFix(cg,SEG,crownProf.length);
  var rootDefs=[ // offset x,z ; length ; curve dir x,z ; flatten
    [0.23,0.17,1.95,-0.10,0.10,0.78],
    [-0.24,0.17,1.8,0.10,0.12,0.78],
    [0.01,-0.24,2.15,0.02,-0.26,0.9]];
  var rootGeoms=rootDefs.map(function(d){
    var L=d[2],prof=[];for(var u=0;u<=40;u++){var t=u/40,w=0.27*Math.pow(1-t,0.75)*(1+0.06*Math.sin(t*6))+0.0;if(t>0.94){w*=Math.sqrt(Math.max(0,(1-t)/0.06))}prof.push(new THREE.Vector2(Math.max(0.0005,w),-t*L))}
    prof.reverse();
    var g=lathe(prof,64),a=g.attributes.position;
    for(var j=0;j<a.count;j++){var yy=a.getY(j),t=-yy/L,xx=a.getX(j),zz=a.getZ(j);
      // flatten cross-section, add longitudinal groove and curvature
      var ang=Math.atan2(zz,xx),rr=Math.hypot(xx,zz)*(1-0.06*Math.pow(Math.cos(ang*2),8));
      xx=Math.cos(ang)*rr*d[5];zz=Math.sin(ang)*rr;
      xx+=d[3]*t*t*1.6+d[0]*t*0.35;zz+=d[4]*t*t*1.4+d[1]*t*0.3;
      a.setXYZ(j,xx,yy,zz)}
    seamFix(g,64,prof.length);g.translate(d[0],-0.92,d[1]);return g});

  var U={uLine:{value:1.0},uGlow:{value:0},uTime:{value:0},uShine:{value:-1}};
  var bumpTex=new THREE.DataTexture(new Uint8Array([128,128,128,255]),1,1,THREE.RGBAFormat);bumpTex.needsUpdate=true;
  var mat=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0.3,metalness:0,clearcoat:0.8,clearcoatRoughness:0.18,bumpMap:bumpTex,bumpScale:0.0001,reflectivity:0.45});
  mat.onBeforeCompile=function(sh){
    sh.uniforms.uLine=U.uLine;sh.uniforms.uGlow=U.uGlow;sh.uniforms.uTime=U.uTime;sh.uniforms.uShine=U.uShine;
    sh.vertexShader='varying vec3 vLoc;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLoc=position;');
    var head='uniform float uLine;uniform float uGlow;uniform float uTime;uniform float uShine;varying vec3 vLoc;\n'+
    'float h3(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}\n'+
    'float n3(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}\n'+
    'float fb(vec3 p){float v=0.;float a=.5;for(int i=0;i<5;i++){v+=a*n3(p);p*=2.03;a*=.5;}return v;}\n'+
    'vec3 bumpN(vec3 sp,vec3 n,float H){vec3 sx=dFdx(sp);vec3 sy=dFdy(sp);vec3 r1=cross(sy,n);vec3 r2=cross(n,sx);float det=dot(sx,r1);vec3 gr=sign(det)*(dFdx(H)*r1+dFdy(H)*r2);return normalize(abs(det)*n-gr);}\n'+
    'vec3 toLin(vec3 c){return pow(c,vec3(2.2));}\n';
    sh.fragmentShader=head+sh.fragmentShader
    .replace('#include <color_fragment>','#include <color_fragment>\n'+
      'vec3 P=vLoc;float ang=atan(P.z,P.x);\n'+
      'float cej=-0.58+0.07*cos(ang*2.0)+0.03*sin(ang*3.0);\n'+
      'float enamel=smoothstep(cej-0.02,cej+0.02,P.y);\n'+
      'float nA=fb(P*2.6+0.7);float nB=fb(P*11.0+5.0);float nC=fb(P*30.0);\n'+
      'float rr=length(P.xz);float occl=smoothstep(0.28,0.5,P.y);\n'+
      'float fis=occl*(exp(-pow(P.x*16.0,2.0))*exp(-P.z*P.z*2.5)+exp(-pow(P.z*17.0,2.0))*exp(-P.x*P.x*3.5))*(1.0-smoothstep(0.42,0.62,rr));\n'+
      'float tipW=smoothstep(0.42,0.66,P.y);float cervW=1.0-smoothstep(cej,cej+0.55,P.y);\n'+
      'vec3 enC=mix(vec3(0.955,0.945,0.905),vec3(0.86,0.90,0.94),tipW*0.6);\n'+
      'enC=mix(enC,vec3(0.94,0.87,0.72),cervW*0.55);enC*=0.985+0.03*nB;\n'+
      'vec3 rootC=mix(vec3(0.90,0.82,0.66),vec3(0.95,0.89,0.76),nA)*(0.97+0.04*nB);\n'+
      'vec3 base=mix(rootC,enC,enamel);\n'+
      'float plaque=smoothstep(0.47,0.70,fb(P*2.1+3.3))*(0.6+0.4*nB);\n'+
      'float band=exp(-pow((P.y-cej-0.10)*6.0,2.0));\n'+
      'float tartar=clamp(band*smoothstep(0.30,0.55,nA)*1.3+fis*1.2+exp(-pow((P.y-cej+0.12)*7.0,2.0))*smoothstep(0.45,0.6,nA),0.0,1.0);\n'+
      'float stain=clamp(plaque*0.85+tartar,0.0,1.0);\n'+
      'float cleaned=smoothstep(uLine-0.05,uLine+0.05,P.y);\n'+
      'float dirt=stain*(1.0-cleaned);float tar=tartar*(1.0-cleaned);\n'+
      'vec3 plaqueC=mix(vec3(0.80,0.72,0.47),vec3(0.88,0.82,0.60),nB);vec3 tarC=mix(vec3(0.36,0.25,0.12),vec3(0.58,0.45,0.24),nB);\n'+
      'base=mix(base,mix(plaqueC,tarC,clamp(tar*1.2,0.0,1.0)),dirt*0.92);\n'+
      'base*=1.0-fis*0.28;\n'+
      'diffuseColor.rgb=toLin(base);')
    .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(0.48,0.22+0.05*nB,enamel);roughnessFactor=mix(roughnessFactor,0.88,dirt);')
    .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+
      'float Hm=0.0012*nB-fis*0.012+dirt*0.018*fb(P*14.0)+tar*0.022*nB+(1.0-enamel)*0.0025*nA;\n'+
      'normal=bumpN(-vViewPosition,normal,Hm*3.0);')
    .replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n#ifdef CLEARCOAT\nmaterial.clearcoat*=enamel*(1.0-dirt);\n#endif')
    .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n'+
      'float fres=pow(1.0-abs(dot(normal,normalize(vViewPosition))),2.5);\n'+
      'totalEmissiveRadiance+=toLin(vec3(1.0,0.84,0.68))*(0.035+0.09*fres)*(0.4+0.6*enamel)*(1.0-dirt)+toLin(vec3(0.75,0.85,1.0))*tipW*0.04*(1.0-dirt);\n'+
      'float bandL=1.0-smoothstep(0.0,0.05,abs(P.y-uLine));totalEmissiveRadiance+=vec3(1.0,0.36,0.12)*bandL*uGlow*2.0+vec3(1.0,0.45,0.2)*exp(-pow((P.y-uLine-0.12)*9.0,2.0))*uGlow*0.25;\n'+
      'float shn=uShine<0.0?0.0:exp(-pow((P.y+P.x*0.6-mix(1.6,-3.0,uShine))*5.0,2.0))*(1.0-uShine*0.6);totalEmissiveRadiance+=vec3(1.0,0.97,0.92)*shn*0.55*enamel;');
  };
  var tooth=new THREE.Group();
  tooth.add(new THREE.Mesh(cg,mat));rootGeoms.forEach(function(g){tooth.add(new THREE.Mesh(g,mat))});
  var holder=new THREE.Group();holder.add(tooth);tooth.position.y=1.15;scene.add(holder);
  // soft floor shadow
  var shc=document.createElement('canvas');shc.width=shc.height=128;var sx=shc.getContext('2d'),sgd=sx.createRadialGradient(64,64,0,64,64,64);sgd.addColorStop(0,'rgba(0,0,0,.7)');sgd.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=sgd;sx.fillRect(0,0,128,128);
  var shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.0),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shc),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-2.05;holder.add(shadow);
  // particles
  function spriteTex(star){var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d');
    if(star){x.fillStyle='#fff';x.translate(32,32);for(var q=0;q<2;q++){x.save();x.rotate(Math.PI/4*q);x.globalAlpha=q?0.45:1;x.beginPath();x.moveTo(0,-31);x.quadraticCurveTo(2.5,-2.5,31,0);x.quadraticCurveTo(2.5,2.5,0,31);x.quadraticCurveTo(-2.5,2.5,-31,0);x.quadraticCurveTo(-2.5,-2.5,0,-31);x.fill();x.restore()}}
    else{var gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(220,235,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64)}
    return new THREE.CanvasTexture(c)}
  var N=320,sp=new Float32Array(N*3),seed=[];for(i=0;i<N;i++)seed.push([Math.random()*6.283,Math.random(),Math.random()*0.6+0.4,Math.random()]);
  var sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  var smat=new THREE.PointsMaterial({size:0.05,map:spriteTex(false),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0});
  tooth.add(new THREE.Points(sg,smat));
  var stars=[],stex=spriteTex(true);
  [[1.15,0.75,0.5,.42],[-1.05,0.45,0.6,.32],[0.5,1.25,-0.3,.26],[-0.75,-0.35,0.9,.2],[0.95,-0.8,0.7,.18]].forEach(function(p,ix){
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:stex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,color:ix%2?0xffd9c8:0xffffff}));
    s.position.set(p[0],p[1]+1.15,p[2]);s.userData={b:p[3],ph:ix*1.7};holder.add(s);stars.push(s)});
  // ultrasonic scaler: metal handle + curved tip, with light and water jet
  var metal=new THREE.MeshPhysicalMaterial({color:0xd9dde2,metalness:1,roughness:0.22,clearcoat:0.6});
  var scaler=new THREE.Group();
  var tipCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0.02,0.12,0.05),new THREE.Vector3(0.0,0.3,0.06),new THREE.Vector3(0,0.5,0)]);
  scaler.add(new THREE.Mesh(new THREE.TubeGeometry(tipCurve,40,0.018,12,false),metal));
  var neck=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.025,0.5,24),metal);neck.position.y=0.74;scaler.add(neck);
  var hand=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.09,1.7,32),new THREE.MeshPhysicalMaterial({color:0xea4e26,metalness:0.2,roughness:0.35,clearcoat:1}));hand.position.y=1.82;scaler.add(hand);
  var ringM=new THREE.Mesh(new THREE.CylinderGeometry(0.095,0.095,0.12,32),metal);ringM.position.y=1.0;scaler.add(ringM);
  var tipLight=new THREE.PointLight(0xffd2b8,0,2.2,2);scaler.add(tipLight);
  holder.add(scaler);var UPV=new THREE.Vector3(0,1,0),TMPV=new THREE.Vector3();
  var M=180,jp=new Float32Array(M*3),jseed=[];for(i=0;i<M;i++)jseed.push([Math.random(),0.8+Math.random()*1.2,(Math.random()-0.5)*1.4,(Math.random()-0.3)]);
  var jg=new THREE.BufferGeometry();jg.setAttribute('position',new THREE.BufferAttribute(jp,3));
  var jmat=new THREE.PointsMaterial({size:0.045,map:spriteTex(false),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,color:0xcfe6ff});
  holder.add(new THREE.Points(jg,jmat));
  function radAt(y){return y>-0.55?0.92:(y>-1.0?0.72:0.75)}
  var clock=new THREE.Clock(),rotY=-0.4,tx=0,ty=0,spin=0;
  function ease(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2}
  function frame(){
    requestAnimationFrame(frame);
    if(T3.visible===false||document.hidden||!T3.canvas.isConnected)return;
    var dt=Math.min(0.05,clock.getDelta()),t=clock.elapsedTime;U.uTime.value=t;
    if(reduce)T3.cl=T3.target;else{var dd=T3.target-T3.cl;T3.cl+=Math.sign(dd)*Math.min(Math.abs(dd),dt*1.6)}
    var c=T3.cl,ce=ease(c);
    U.uLine.value=1.05-ce*4.2;U.uGlow.value=(c>0.001&&c<0.999)?Math.min(1,Math.min(c,1-c)*10):0;
    var pct=Math.round(ce*100);
    if(pct!==T3.lastPct){T3.lastPct=pct;var slt=document.getElementById('toothSlot');if(slt)slt.style.setProperty('--p',ce.toFixed(3));var hp=document.getElementById('hudPct'),hb=document.getElementById('hudBar');if(hp)hp.textContent=pct;if(hb)hb.style.width=pct+'%';
      var ph=Math.floor(ce*4+0.001);if(ph!==T3.lastPh){T3.lastPh=ph;var li=document.querySelectorAll('#phases li');li.forEach(function(el,k){el.classList.toggle('done',k<ph)});var ht=document.getElementById('hintTxt');if(ht)ht.textContent=ph>=4?'Pulito! Torna su per risporcarlo':'Scorri per pulire il dente'}}
    spin=ce*Math.PI*2;
    rotY=-0.5+spin+(reduce?0:t*0.12);
    tx+=((T3.my*0.15)-tx)*0.05;ty+=((T3.mx*0.35)-ty)*0.05;
    tooth.rotation.set(0.12+tx+Math.sin(ce*Math.PI)*0.3,rotY+ty,reduce?0:Math.sin(t*0.5)*0.03);
    holder.position.y=reduce?0:Math.sin(t*1.0)*0.05;
    shadow.material.opacity=0.55-holder.position.y*1.5;
    smat.opacity=U.uGlow.value*0.95;
    if(smat.opacity>0.01){for(i=0;i<N;i++){var sd=seed[i],life=(sd[1]+t*sd[2]*1.4)%1,y=U.uLine.value+0.03+life*0.6,a=sd[0]+life*1.6+t*0.6,r=radAt(y)+0.04+life*0.55*sd[3];
      sp[i*3]=Math.cos(a)*r;sp[i*3+1]=y;sp[i*3+2]=Math.sin(a)*r}sg.attributes.position.needsUpdate=true}
    var sh=Math.max(0,Math.min(1,(c-0.9)/0.1));
    stars.forEach(function(s){var tw=reduce?1:0.55+0.45*Math.sin(t*2.6+s.userData.ph);s.material.opacity=sh*tw;s.scale.setScalar(s.userData.b*(0.6+0.4*tw)*sh+0.001);s.material.rotation=t*0.25+s.userData.ph});
    // camera choreography: push in during cleaning, follow the line
    var sw=Math.sin(ce*Math.PI);
    if(T3.camZ){cam.position.z=T3.camZ*(1-0.2*sw);cam.position.x=sw*0.3;var ly=(U.uLine.value+tooth.position.y)*0.28*sw;cam.position.y=0.15+ly*0.6;cam.lookAt(0,ly,0)}
    // scaler instrument
    var gl=U.uGlow.value,lineY=U.uLine.value+tooth.position.y+holder.position.y;
    scaler.visible=gl>0.01;
    if(scaler.visible){var phi=0.55,rad=radAt(U.uLine.value)+0.02+0.03*Math.sin(t*40);
      scaler.position.set(Math.cos(phi)*rad+(1-gl)*1.2,lineY,Math.sin(phi)*rad+(1-gl)*0.8);
      scaler.quaternion.setFromUnitVectors(UPV,TMPV.set(Math.cos(phi)*0.8,0.55,Math.sin(phi)*0.8+0.25).normalize());
      tipLight.intensity=gl*2.2;
      for(i=0;i<M;i++){var q=jseed[i],lf=(q[0]+t*q[1])%1,dx=Math.cos(phi+q[2])*lf*0.9,dz=Math.sin(phi+q[2])*lf*0.9+0.2*lf;
        jp[i*3]=scaler.position.x+dx;jp[i*3+1]=lineY+q[3]*lf*0.6-lf*lf*0.5;jp[i*3+2]=scaler.position.z+dz}
      jg.attributes.position.needsUpdate=true}
    else tipLight.intensity=0;
    jmat.opacity=gl*0.9;
    // shine sweep once fully clean
    if(ce>0.995){if(T3.shine0==null)T3.shine0=t;U.uShine.value=Math.min(1,(t-T3.shine0)/1.1);}else{T3.shine0=null;U.uShine.value=-1}
    renderer.render(scene,cam);
  }
  frame();
}
if(MODE==='site')setup3D();

(function(){var C=window.KD_CONFIG||{};
  if(C.supabaseUrl&&C.supabaseKey&&window.supabase&&C.supabaseUrl.indexOf('INSERISCI')<0){try{sb=window.supabase.createClient(C.supabaseUrl,C.supabaseKey)}catch(e){sb=null}}})();
(async function(){
  if(MODE==='site'){
    await Promise.race([loadContent(),new Promise(function(r){setTimeout(r,2500)})]);
    render();return;
  }
  if(sb){try{var s=await sb.auth.getSession();session=s.data.session}catch(e){}
    if(session){await loadContent();draft=clone(S);await loadRequests()}}
  render();
})();
})();
