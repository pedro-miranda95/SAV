/* PALS em Cenários — interface, voz e PWA.
   Os cenários são gerados em logic.js (ALGS, stripPath, nf, pick, shuffle, GROUPS). */
(function(){
'use strict';
const app=document.getElementById('app');
const toastEl=document.getElementById('toast');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wide=()=>matchMedia('(min-width:900px)').matches;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- armazenamento local (por dispositivo) ---------------- */
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const prefs=Object.assign({tts:false,hands:false,theme:'system'},LS.get('pals-prefs',{}));
const savePrefs=()=>LS.set('pals-prefs',prefs);
function applyTheme(){const r=document.documentElement;if(prefs.theme==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',prefs.theme);
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=getComputedStyle(r).getPropertyValue('--bg').trim()||'#0d6b63';}
applyTheme();

/* ---------------- ícones ---------------- */
const I={
  mic:'<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8"/>',
  spk:'<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  back:'<path d="M15 5l-7 7 7 7"/>', refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>', eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chev:'<path d="M6 9l6 6 6-6"/>', shuffle:'<path d="M3 7h3c5 0 6 10 11 10h4M3 17h3c2 0 3-1.5 4-3M17 7h4M14 10c1-2 2-3 3-3"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  // glifos dos algoritmos
  sas:'<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>', pcr:'<path d="M3 12h4l2-5 3 10 2-5h7"/>',
  bradi:'<path d="M2 12h6l1.5-4 2 8 1.5-4H22"/>', taqui:'<path d="M2 12h2l1-3 1.5 6L8 9l1.5 6L11 9l1.5 6L14 9l1.5 6L17 9l1 3h4"/>',
  sepsis:'<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>', rce:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'
};
const ico=(n,cls='i')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const ECG='<path d="M0 12 H14 L17 9 L20 12 H24 L27 2 L31 18 L34 12 H40 L43 9 L46 12 H54"/>';

function toast(msg,ms=3200){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),ms);}
function buzz(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}

/* ---------------- linguagem: normalizar e comparar o que foi dito ---------------- */
const STOP=new Set('a o as os de da do das dos e em no na nos nas um uma uns umas com por para se que ou ao aos pelo pela pelos pelas sem mais muito ja depois antes entre sobre ate como cada este esta isto isso neste nesta aqui seu sua quando conforme possivel necessario faco fazer vou eu entao tambem logo agora caso ser ter tem'.split(' '));
const NUMW={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,catorze:14,quinze:15,dezasseis:16,vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60,cem:100,cento:100};
const SYN=[['oxigenio','o2','oxigenacao','oxigeno','oxigenar'],['rcp','compressoes','compressao','reanimacao','massagem','comprimir','compressor'],['acesso','ev','io','intraossea','intraosseo','endovenoso','veia','cateter','intravenoso','venoso'],
 ['insuflador','ambu','mascara','ventilar','ventilacao','ventilacoes','insuflacoes','insuflar'],['monitor','monitorizar','monitorizacao','monitorizo','monitoriza'],['desfibrilhador','pas','eletrodos','dae','desfibrilhar','desfibrilhacao'],
 ['adrenalina','epinefrina'],['avancada','entubar','intubar','entubacao','intubacao','tubo','tet','supraglotico','entubo'],['capnografia','etco2','capnografo','capnometria'],['ajuda','socorro'],['emergencia','112','inem','equipa'],
 ['choque','descarga','chocar'],['glicemia','glicose','acucar','dextrose','hipoglicemia'],['ecg','eletrocardiograma','derivacoes'],['saturacao','spo2','oximetria','oximetro'],['temperatura','febre','arrefecer','normotermia','cdt'],
 ['bolus','soro','fluidos','cristaloide','volume','fluidoterapia'],['antibiotico','antibioticos','antibioterapia'],['hemocultura','culturas','hemoculturas','analises'],['pulso','pulsos'],
 ['permeavel','permeabilizar','extensao','mento','mandibula','abrir','posicionar'],['vagais','vagal','valsalva','gelo'],['cardioversao','sincronizada','sincronizado'],['causas','causa','reversiveis','hs','ts'],['pacing','pacemaker','estimulacao'],
 ['abcde','abc','avaliacao','avaliar','primaria'],['amiodarona','antiarritmico'],['lidocaina'],['atropina'],['adenosina']];
const SYNMAP={};SYN.forEach(g=>g.forEach(w=>SYNMAP[w]=g[0]));
function norm(s){return String(s).replace(/<[^>]+>/g,' ').replace(/₂/g,'2').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();}
function toks(s,forKeys){return norm(s).split(' ').filter(Boolean).map(w=>NUMW[w]!=null?String(NUMW[w]):w)
  .filter(w=>!STOP.has(w)&&(/^\d+$/.test(w)?(!forKeys||+w>=10):(w.length>=3||['o2','ev','io','pa','fc'].includes(w))))
  .map(w=>SYNMAP[w]||(w.length>6&&!/^\d/.test(w)?w.slice(0,6):w));}
function matchItems(text,items){const T=new Set(toks(text));if(!T.size)return items.map(()=>false);
  return items.map(it=>{const K=[...new Set(toks(it,true))];if(!K.length)return false;const m=K.filter(k=>T.has(k)).reduce((a,k)=>a+(/^\d+$/.test(k)?2:1),0);const need=Math.min(3,Math.max(1,Math.ceil(K.length*.3)));return m>=need;});}
const ORD={um:0,uma:0,'1':0,primeira:0,primeiro:0,dois:1,duas:1,'2':1,segunda:1,segundo:1,tres:2,'3':2,terceira:2,terceiro:2,quatro:3,'4':3,quarta:3,quarto:3};
function parseChoice(text,opts){
  const n=norm(text);if(!n)return -1;const w=n.split(' ');
  const yn=opts.map(o=>norm(o.t).split(' ')[0]);
  if(yn.includes('sim')&&(w[0]==='sim'||w[0]==='nao')) return yn.indexOf(w[0]);
  const m=n.match(/(?:opcao|numero|resposta|alinea)\s+(\S+)/);if(m&&ORD[m[1]]!=null&&ORD[m[1]]<opts.length)return ORD[m[1]];
  if(w.length<=2){for(const x of w){if(ORD[x]!=null&&ORD[x]<opts.length)return ORD[x];}}
  const T=new Set(toks(text));const sc=opts.map(o=>{const K=[...new Set(toks(o.t,true))];return K.length?K.filter(k=>T.has(k)).length/K.length:0;});
  const best=Math.max(...sc);const i=sc.indexOf(best);const second=Math.max(...sc.filter((_,j)=>j!==i),0);
  return best>0&&best>=second*1.4+.01?i:-1;
}
const isCmd=(t,re)=>re.test(norm(t));
const CMD_NEXT=/\b(seguinte|proximo|proxima|avancar|continuar|continua|next)\b/;
const CMD_SHOW=/\b(revelar|mostrar|resposta|ver resposta)\b/;
const CMD_READ=/\b(repetir|repete|ler|le outra vez)\b/;

/* ---------------- leitura em voz alta ---------------- */
const TTS={ok:'speechSynthesis' in window,voice:null,
  pick(){if(!this.ok)return;const vs=speechSynthesis.getVoices();this.voice=vs.find(v=>/pt[-_]PT/i.test(v.lang))||vs.find(v=>/^pt/i.test(v.lang))||null;},
  clean(h){return String(h).replace(/<[^>]+>/g,' ').replace(/EV\/IO/g,'endovenoso ou intraósseo').replace(/mg\/kg/g,' miligramas por quilo').replace(/mL\/kg/g,' mililitros por quilo')
    .replace(/J\/kg/g,' joules por quilo').replace(/(\d)\s?mg\b/g,'$1 miligramas').replace(/(\d)\s?mL\b/g,'$1 mililitros').replace(/(\d)\s?J\b/g,'$1 joules').replace(/\/min/g,' por minuto')
    .replace(/SpO₂/g,'saturação').replace(/EtCO₂/g,'E T C O 2').replace(/O₂/g,'oxigénio').replace(/\bFC\b/g,'frequência cardíaca').replace(/\bPAS\b/g,'pressão sistólica').replace(/\bPA\b/g,'pressão arterial')
    .replace(/\bTPC\b/g,'tempo de preenchimento capilar').replace(/≥/g,'pelo menos ').replace(/≤/g,'até ').replace(/</g,' menor que ').replace(/>/g,' maior que ').replace(/—|–/g,', ').replace(/\s+/g,' ');},
  say(text,onend){if(!this.ok||!text){onend&&onend();return;}speechSynthesis.cancel();if(!this.voice)this.pick();
    const u=new SpeechSynthesisUtterance(this.clean(text));u.lang='pt-PT';if(this.voice)u.voice=this.voice;u.rate=1.04;
    let done=false;const fin=()=>{if(!done){done=true;onend&&onend();}};u.onend=fin;u.onerror=fin;speechSynthesis.speak(u);},
  stop(){if(this.ok)speechSynthesis.cancel();}};
if(TTS.ok){TTS.pick();speechSynthesis.onvoiceschanged=()=>TTS.pick();}

/* ---------------- reconhecimento de voz ---------------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const Voice={supported:!!SR,blocked:false,on:false,rec:null,text:'',base:'',silence:null,auto:false,
  start(auto){
    if(this.on)return;
    if(!this.supported){toast('Este browser não reconhece voz. Usa o Chrome (Android/computador) ou o Safari (iPhone). Podes escrever a resposta.',4500);return;}
    if(this.blocked){toast('O microfone está bloqueado. Autoriza-o nas definições do site no browser.',4200);return;}
    TTS.stop();
    const r=new SR();r.lang='pt-PT';r.interimResults=true;r.continuous=true;r.maxAlternatives=1;
    this.rec=r;this.on=true;this.auto=!!auto;this.base=(S&&S.state==='ask'&&S.typed[S.idx])?S.typed[S.idx]+' ':'';this.text=this.base;
    r.onresult=e=>{let s='';for(let i=0;i<e.results.length;i++)s+=e.results[i][0].transcript+(e.results[i].isFinal?' ':'');this.text=(this.base+s).replace(/\s+/g,' ');
      onHeard(this.text,false);
      if(this.auto||(S&&S.state!=='ask')){clearTimeout(this.silence);this.silence=setTimeout(()=>this.stop(),this.auto?2200:1600);}
    };
    r.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){this.blocked=true;toast('Sem acesso ao microfone. Autoriza o microfone para este site (na versão publicada, por HTTPS).',4800);}
      else if(e.error==='no-speech'){toast('Não ouvi nada. Toca no microfone e fala.');}
      else if(e.error==='network'){toast('O reconhecimento de voz precisa de internet neste browser.');}};
    r.onend=()=>{clearTimeout(this.silence);const was=this.on;this.on=false;this.rec=null;setMic();if(was)onHeard(this.text.trim(),true);};
    try{r.start();buzz(15);}catch(e){this.on=false;}
    setMic();
  },
  stop(){clearTimeout(this.silence);if(this.rec){try{this.rec.stop()}catch(e){}}},
  toggle(){this.on?this.stop():this.start(false);}
};
function setMic(){document.querySelectorAll('.mic').forEach(b=>{b.classList.toggle('on',Voice.on);b.classList.toggle('off',!Voice.supported||Voice.blocked);b.setAttribute('aria-pressed',Voice.on);b.setAttribute('aria-label',Voice.on?'Parar de ouvir':'Responder por voz');});
  const st=document.getElementById('cur');if(st)st.classList.toggle('listening',Voice.on);}

/* o que fazer com o que foi ouvido */
function onHeard(text,final){
  if(!S){return;}
  const st=S.sc.steps[S.idx];
  if(!st){ if(final&&isCmd(text,/\b(novo|outro|repetir|seguinte|proximo)\b/)) start(S.key); return; }
  if(S.state==='ask'){
    if(st.type==='action'){const ta=document.getElementById('typed');S.typed[S.idx]=text;if(ta)ta.value=text;
      if(final&&text){ if(isCmd(text,/^(revelar|mostrar)$/)) S.typed[S.idx]=''; reveal(); } }
    else{const h=document.getElementById('heard');if(h)h.textContent=text;
      if(final&&text){ if(isCmd(text,CMD_READ)){readStep(true);return;} const j=parseChoice(text,st._o);
        if(j>=0)choose(j);else{toast('Não percebi a opção. Diz, por exemplo, "opção dois".');if(prefs.hands)setTimeout(()=>Voice.start(true),900);} } }
  } else if(final&&text){
    if(isCmd(text,CMD_NEXT))advance(); else if(isCmd(text,CMD_READ))readStep(true);
    else if(prefs.hands)setTimeout(()=>Voice.start(true),300);
  }
}

/* ---------------- estado ---------------- */
let S=null; /* {key, sc, idx, res[], typed[], ticks{}, auto{}, state, chosen, spoken} */
const stats=()=>LS.get('pals-stats',{});

/* ---------------- início ---------------- */
function home(){
  Voice.stop();TTS.stop();S=null;
  const st=stats();const all=Object.values(st);const n=all.reduce((a,b)=>a+b.n,0);const avg=n?Math.round(all.reduce((a,b)=>a+b.sum,0)/n):null;
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const cards=Object.entries(ALGS).map(([k,a])=>{const s=st[k];const m=s?Math.round(s.sum/s.n):0;
    return `<button class="alg" style="--c:var(${a.color})" data-k="${k}">
      <span class="glyph">${ico(k,'')}</span><h4>${a.name}</h4><p>${a.desc}</p>
      <span class="stat">${s?`<span class="meter"><i style="width:${m}%"></i></span>${m}% · ${s.n}×`:'Novo'}</span></button>`;}).join('');
  app.innerHTML=`
  <header class="appbar"><div class="wrap bar">
    <div class="brand"><span class="logo"><svg viewBox="0 0 54 20">${ECG}</svg></span><h1>PALS em Cenários</h1></div>
    <button class="iconbtn" id="set" aria-label="Definições">${ico('sliders')}</button></div></header>
  <main class="wrap home">
    <section class="hero"><svg class="ecg" viewBox="0 0 54 20" aria-hidden="true">${ECG}</svg>
      <span class="label">Treino SAV pediátrico · AHA 2025</span>
      <h2>Diz o que fazes, passo a passo.</h2>
      <p>Cada cenário é novo: idade, peso, causa e evolução mudam, e com elas as doses e o caminho no algoritmo. Responde por voz ou por escrito e confirma no fim de cada passo.</p>
      <div class="kpis"><div class="kpi"><b>${n}</b><span>cenários feitos</span></div><div class="kpi"><b>${avg==null?'—':avg+'%'}</b><span>média</span></div></div>
      <button class="cta" id="rand">${ico('shuffle')} Cenário surpresa (como no exame)</button>
    </section>
    <section><div class="sec-h"><h3>Algoritmos</h3><span class="label">escolhe um</span></div><div class="grid" style="margin-top:10px">${cards}</div></section>
    <section class="tiles">
      <div class="tile"><span class="ic">${ico('mic')}</span><div><b>Responder por voz</b>${Voice.supported?'Toca no microfone e diz o que fazes; os itens que mencionares ficam marcados. Nas escolhas, diz "opção dois" ou "sim/não".':'Este browser não reconhece voz. Usa o Chrome (Android) ou o Safari (iPhone).'}
        <br><button id="hf">${prefs.hands?'Modo mãos-livres ligado':'Ligar modo mãos-livres'}</button></div></div>
      ${standalone?'':`<div class="tile"><span class="ic">${ico('phone')}</span><div><b>Instalar no telemóvel</b>${ios?'No Safari: Partilhar → "Adicionar ao ecrã principal".':'Abre como uma app, em ecrã inteiro e sem internet.'}
        ${!ios&&deferredInstall?'<br><button id="inst">Instalar agora</button>':''}</div></div>`}
    </section>
    <p class="foot">Ferramenta de estudo não oficial, baseada nos algoritmos e doses PALS (AHA, 2025). Não substitui o manual nem a formação certificada. Os resultados ficam guardados só neste dispositivo.</p>
  </main>`;
  app.querySelectorAll('.alg').forEach(b=>b.onclick=()=>start(b.dataset.k));
  document.getElementById('rand').onclick=()=>start(pick(Object.keys(ALGS)));
  document.getElementById('set').onclick=settings;
  document.getElementById('hf').onclick=()=>{prefs.hands=!prefs.hands;if(prefs.hands)prefs.tts=true;savePrefs();home();toast(prefs.hands?'Mãos-livres: leio cada passo e fico à escuta da tua resposta.':'Mãos-livres desligado.');};
  const ib=document.getElementById('inst');if(ib)ib.onclick=async()=>{deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;home();};
  window.scrollTo({top:0});
}

/* ---------------- definições ---------------- */
function settings(){
  const sc=document.createElement('div');sc.className='scrim';
  sc.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-label="Definições"><h3>Definições</h3>
    <label class="row"><div><b>Ler cada passo em voz alta</b>Situação e pergunta, como um examinador.</div><input type="checkbox" class="switch" id="p-tts" ${prefs.tts?'checked':''} ${TTS.ok?'':'disabled'}></label>
    <label class="row"><div><b>Modo mãos-livres</b>Depois de ler, fica à escuta. Diz "seguinte" para avançar.</div><input type="checkbox" class="switch" id="p-hands" ${prefs.hands?'checked':''} ${Voice.supported?'':'disabled'}></label>
    <div><div class="label" style="margin-bottom:6px">Tema</div><div class="seg">${['system','light','dark'].map(t=>`<button data-t="${t}" class="${prefs.theme===t?'on':''}">${{system:'Sistema',light:'Claro',dark:'Escuro'}[t]}</button>`).join('')}</div></div>
    <button class="ghost" id="p-reset" style="justify-content:center">Apagar o meu histórico</button>
    <button class="primary" id="p-ok">Fechar</button></div>`;
  document.body.appendChild(sc);
  const close=()=>{sc.remove();if(!S)home();};
  sc.onclick=e=>{if(e.target===sc)close();};
  sc.querySelector('#p-ok').onclick=close;
  sc.querySelector('#p-tts').onchange=e=>{prefs.tts=e.target.checked;if(!prefs.tts){prefs.hands=false;sc.querySelector('#p-hands').checked=false;TTS.stop();}savePrefs();};
  sc.querySelector('#p-hands').onchange=e=>{prefs.hands=e.target.checked;if(prefs.hands){prefs.tts=true;sc.querySelector('#p-tts').checked=true;}savePrefs();};
  sc.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{prefs.theme=b.dataset.t;savePrefs();applyTheme();sc.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x===b));});
  const rs=sc.querySelector('#p-reset');rs.onclick=()=>{if(rs.dataset.c){LS.set('pals-stats',{});rs.textContent='Histórico apagado';}else{rs.dataset.c=1;rs.textContent='Toca outra vez para confirmar';}};
}

/* ---------------- cenário ---------------- */
function start(key){
  Voice.stop();TTS.stop();
  const sc=ALGS[key].gen();
  S={key,sc,idx:0,res:[],typed:[],ticks:{},auto:{},state:'ask',chosen:null,spoken:-1,caseOpen:true,monOpen:false};
  render();window.scrollTo({top:0});
}
function vitalsNow(){
  const sc=S.sc;const v=Object.assign({},sc.vit||{});let rh=sc.rhythm||null;
  for(let i=0;i<=Math.min(S.idx,sc.steps.length-1);i++){const st=sc.steps[i];if(st.vit)Object.assign(v,st.vit);if(st.v)Object.assign(v,st.v);if(st.rhythm)rh=st.rhythm;}
  if(!rh&&v.fc&&/^\d+$/.test(v.fc))rh={type:'sinus',rate:+v.fc};
  return {v,rh};
}
const isNum=n=>/^[\d\/,<\s—-]*s?$/.test(String(n??'—'));
function stripSVG(rh,h=78,cls='strip'){
  if(!rh)return `<svg class="${cls}" viewBox="0 0 600 ${h}" preserveAspectRatio="none" aria-label="Sem traçado"><text x="300" y="${h/2+5}" text-anchor="middle">monitor ainda não aplicado</text></svg>`;
  return `<svg class="${cls}" viewBox="0 0 600 78" preserveAspectRatio="none" aria-label="Traçado de ECG"><g>${Array.from({length:11},(_,i)=>`<line class="gl" x1="${(i+1)*50}" y1="0" x2="${(i+1)*50}" y2="78"/>`).join('')}</g><path class="trace" d="${stripPath(rh.type,rh.rate)}"/></svg>`;
}
function monitorHTML(v,rh,p){
  const cell=(cls,k,n,r)=>`<div class="v ${cls}"><div class="k">${k}</div><div class="n${isNum(n)?'':' txt'}">${esc(n??'—')}</div><div class="r">${r||'&nbsp;'}</div></div>`;
  return `<div class="monitor" aria-label="Monitor"><div class="mon-head"><span>II · 25 mm/s</span><span>${esc(GROUPS[p.g].label.toUpperCase())}</span></div>${stripSVG(rh)}
    <div class="vit">${cell('hr','FC /min',v.fc,`N ${p.G.fc[0]}–${p.G.fc[1]}`)}${cell('sp','SpO₂ %',v.spo2,'')}${cell('rr','FR /min',v.fr,`N ${p.G.fr[0]}–${p.G.fr[1]}`)}
    ${cell('bp','PA mmHg',v.pa,`hipot. PAS &lt;${p.hypo}`)}${cell('','TPC',v.tpc,'')}${v.etco2?cell('','EtCO₂',v.etco2,'mmHg'):cell('','Temp °C',v.temp,'')}</div></div>`;
}
function resClass(r){return r>=.99?'good':r>=.5?'mid':'badr';}
function doneHTML(i){
  const st=S.sc.steps[i],r=S.res[i];let body='';
  if(st.type==='action')body=`<ul>${st.items.map((t,j)=>`<li>${S.ticks[i]&&S.ticks[i][j]?'✓ ':'○ '}${t}</li>`).join('')}</ul>`;
  else{const right=st.opts.find(o=>o.ok);body=`<div>Resposta: <b>${right.t}</b></div>${st.explain?`<div>${st.explain}</div>`:''}`;}
  return `<details class="done"><summary><span class="box">${esc(st.box)}</span><span class="t">${esc(st.title)}</span><span class="res ${resClass(r)}">${r>=.99?'✓':Math.round(r*100)+'%'}</span></summary><div class="body">${body}</div></details>`;
}
function actionsHTML(st,revealed,last){
  const mic=`<button class="round mic" id="mic" aria-pressed="false" aria-label="Responder por voz">${ico('mic')}</button>`;
  const spk=TTS.ok?`<button class="round" id="spk" aria-label="Ler em voz alta">${ico('spk')}</button>`:'';
  let main='';
  if(st.type==='action')main=revealed?`<button class="primary grow" id="go">${last?'Ver resultado':'Seguinte'} ${ico('arrow')}</button>`:`<button class="primary grow" id="go">${ico('eye')} Revelar</button>`;
  else main=revealed?`<button class="primary grow" id="go">${last?'Ver resultado':'Seguinte'} ${ico('arrow')}</button>`:`<span class="grow kbd">Toca numa opção ou diz o número</span>`;
  return `<div class="actions">${spk}${mic}${main}${wide()?'<span class="kbd">Enter · 1–4 · V voz</span>':''}</div>`;
}
function stepHTML(){
  const i=S.idx,st=S.sc.steps[i],rev=S.state!=='ask',last=i===S.sc.steps.length-1;
  let h=`<section class="step" id="cur"><div class="meta"><span class="label">Passo ${i+1} de ${S.sc.steps.length}</span>${rev?`<span class="box">${esc(st.box)}</span>`:''}</div>`;
  if(rev)h+=`<h3>${esc(st.title)}</h3>`;
  if(st.sit)h+=`<div class="sit">${st.sit}</div>`;
  h+=`<p class="q">${st.q}</p>`;
  if(st.type==='action'){
    if(!rev)h+=`<textarea id="typed" placeholder="Fala (microfone) ou escreve o que fazes…" aria-label="A tua resposta">${esc(S.typed[i]||'')}</textarea>`;
    else{
      if(S.typed[i])h+=`<div class="your">Disseste: “${esc(S.typed[i])}”</div>`;
      const a=S.auto[i]||[];const nA=a.filter(Boolean).length;
      h+=`<div class="label">${S.typed[i]?`Marquei ${nA} de ${st.items.length} — corrige se for preciso`:'Marca o que disseste'}</div>
        <ul class="checks">${st.items.map((t,j)=>`<li><label><input type="checkbox" id="ck-${i}-${j}" data-j="${j}" ${a[j]?'checked':''}><span>${t}${a[j]?'<span class="tag">dito</span>':''}</span></label></li>`).join('')}</ul>`;
      if(st.note)h+=`<div class="note">${st.note}</div>`;
    }
  } else {
    if(!st._o)st._o=st.keep?st.opts:shuffle(st.opts);
    h+=`<div class="opts">${st._o.map((o,j)=>{let c='';if(rev){if(o.ok)c='right';else if(j===S.chosen)c='wrong';else c='dim';}
      return `<button class="opt ${c}" data-j="${j}" ${rev?'disabled':''}><span class="n">${j+1}</span><span>${o.t}</span></button>`;}).join('')}</div>`;
    if(!rev)h+=`<div class="heard" id="heard" aria-live="polite"></div>`;
    else{const ok=st._o[S.chosen].ok;h+=`<div class="note ${ok?'goodn':'badn'}"><span class="verdict">${ok?'Certo.':'Não.'}</span> ${st.explain||''}</div>`;}
  }
  return h+actionsHTML(st,rev,last)+`</section>`;
}
function endHTML(){
  const a=ALGS[S.key];const pct=Math.round(100*S.res.reduce((x,y)=>x+y,0)/S.res.length);
  const weak=S.sc.steps.map((st,i)=>({st,r:S.res[i]})).filter(x=>x.r<.99);const C=2*Math.PI*44;
  return `<section class="end" id="cur"><span class="label">Cenário concluído</span>
    <div class="score"><svg class="ring" viewBox="0 0 108 108"><circle class="bgc" cx="54" cy="54" r="44"/><circle class="fg" cx="54" cy="54" r="44" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct/100)}" transform="rotate(-90 54 54)"/><text x="54" y="63" text-anchor="middle">${pct}%</text></svg>
      <div><b style="font-size:18px">${S.res.filter(r=>r>=.99).length} de ${S.res.length} passos completos</b><div class="your" style="font-style:normal">${pct>=90?'Excelente — estás pronto para este algoritmo.':pct>=70?'Bom. Revê os passos abaixo e repete.':'Revê o algoritmo e tenta outro cenário.'}</div></div></div>
    ${weak.length?`<div><div class="label" style="margin-bottom:6px">Rever</div><ul class="review">${weak.map(x=>`<li><b class="box">${esc(x.st.box)}</b> ${esc(x.st.title)} — ${Math.round(x.r*100)}%</li>`).join('')}</ul></div>`:'<div class="note goodn">Percurso completo, sem falhas.</div>'}
    <div class="endbtns"><button class="primary" id="again">${ico('refresh')} Novo cenário</button><button class="ghost" id="other">Outro algoritmo</button></div></section>`;
}
function render(){
  const a=ALGS[S.key],sc=S.sc,N=sc.steps.length,fin=S.idx>=N,p=sc.p;
  const trailOpen=document.getElementById('trail')?.open;const refOpen=document.getElementById('ref')?.open;
  const caseEl=document.getElementById('case');if(caseEl)S.caseOpen=caseEl.open;
  const {v,rh}=vitalsNow();
  const prog=Math.round(100*Math.min(S.idx,N)/N);
  const mini=(cls,k,n)=>`<div class="${cls}"><span>${k}</span><b class="${isNum(n)?'':'txt'}">${esc(n??'—')}</b></div>`;
  const doneN=Math.min(S.idx,N);
  let trail='';
  if(doneN){trail=`<details class="trail" id="trail"><summary>${ico('list')} Percurso <span class="dots">${S.res.slice(-12).map(r=>`<i class="${r>=.99?'g':r>=.5?'m':'b'}"></i>`).join('')}</span>${ico('chev','i chev')}</summary><div class="list">${Array.from({length:doneN},(_,i)=>doneHTML(i)).join('')}</div></details>`;}
  app.innerHTML=`
  <header class="appbar" style="--c:var(${a.color})"><div class="wrap">
    <div class="bar"><button class="iconbtn" id="back" aria-label="Voltar aos algoritmos">${ico('back')}</button>
      <div class="crumb"><span class="chip">${a.code}<span class="nmfull"> · ${esc(a.name)}</span></span><span class="sub">${fin?'Concluído':`Passo ${S.idx+1} de ${N}`} · ${esc(p.name)}, ${esc(p.ageText)}, ${nf(p.w)} kg</span></div>
      <button class="iconbtn" id="new" aria-label="Novo cenário">${ico('refresh')}</button><button class="iconbtn" id="set" aria-label="Definições">${ico('sliders')}</button></div>
    <button class="vbar" id="vbar" aria-expanded="${S.monOpen}" aria-label="Sinais vitais — tocar para ver o monitor"><span class="vmini">${mini('hr','FC',v.fc)}${mini('sp','SpO₂',v.spo2)}${mini('bp','PA',v.pa)}${mini('rr','FR',v.fr)}</span><span class="mstrip">${rh?`<svg viewBox="0 0 300 78" preserveAspectRatio="none"><path d="${stripPath(rh.type,rh.rate).replace(/L(\d+) /g,(m,x)=>'L'+(x/2)+' ').replace(/^M(\d+) /,(m,x)=>'M'+(x/2)+' ')}"/></svg>`:''}</span></button>
    ${S.monOpen?`<div class="monwrap">${monitorHTML(v,rh,p)}</div>`:''}
  </div><div class="progress"><i style="width:${prog}%"></i></div></header>
  <main class="wrap practice" style="--c:var(${a.color})">
    <aside class="side">
      <details class="card case" id="case" ${S.caseOpen||wide()?'open':''}><summary><span class="avatar">${esc(p.name[0])}</span><div><div class="nm">${esc(p.name)}</div><div class="who">${esc(p.ageText)} · ${nf(p.w)} kg · ${esc(GROUPS[p.g].label)}</div></div>${ico('chev','i chev')}</summary>
        <div class="body"><div class="setting">${esc(sc.setting)}</div><p>${sc.story}</p></div></details>
      ${monitorHTML(v,rh,p)}
      <details class="ref" id="ref" style="--c:var(${a.color})"><summary>${ico('eye')} Espreitar o algoritmo ${ico('chev','i chev')}</summary><ol>${a.ref.map(([b,t])=>`<li><b>${/^\d/.test(b)?'C'+b:b}</b><span>${t}</span></li>`).join('')}</ol></details>
    </aside>
    <div class="flow">${trail}${fin?endHTML():stepHTML()}</div>
  </main>`;
  if(trailOpen&&document.getElementById('trail'))document.getElementById('trail').open=true;
  if(refOpen)document.getElementById('ref').open=true;
  bind();setMic();
  if(fin){ if(S.spoken!==N){S.spoken=N;if(prefs.tts)TTS.say(`Cenário concluído. ${Math.round(100*S.res.reduce((x,y)=>x+y,0)/S.res.length)} por cento.`);} }
  else if(S.state==='ask'&&S.spoken!==S.idx){S.spoken=S.idx;if(prefs.tts)setTimeout(()=>readStep(false),250);}
}
function readStep(force){
  if(!S)return;const st=S.sc.steps[S.idx];if(!st)return;
  let t=(st.sit?st.sit+'. ':'')+st.q;
  if(st.type==='choice'&&S.state==='ask'&&st._o)t+=' '+st._o.map((o,j)=>`Opção ${j+1}: ${o.t}.`).join(' ');
  if(S.state!=='ask'&&st.type==='choice'){const ok=st._o[S.chosen].ok;t=(ok?'Certo. ':'Não. ')+(st.explain||'');}
  TTS.say(t,()=>{if(prefs.hands&&S&&!Voice.on)Voice.start(true);});
}
function bind(){
  const $=id=>document.getElementById(id);
  $('back').onclick=home;$('new').onclick=()=>start(S.key);$('set').onclick=settings;
  $('vbar').onclick=()=>{S.monOpen=!S.monOpen;render();};
  const go=$('go');if(go)go.onclick=advance;
  const mic=$('mic');if(mic)mic.onclick=()=>Voice.toggle();
  const spk=$('spk');if(spk)spk.onclick=()=>{if(speechSynthesis.speaking){TTS.stop();}else readStep(true);};
  const ta=$('typed');if(ta){ta.oninput=()=>S.typed[S.idx]=ta.value;ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();advance();}};}
  app.querySelectorAll('.opt:not([disabled])').forEach(b=>b.onclick=()=>choose(+b.dataset.j));
  const ag=$('again');if(ag)ag.onclick=()=>start(S.key);const ot=$('other');if(ot)ot.onclick=home;
}
function reveal(){
  const st=S.sc.steps[S.idx];Voice.stop();
  S.auto[S.idx]=S.typed[S.idx]?matchItems(S.typed[S.idx],st.items):st.items.map(()=>false);
  S.state='shown';render();focusCur();
  if(prefs.tts){const n=S.auto[S.idx].filter(Boolean).length;TTS.say(S.typed[S.idx]?`Marquei ${n} de ${st.items.length}. Diz seguinte para continuar.`:'Marca o que disseste.',()=>{if(prefs.hands&&!Voice.on)Voice.start(true);});}
}
function choose(j){
  const st=S.sc.steps[S.idx];if(S.state!=='ask')return;Voice.stop();
  S.chosen=j;S.state='shown';const ok=st._o[j].ok;S.res[S.idx]=ok?1:0;buzz(ok?20:[40,60,40]);render();focusCur();
  if(prefs.tts)readStep(true);
}
function advance(){
  const st=S.sc.steps[S.idx];if(!st)return;
  if(st.type==='action'&&S.state==='ask'){reveal();return;}
  if(S.state!=='shown')return;
  Voice.stop();TTS.stop();
  if(st.type==='action'){const t=[...app.querySelectorAll('.checks input')].map(b=>b.checked);S.ticks[S.idx]=t;S.res[S.idx]=t.filter(Boolean).length/t.length;}
  S.idx++;S.state='ask';S.chosen=null;S.caseOpen=false;
  if(S.idx>=S.sc.steps.length)saveStats();
  render();focusCur();
}
function saveStats(){const st=stats();const pct=Math.round(100*S.res.reduce((x,y)=>x+y,0)/S.res.length);const o=st[S.key]||{n:0,sum:0};o.n++;o.sum+=pct;o.last=pct;st[S.key]=o;LS.set('pals-stats',st);}
function focusCur(){const el=document.getElementById('cur');if(!el)return;const top=el.getBoundingClientRect().top;const head=document.querySelector('.appbar')?.offsetHeight||0;
  if(top<head||top>window.innerHeight*.55)window.scrollTo({top:window.scrollY+top-head-12,behavior:reduced()?'auto':'smooth'});}

/* atalhos de teclado (computador) */
document.addEventListener('keydown',e=>{
  if(!S||document.querySelector('.scrim'))return;
  if(e.target.tagName==='TEXTAREA'){return;}
  const st=S.sc.steps[S.idx];
  if((e.key==='v'||e.key==='V')&&!e.metaKey&&!e.ctrlKey){Voice.toggle();return;}
  if(st&&st.type==='choice'&&S.state==='ask'&&/^[1-4]$/.test(e.key)){const j=+e.key-1;if(st._o&&st._o[j])choose(j);}
  else if(e.key==='Enter'&&document.activeElement?.tagName!=='BUTTON'&&document.activeElement?.tagName!=='SUMMARY'&&st){e.preventDefault();advance();}
});

/* ---------------- PWA ---------------- */
let deferredInstall=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;if(!S)home();});
if('serviceWorker' in navigator&&location.protocol==='https:'&&document.querySelector('link[rel="manifest"]')){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
}
home();
})();
