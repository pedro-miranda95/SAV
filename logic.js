/* ===================== utilidades ===================== */
const R = Math.random;
const pick = a => a[Math.floor(R()*a.length)];
const rnd = (a,b) => a + Math.floor(R()*(b-a+1));
const chance = p => R() < p;
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function nf(x){ const d = x>=100?0 : x>=10?1 : x>=1?2 : 3; return String(Math.round(x*10**d)/10**d).replace('.',','); }
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const act = o => Object.assign({type:'action'},o);
const ch  = o => Object.assign({type:'choice'},o);
function opts(right, wrongs){ const seen=new Set([right]); const o=[{t:right,ok:true}]; for(const w of wrongs){ if(!seen.has(w)){seen.add(w);o.push({t:w,ok:false});} } return o.slice(0,4); }

/* ===================== doente ===================== */
const NM=['Tomás','Santiago','Afonso','Duarte','Rodrigo','Martim','Gabriel','Lucas','Salvador','Vicente','Gonçalo','Rafael'];
const NF=['Maria','Leonor','Matilde','Beatriz','Carolina','Alice','Inês','Benedita','Mariana','Francisca','Clara','Sofia'];
const GROUPS={
  rn:{label:'Recém-nascido',fc:[100,205],fr:[30,53]},
  lact:{label:'Lactente',fc:[100,180],fr:[30,53]},
  peq:{label:'Criança pequena',fc:[98,140],fr:[22,37]},
  pre:{label:'Idade pré-escolar',fc:[80,120],fr:[20,28]},
  esc:{label:'Idade escolar',fc:[75,118],fr:[18,25]},
  adol:{label:'Adolescente',fc:[60,100],fr:[12,20]}
};
function makePatient(groups){
  const g=pick(groups), f=chance(.5);
  const p={g,female:f,name:pick(f?NF:NM),o:f?'a':'o',O:f?'A':'O'};
  if(g==='rn'){const d=rnd(6,26);p.years=0;p.ageText=`${d} dias`;p.w=rnd(30,40)/10;}
  else if(g==='lact'){const m=rnd(2,11);p.years=m/12;p.ageText=`${m} meses`;p.w=Math.max(4,Math.round(0.5*m+4+rnd(-1,1)));}
  else{const y=g==='peq'?rnd(1,2):g==='pre'?rnd(3,5):g==='esc'?rnd(6,11):rnd(12,16);
    p.years=y;p.ageText=y===1?'1 ano':`${y} anos`;
    p.w=y<=5?2*y+8+rnd(-1,1):y<=11?3*y+7+rnd(-2,2):rnd(42,62);}
  p.pub=p.years>=12;
  p.hypo=g==='rn'?60:g==='lact'?70:p.years<=10?70+2*p.years:90;
  p.G=GROUPS[g];
  p.infant=(g==='rn'||g==='lact');
  return p;
}
const who = p => `${p.name}, ${p.ageText}, ${nf(p.w)} kg`;
const hi = (p,k,a,b)=> p.G[k][1]+rnd(a,b);      /* acima do normal */
const lo = (p,k,a,b)=> p.G[k][0]-rnd(a,b);      /* abaixo do normal */
const nl = (p,k)=> rnd(p.G[k][0]+4,p.G[k][1]-6); /* normal */
const sysN = p => p.hypo + rnd(18,30);
const bpStr = s => `${s}/${Math.round(s*0.55)}`;
const ratio = p => p.pub ? '30:2 (pós-puberdade, 2 reanimadores)' : '15:2 (pré-puberdade, 2 reanimadores)';
const technique = p => p.infant ? 'Lactente: técnica dos 2 polegares com as mãos a envolver o tórax (ou base de uma mão), ≈4 cm'
  : p.pub ? 'Compressões com 2 mãos, ≈5 cm' : 'Compressões com 1 ou 2 mãos, ≈5 cm';

/* ===================== doses ===================== */
const D={
  adr:w=>({mg:Math.min(.01*w,1),ml:Math.min(.1*w,10)}),
  adrTxt:w=>{const d=D.adr(w);return `${nf(d.mg)} mg EV/IO (${nf(d.ml)} mL da solução 0,1 mg/mL)`;},
  amio:(w,first)=>Math.min(5*w,first?300:150),
  atro:w=>clamp(.02*w,.1,.5),
  ad1:w=>Math.min(.1*w,6), ad2:w=>Math.min(.2*w,12),
  hc:w=>Math.min(2*w,100),
  maint:w=> w<=10?4*w : w<=20? 40+2*(w-10) : 60+(w-20)
};
function adrChoice(p, box, title, sit){
  const w=p.w;
  return ch({box,title,sit,q:'Qual a dose de adrenalina e a via?',
    opts:opts(`${D.adrTxt(w)} — 0,01 mg/kg`,[
      `${nf(Math.min(.1*w,10))} mg EV/IO — 0,1 mg/kg`,
      `${nf(clamp(.02*w,.1,.5))} mg EV/IO — 0,02 mg/kg`,
      `${nf(.001*w)} mg EV/IO — 0,001 mg/kg`]),
    explain:`Adrenalina EV/IO 0,01 mg/kg (0,1 mL/kg da concentração 0,1 mg/mL), dose única máx. 1 mg, a cada 3–5 min. Para ${nf(w)} kg: <b>${D.adrTxt(w)}</b>.`});
}

/* ===================== traçado de ECG ===================== */
function stripPath(type, rate){
  const W=600,H=78,base=48,pps=150,T=W/pps; const comps=[]; let fn=null;
  const g=(t,c,a,s)=>a*Math.exp(-((t-c)**2)/(2*s*s));
  const add=(c,a,s)=>comps.push([c,a,s]);
  const beat=(tb,kind,rr)=>{
    if(kind==='n'){const pt=Math.min(.14,rr*.3),tt=Math.min(.22,rr*.42);add(tb-pt,5,.02);add(tb-.025,-3,.007);add(tb,34,.009);add(tb+.022,-8,.009);add(tb+tt,8,.04);}
    else if(kind==='s'){add(tb,32,.009);add(tb+.02,-7,.009);add(tb+Math.min(.13,rr*.45),6,.03);}
    else if(kind==='v'){add(tb,28,.034);add(tb+.075,-20,.035);add(tb+Math.min(.21,rr*.6),-6,.045);}
    else if(kind==='q'){add(tb,24,.02);add(tb+.04,-6,.02);add(tb+.3,6,.05);}
    else if(kind==='p'){add(tb,5,.02);}
  };
  const run=(r,kind,jit=0)=>{const rr=60/r;let t=R()*rr*.8+.05;while(t<T+.3){beat(t,kind,rr);t+=rr*(1+(R()-.5)*jit);}};
  if(type==='sinus') run(rate,'n',.05);
  else if(type==='svt') run(rate,'s',0);
  else if(type==='vt') run(rate,'v',0);
  else if(type==='pea') run(rate,'q',.02);
  else if(type==='avb'){run(rate,'q',0);run(100,'p',0);}
  else if(type==='vf'){const ph=[R()*6,R()*6,R()*6],fq=[4.6+R(),6.3+R()*1.4,8.5+R()];fn=t=>(9+7*Math.sin(t*1.7+ph[0]))*Math.sin(2*Math.PI*fq[0]*t+ph[1])+5*Math.sin(2*Math.PI*fq[1]*t+ph[2])+3*Math.sin(2*Math.PI*fq[2]*t);}
  else if(type==='asys'){const ph=R()*6;fn=t=>1.2*Math.sin(t*1.3+ph)+0.6*Math.sin(t*7.1)+ (R()-.5)*.8;}
  let d='';
  for(let x=0;x<=W;x+=2){const t=x/pps;let y=0;
    if(fn) y=fn(t); else for(const c of comps){ if(Math.abs(t-c[0])<6*c[2]) y+=g(t,c[0],c[1],c[2]); }
    const yy=clamp(base-y,3,H-3); d+=(x?'L':'M')+x+' '+yy.toFixed(1);}
  return d;
}

/* ===================== Hs e Ts ===================== */
const HT=['Hipovolemia','Hipoxia','Iões de hidrogénio (acidose)','Hipoglicemia','Hipo/hipercaliemia','Hipotermia','Pneumotórax hipertensivo','Tamponamento cardíaco','Tóxicos','Trombose pulmonar','Trombose coronária'];
function htChoice(box, cause, clue){
  const wr=shuffle(HT.filter(h=>h!==cause.ht));
  return ch({box,title:'Causa reversível provável',sit:clue,q:'Qual é a causa reversível (H/T) mais provável neste caso?',
    opts:opts(cause.ht,wr),explain:`<b>${cause.ht}</b> — ${cause.treat}`});
}

/* ===================== 1. ABORDAGEM SISTEMÁTICA ===================== */
const TYPES={vas:'Obstrução da via aérea superior',vai:'Obstrução da via aérea inferior',tp:'Doença do tecido pulmonar',cr:'Alteração do controlo da respiração',
  hipov:'Choque hipovolémico',dist:'Choque distributivo',card:'Choque cardiogénico',obst:'Choque obstrutivo'};
function identChoice(key,note){
  const resp=['vas','vai','tp','cr'],shock=['hipov','dist','card','obst'];
  const pool=resp.includes(key)?resp.concat(pick([['hipov'],['dist']])):shock.concat(pick([['vas'],['tp']]));
  const wr=shuffle(pool.filter(k=>k!==key)).map(k=>TYPES[k]);
  return ch({box:'Caixa 12',title:'Identificar',q:'Com os dados que tens, como classificas o problema (tipo)?',opts:opts(TYPES[key],wr),explain:note});
}
function genSAS(){
  const kind=pick(['paragem','bradi','melhora','grave','ligeiro']);
  let s;
  const P=gs=>makePatient(gs);
  if(kind==='paragem'){
    s=pick([
      ()=>{const p=P(['lact']);return {p,setting:'Urgência pediátrica — porta de entrada',story:`A mãe entra a correr com ${p.name} ao colo: encontrou-${p.o} imóvel no berço ao acordar.`,
        obs:{a:`não reage, hipotónic${p.o}`,b:'sem movimentos respiratórios visíveis',c:'cianose central, pele marmoreada'},c4:'Não respira. Pulso braquial não palpável em 10 s.'};},
      ()=>{const p=P(['peq','pre','esc']);return {p,setting:'Posto de socorro de uma piscina municipal',story:`${p.name} foi retirad${p.o} do fundo da piscina pelo nadador-salvador há 2 minutos.`,
        obs:{a:`flácid${p.o}, não responde`,b:'respiração agónica (gasping) ocasional',c:'cianose, pele fria'},c4:'Apenas gasping ocasional. Pulso carotídeo não palpável em 10 s.'};},
      ()=>{const p=P(['esc','adol']);return {p,setting:'Campo de jogos de uma escola — chegas com a equipa de emergência',story:`${p.name} colapsou subitamente durante um jogo de futebol, sem traumatismo.`,
        obs:{a:`caíd${p.o} no chão, não responde`,b:'sem respiração',c:'palidez acinzentada'},c4:'Não respira. Pulso carotídeo não palpável em 10 s.'};},
      ()=>{const p=P(['lact','peq','pre']);return {p,setting:'Enfermaria de pediatria',story:`A enfermeira chama-te: ${p.name}, internad${p.o} por pneumonia, ficou subitamente acinzentad${p.o} e deixou de reagir.`,
        obs:{a:'não responde a estímulos',b:'gasping',c:'cianose e marmoreado'},c4:`Gasping. Pulso ${p.infant?'braquial':'femoral'} não palpável em 10 s.`};}
    ])();
    s.vit={fc:'—',fr:'—',spo2:'—',pa:'—',tpc:'—'};
  } else if(kind==='bradi'||kind==='melhora'){
    const good=kind==='melhora';
    s=pick([
      ()=>{const p=P(['lact']);return {p,setting:'Enfermaria de pediatria',story:`${p.name}, internad${p.o} por bronquiolite, tem apneias repetidas e o monitor está a alarmar.`,
        obs:{a:`hipotónic${p.o}, reage apenas à dor`,b:'apneias, respiração irregular e superficial',c:'cianose e pele marmoreada'},
        c4:'Respiração irregular e ineficaz, com apneias. Pulso braquial palpável e lento.',vit:{fc:String(rnd(52,58)),fr:String(rnd(4,8)),spo2:String(rnd(68,76)),pa:'—',tpc:'5 s'},
        c6:good?`Após 30 s de ventilação eficaz com O₂ a 100%: <b>FC sobe para ${rnd(145,165)}/min</b>, SpO₂ 94%, recupera tónus.`:`Após 30 s de ventilação eficaz com O₂ a 100% (boa expansão torácica): <b>FC ${rnd(44,52)}/min</b>, TPC 5 s, mantém-se hipotónic${p.o} e marmoread${p.o}.`,
        v6:good?{fc:'155',spo2:'94',tpc:'3 s'}:{fc:'48',spo2:'80',tpc:'5 s'},
        ident:'vai',note:'Bronquiolite = <b>obstrução da via aérea inferior</b>. As apneias e a hipoxemia apontam para <b>insuficiência respiratória</b>: manter O₂/ventilação, aspirar secreções, considerar suporte ventilatório.'};},
      ()=>{const p=P(['peq','pre']);return {p,setting:'Urgência pediátrica',story:`Os pais trazem ${p.name}: encontraram-${p.o} muito sonolent${p.o} junto a um frasco aberto de metadona do avô.`,
        obs:{a:'não responde, pupilas mióticas',b:'bradipneia muito superficial',c:'cianose'},
        c4:'Respiração anormal (4 ciclos/min, superficial). Pulso carotídeo palpável e lento.',vit:{fc:String(rnd(50,58)),fr:'4',spo2:String(rnd(70,80)),pa:'—',tpc:'4 s'},
        c6:good?`Após ventilação adequada com O₂: <b>FC ${rnd(100,115)}/min</b>, SpO₂ 97%, pulsos amplos.`:`Após ventilação adequada com O₂: <b>FC ${rnd(46,54)}/min</b>, pulsos periféricos fracos, extremidades frias.`,
        v6:good?{fc:'108',spo2:'97',tpc:'2 s'}:{fc:'50',spo2:'85',tpc:'5 s'},
        ident:'cr',note:`Depressão respiratória por opioide = <b>alteração do controlo da respiração</b>. Ventilar e considerar naloxona 0,1 mg/kg (máx. 2 mg): <b>${nf(Math.min(.1*p.w,2))} mg</b>.`};},
      ()=>{const p=P(['peq','pre','esc']);return {p,setting:'Urgência pediátrica',story:`${p.name} teve uma convulsão tónico-clónica de 25 min que parou após diazepam retal; agora respira mal.`,
        obs:{a:'não responde (estado pós-crítico)',b:'respiração lenta e superficial, com roncos',c:'cianose ligeira'},
        c4:`Respiração anormal e ineficaz. Pulso carotídeo palpável${good?'':' e lento'}.`,vit:{fc:good?String(rnd(88,100)):String(rnd(48,56)),fr:'6',spo2:String(rnd(80,86)),pa:'—',tpc:'3 s'},
        c6:good?`Com via aérea permeabilizada e ventilação: <b>FC ${rnd(105,120)}/min</b>, SpO₂ 96%.`:`Com via aérea permeabilizada e ventilação eficaz: <b>FC ${rnd(46,54)}/min</b>, TPC 5 s, hipotensão.`,
        v6:good?{fc:'112',spo2:'96'}:{fc:'50',spo2:'88',tpc:'5 s'},
        ident:'cr',note:'Hipoventilação após convulsão/benzodiazepina = <b>alteração do controlo da respiração</b>. Manter via aérea, ventilar se necessário, medir glicemia, tratar a causa.'};}
    ])();
  } else if(kind==='grave'){
    s=pick([
      ()=>{const p=P(['esc','adol']);return {p,setting:'Urgência pediátrica',story:`${p.name}, asmátic${p.o}, tem falta de ar crescente desde ontem; o inalador não está a ajudar.`,
        obs:{a:`acordad${p.o} e ansios${p.o}, sentad${p.o} inclinad${p.o} para a frente, só diz palavras soltas`,b:'tiragem supraesternal e intercostal, sibilos, expiração prolongada',c:'palidez'},
        vit:{fc:String(hi(p,'fc',20,35)),fr:String(hi(p,'fr',16,22)),spo2:String(rnd(85,89)),pa:bpStr(sysN(p)),tpc:'2 s'},
        ident:'vai',note:'Asma = <b>obstrução da via aérea inferior</b>, aqui com sinais de gravidade: O₂, salbutamol + ipratrópio, corticoide sistémico; considerar sulfato de magnésio.'};},
      ()=>{const p=P(['lact','peq','pre']);return {p,setting:'Urgência pediátrica',story:`${p.name} tem vómitos e diarreia há 3 dias e não urina há 12 horas.`,
        obs:{a:`sonolent${p.o}, mas abre os olhos e chora quando estimulad${p.o}`,b:'taquipneia sem esforço (respiração tranquila)',c:`pálid${p.o}, extremidades frias, marmoreado`},
        vit:{fc:String(hi(p,'fc',25,40)),fr:String(hi(p,'fr',4,8)),spo2:'98',pa:bpStr(sysN(p)),tpc:'4 s',temp:'37,4'},
        ident:'hipov',note:`<b>Choque hipovolémico compensado</b> (PA sistólica ainda ≥${p.hypo} mmHg). Acesso EV/IO e bólus de cristaloide isotónico 20 mL/kg = <b>${nf(20*p.w)} mL</b>, reavaliar após cada bólus; glicemia.`};},
      ()=>{const p=P(['esc','adol']);const s=p.hypo-rnd(8,14);return {p,setting:'Urgência pediátrica',story:`${p.name} comeu bolo com amendoim numa festa; 10 minutos depois tem os lábios inchados e dificuldade em respirar.`,
        obs:{a:`acordad${p.o}, muito ansios${p.o}`,b:'estridor, rouquidão, tiragem',c:'urticária generalizada, rubor'},
        vit:{fc:String(hi(p,'fc',30,45)),fr:String(hi(p,'fr',8,14)),spo2:String(rnd(90,93)),pa:bpStr(s),tpc:'3 s'},
        ident:'dist',note:`Anafilaxia: <b>choque distributivo hipotensivo</b> (PAS ${s} < ${p.hypo}) com obstrução da via aérea superior. Adrenalina IM 0,01 mg/kg (máx. 0,3 mg) = <b>${nf(Math.min(.01*p.w,.3))} mg</b> já; O₂, fluidos.`};},
      ()=>{const p=P(['peq','pre']);return {p,setting:'Urgência pediátrica, de madrugada',story:`${p.name} acordou com tosse ladrante; agora tem estridor mesmo em repouso.`,
        obs:{a:`agitad${p.o}, mas reconhece a mãe`,b:'estridor inspiratório em repouso, tiragem marcada, adejo nasal',c:'cor rosada'},
        vit:{fc:String(hi(p,'fc',15,30)),fr:String(hi(p,'fr',6,12)),spo2:String(rnd(92,95)),pa:bpStr(sysN(p)),tpc:'2 s',temp:'38,1'},
        ident:'vas',note:`Laringite = <b>obstrução da via aérea superior</b> com dificuldade respiratória grave: O₂, adrenalina nebulizada, dexametasona 0,6 mg/kg (máx. 16 mg) = <b>${nf(Math.min(.6*p.w,16))} mg</b>.`};},
      ()=>{const p=P(['lact','peq','pre']);return {p,setting:'Urgência pediátrica',story:`${p.name} tem febre há 4 dias, tosse e, desde hoje, gemido.`,
        obs:{a:`prostrad${p.o}, mas reage`,b:'gemido expiratório, adejo nasal, tiragem, crepitações à direita',c:'palidez, cianose peribucal'},
        vit:{fc:String(hi(p,'fc',15,30)),fr:String(hi(p,'fr',12,20)),spo2:String(rnd(84,88)),pa:bpStr(sysN(p)),tpc:'2 s',temp:'39,2'},
        ident:'tp',note:'Pneumonia com gemido e hipoxemia = <b>doença do tecido pulmonar</b>. O₂ (alto débito), considerar CPAP/ventilação, antibiótico.'};}
    ])();
  } else {
    s=pick([
      ()=>{const p=P(['peq','pre']);return {p,setting:'Consulta de urgência',story:`${p.name} tem tosse ladrante desde ontem à noite.`,
        obs:{a:`atent${p.o}, a brincar`,b:'tosse ladrante; estridor só quando chora; sem tiragem em repouso',c:'cor normal'},
        vit:{fc:String(nl(p,'fc')),fr:String(nl(p,'fr')),spo2:'98',pa:bpStr(sysN(p)),tpc:'2 s',temp:'37,9'},
        ident:'vas',note:`Laringite ligeira = <b>obstrução da via aérea superior</b> com dificuldade respiratória ligeira: dexametasona 0,6 mg/kg = <b>${nf(Math.min(.6*p.w,16))} mg</b> PO, manter a criança calma.`};},
      ()=>{const p=P(['lact']);return {p,setting:'Consulta de urgência',story:`${p.name} tem rinorreia e tosse há 2 dias; continua a mamar bem.`,
        obs:{a:`ativ${p.o}, sorri`,b:'tiragem subcostal ligeira, sibilos dispersos',c:`rosad${p.o}`},
        vit:{fc:String(nl(p,'fc')+10),fr:String(p.G.fr[1]-2),spo2:'95',pa:'—',tpc:'2 s',temp:'37,8'},
        ident:'vai',note:'Bronquiolite ligeira = <b>obstrução da via aérea inferior</b>, dificuldade respiratória ligeira: aspiração nasal, vigiar alimentação e SpO₂.'};},
      ()=>{const p=P(['pre','esc']);return {p,setting:'Consulta de urgência',story:`${p.name} tem febre e tosse há 2 dias.`,
        obs:{a:`atent${p.o}, conversa`,b:'taquipneia ligeira, crepitações na base esquerda, sem tiragem',c:'cor normal'},
        vit:{fc:String(p.G.fc[1]+rnd(2,10)),fr:String(p.G.fr[1]+rnd(2,5)),spo2:'95',pa:bpStr(sysN(p)),tpc:'2 s',temp:'38,7'},
        ident:'tp',note:'Pneumonia sem sinais de gravidade = <b>doença do tecido pulmonar</b>, dificuldade respiratória ligeira.'};}
    ])();
  }
  const p=s.p, steps=[];
  steps.push(act({box:'Caixa 1',title:'Avaliação inicial',q:'Chegas junto da criança. O que avalias nos primeiros segundos e o que observas?',
    items:[`Aspeto: ${s.obs.a}`,`Trabalho respiratório: ${s.obs.b}`,`Circulação (cor da pele): ${s.obs.c}`],note:'Avaliação inicial = aspeto, trabalho respiratório e circulação (cor), sem tocar na criança.'}));
  const resp = (kind==='paragem'||kind==='bradi'||kind==='melhora');
  steps.push(ch({box:'Caixa 2',title:'Não responde ou precisa de intervenção imediata?',q:'A criança não responde ou é necessária intervenção imediata?',keep:true,
    opts:[{t:'Sim',ok:resp},{t:'Não',ok:!resp}],
    explain:resp?'Não responde → pedir ajuda e ativar o sistema de emergência (Caixa 3), depois avaliar respiração e pulso (Caixa 4).':'Responde e não precisa de manobras emergentes → avaliar se há compromisso grave da via aérea, ventilação ou perfusão (Caixa 10).'}));
  if(resp){
    steps.push(act({box:'Caixa 3',title:'Pedir ajuda',q:'O que fazes a seguir?',items:['Pedir ajuda a quem esteja por perto','Ativar o sistema de emergência (equipa de emergência intra-hospitalar / 112, conforme o contexto)','Pedir o carro de emergência e o desfibrilhador/DAE']}));
    const c4key=kind==='paragem'?'np':'p';
    steps.push(ch({box:'Caixa 4',title:'Respira e tem pulso?',sit:s.c4,q:'Avalias respiração e pulso em simultâneo (≤10 s). O que concluis?',keep:true,
      opts:[{t:'Respira normalmente e tem pulso',ok:false},{t:'Respiração anormal (ou só gasping) e sem pulso',ok:c4key==='np'},{t:'Respiração anormal, mas com pulso palpável',ok:c4key==='p'}],
      explain:c4key==='np'?'Sem pulso e sem respiração normal (o gasping não conta) → iniciar RCP (Caixa 7).':'Respiração inadequada com pulso → manter via aérea, ventilar e dar O₂ (Caixa 5).',vit:s.vit}));
    if(kind!=='paragem'){
      steps.push(act({box:'Caixa 5',title:'Via aérea e ventilação',q:'Tem pulso mas não respira adequadamente. O que fazes?',items:[
        'Manter a via aérea permeável (posicionar; elevação do mento ou subluxação da mandíbula; aspirar se necessário)',
        'Ventilar com insuflador manual e máscara: 1 ventilação a cada 2–3 s (20–30/min)','Administrar O₂ (100%)','Monitorizar pulso e oximetria (monitor cardiorrespiratório)']}));
      const yes=kind==='bradi';
      steps.push(ch({box:'Caixa 6',title:'FC < 60/min com compromisso?',sit:s.c6,v:s.v6,q:'O pulso é <60/min com compromisso cardiorrespiratório, apesar de oxigenação e ventilação adequadas?',keep:true,
        opts:[{t:'Sim',ok:yes},{t:'Não',ok:!yes}],explain:yes?'FC <60/min com má perfusão apesar de ventilação eficaz → iniciar RCP (Caixa 7).':'A FC recuperou com a ventilação → avaliar, identificar e intervir (Caixa 12).'}));
    }
    if(kind==='paragem'||kind==='bradi'){
      steps.push(act({box:'Caixa 7',title:'Iniciar RCP',q:'O que fazes agora? Sê específico na técnica.',items:[
        'Iniciar RCP pela sequência C-A-B (compressões → via aérea → ventilação)','Compressões: ≥1/3 do diâmetro AP, 100–120/min, reexpansão completa, mínimas interrupções',
        technique(p),`Relação compressões:ventilações ${ratio(p)}`,'Aplicar monitor/desfibrilhador logo que disponível']}));
      steps.push(ch({box:'Caixa 8',title:'Que algoritmo segue',q:'Iniciada a RCP, que algoritmo passas a seguir?',
        opts:opts('Algoritmo de Paragem Cardiorrespiratória Pediátrica',['Algoritmo de Bradicardia Pediátrica com Pulso','Algoritmo de Taquiarritmia com Pulso','Algoritmo de Abordagem Cardiovascular Após RCE']),
        explain:'Em RCP → Algoritmo de PCR pediátrica (ritmo desfibrilhável ou não). Treina-o no módulo "Paragem Cardiorrespiratória".'}));
      return {p,setting:s.setting,story:s.story,vit:{},steps};
    }
  } else {
    const yes=kind==='grave';
    steps.push(ch({box:'Caixa 10',title:'Compromisso grave?',sit:'Avaliação primária rápida — ver sinais vitais no monitor.',vit:s.vit,q:'Há compromisso grave da via aérea, da ventilação ou da perfusão?',keep:true,
      opts:[{t:'Sim',ok:yes},{t:'Não',ok:!yes}],explain:yes?'Sim → suportar A-B-C, O₂, monitorizar (Caixa 11) e depois avaliar-identificar-intervir.':'Não → seguir para a sequência avaliar-identificar-intervir (Caixa 12).'}));
    if(yes) steps.push(act({box:'Caixa 11',title:'Suportar A-B-C',q:'O que fazes de imediato?',items:['Suportar o A-B-C (via aérea, ventilação, circulação)','Administrar O₂ se necessário','Monitorizar pulso e oximetria']}));
  }
  steps.push(act({box:'Caixa 12',title:'Avaliar → identificar → intervir',q:'Agora, como continuas a abordagem?',items:[
    'Avaliar: avaliação primária ABCDE (com sinais vitais, SpO₂, glicemia)','Avaliação secundária: história SAMPLE e exame físico focado',
    'Identificar o tipo e a gravidade do problema','Intervir e reavaliar — repetir avaliar-identificar-intervir','Se em qualquer momento houver PCR → iniciar RCP (Caixa 7)']}));
  steps.push(identChoice(s.ident,s.note));
  return {p,setting:s.setting,story:s.story,vit:{},steps};
}

/* ===================== 2. PARAGEM CARDIORRESPIRATÓRIA ===================== */
function genPCR(){
  const causes=[
    {g:['lact','peq','pre','esc'],sb:.15,story:p=>`${p.name} foi retirad${p.o} de um lago gelado após vários minutos submers${p.o}. Chega à sala de reanimação em RCP.`,ht:'Hipoxia',treat:'ventilação e oxigenação eficazes (via aérea avançada). Medir a temperatura central — a hipotermia também é provável: reaquecer.',clue:'Afogamento em água fria; temperatura timpânica 31 °C.'},
    {g:['esc','adol'],sb:.6,story:p=>`${p.name}, com insuficiência renal crónica, faltou a duas sessões de diálise. Colapsa na sala de espera.`,ht:'Hipo/hipercaliemia',treat:p=>`hipercaliemia: cloreto de cálcio 10% 20 mg/kg (0,2 mL/kg) = ${nf(.2*p.w)} mL EV/IO lento, bicarbonato de sódio 1 mEq/kg = ${nf(p.w)} mEq, salbutamol; dextrose + insulina.`,clue:'ECG prévio com ondas T apiculadas; potássio por gasimetria 8,1 mmol/L.'},
    {g:['peq','pre','adol'],sb:.55,story:p=>`${p.name} terá ingerido comprimidos de amitriptilina de um familiar. Convulsionou e entrou em paragem na urgência.`,ht:'Tóxicos',treat:p=>`antidepressivo tricíclico (bloqueio dos canais de sódio): bicarbonato de sódio 1–2 mEq/kg EV/IO = ${nf(p.w)}–${nf(2*p.w)} mEq, até pH >7,45; contactar o CIAV.`,clue:'Blister vazio de amitriptilina no bolso; QRS largo antes da paragem.'},
    {g:['esc','adol','pre'],sb:0,story:p=>`${p.name} foi atropelad${p.o} e chega entubad${p.o}. Durante a ventilação, a SpO₂ cai e entra em paragem.`,ht:'Pneumotórax hipertensivo',treat:'descompressão imediata com agulha, seguida de dreno torácico.',clue:'Murmúrio vesicular abolido à direita, desvio da traqueia para a esquerda, distensão jugular.'},
    {g:['lact','peq'],sb:.05,story:p=>`${p.name} tem gastroenterite há 4 dias, chega muito prostrad${p.o}, marmoread${p.o}, e entra em paragem na triagem.`,ht:'Hipovolemia',treat:p=>`bólus de cristaloide isotónico 20 mL/kg = ${nf(20*p.w)} mL EV/IO rápido; corrigir acidose e glicemia.`,clue:'Mucosas secas, olhos encovados, sem diurese há 18 h.'},
    {g:['lact','peq','pre'],sb:0,story:p=>`${p.name} foi operad${p.o} a uma cardiopatia congénita há 2 dias. Na UCI, a PA desce progressivamente e entra em paragem.`,ht:'Tamponamento cardíaco',treat:'pericardiocentese urgente (e contactar cirurgia cardíaca).',clue:'Drenos mediastínicos deixaram de drenar; sons cardíacos abafados, jugulares distendidas.'},
    {g:['lact'],sb:.03,story:p=>`${p.name} foi encontrad${p.o} pela mãe em apneia no berço e trazid${p.o} em RCP pela VMER.`,ht:'Hipoxia',treat:'ventilação eficaz com O₂ a 100%, considerar via aérea avançada; confirmar expansão torácica.',clue:'Encontrad${o} de bruços, com secreções na boca; sem trauma.'},
    {g:['lact','peq'],sb:.03,story:p=>`${p.name}, com doença metabólica conhecida, está em jejum há 20 h por vómitos. Fica hipotónic${p.o} e entra em paragem.`,ht:'Hipoglicemia',treat:p=>`dextrose 0,5–1 g/kg EV/IO (D10W 5–10 mL/kg = ${nf(5*p.w)}–${nf(10*p.w)} mL).`,clue:'Glicemia capilar: 22 mg/dL.'},
    {g:['adol'],sb:.15,story:p=>`${p.name}, sob contracetivo oral e imobilizad${p.o} por fratura da tíbia, refere dor torácica e dispneia súbitas e colapsa.`,ht:'Trombose pulmonar',treat:'considerar trombólise / anticoagulação; contactar consulta especializada.',clue:'Gesso na perna há 3 semanas; taquicardia e hipoxemia súbitas antes do colapso.'}
  ];
  const c=pick(causes); const p=makePatient(c.g);
  const treat=typeof c.treat==='function'?c.treat(p):c.treat;
  const cause={ht:c.ht,treat}; const clue=c.clue.replace('${o}',p.o);
  const init = chance(c.sb) ? pick(['vf','vf','tvsp']) : pick(['asys','aesp']);
  const isSh = r => r==='vf'||r==='tvsp';
  const rhy = {vf:{type:'vf',rate:0,desc:'Ondulações caóticas e irregulares, sem complexos QRS identificáveis.'},
    tvsp:{type:'vt',rate:rnd(180,230),desc:'Complexos QRS largos, regulares e rápidos. Sem pulso palpável.'},
    asys:{type:'asys',rate:0,desc:'Linha praticamente isoelétrica. Confirmas elétrodos ligados e ganho adequado.'},
    aesp:{type:'pea',rate:rnd(32,46),desc:'Ritmo organizado com complexos lentos, mas sem pulso palpável.'},
    rosc:{type:'sinus',rate:p.infant?rnd(140,165):rnd(105,130),desc:'Ritmo organizado, regular, complexos estreitos.'}};
  const steps=[]; let shocks=0, adrs=0, amios=0, htDone=false, access=false;
  const arrestV={fc:'Sem pulso',fr:'—',spo2:'—',pa:'—',tpc:'—'};
  steps.push(act({box:'Caixa 1',title:'Iniciar RCP',q:'Confirmas paragem cardiorrespiratória. O que fazes de imediato?',vit:arrestV,items:[
    'Iniciar RCP de alta qualidade: ≥1/3 do diâmetro AP, 100–120/min, reexpansão completa, minimizar interrupções',technique(p),`Relação ${ratio(p)}`,
    'Ventilar com insuflador manual e máscara, com O₂','Aplicar monitor/desfibrilhador']}));
  const check=(r,from)=>{const o=rhy[r];return ch({box:from,title:'Ritmo desfibrilhável?',sit:`<b>Análise do ritmo (pausa &lt;10 s):</b> ${o.desc}`,rhythm:{type:o.type,rate:o.rate},
    q:'O ritmo é desfibrilhável?',keep:true,opts:[{t:'Sim — desfibrilhável (FV / TV sem pulso)',ok:isSh(r)},{t:'Não — não desfibrilhável (assistolia / AESP)',ok:!isSh(r)}],
    explain:isSh(r)?`${r==='vf'?'Fibrilhação ventricular':'TV sem pulso'} → choque o mais rapidamente possível.`:(r==='rosc'?'Ritmo organizado → não é desfibrilhável. Verificar se há sinais de RCE.':(r==='asys'?'Assistolia':'AESP')+' → não desfibrilhável.')});};
  const shockStep=(box)=>{shocks++;const w=p.w;let right,wr,title;
    if(shocks===1){title='1.º choque';right=`${nf(2*w)} J — 2 J/kg`;wr=[`${nf(4*w)} J — 4 J/kg`,`${nf(.5*w)} J — 0,5 J/kg`,`${nf(10*w)} J — 10 J/kg`];}
    else if(shocks===2){title='2.º choque';right=`${nf(4*w)} J — 4 J/kg`;wr=[`${nf(2*w)} J — 2 J/kg (repetir)`,`${nf(w)} J — 1 J/kg`,`${nf(.5*w)} J sincronizado — 0,5 J/kg`];}
    else {title=`${shocks}.º choque`;right=`≥${nf(4*w)} J — ≥4 J/kg (máx. 10 J/kg ou dose de adulto)`;wr=[`${nf(2*w)} J — 2 J/kg`,`${nf(w)} J sincronizado — 1 J/kg`,'Não chocar — dar apenas adrenalina'];}
    return ch({box,title,q:'Que energia usas no choque?',opts:opts(right,wr),
      explain:`Energias: 1.º choque 2 J/kg, 2.º 4 J/kg, seguintes ≥4 J/kg (máx. 10 J/kg ou dose de adulto). Retomar compressões <b>imediatamente</b> após o choque, sem verificar pulso.`});};
  const steps2=[];
  if(isSh(init)){
    steps.push(check(init,'Caixa 1'));
    steps.push(shockStep('Caixa 3'));
    steps.push(act({box:'Caixa 4',title:'RCP 2 min + acesso',q:'Choque administrado. O que fazes durante os próximos 2 minutos?',items:['Retomar RCP de imediato, durante 2 minutos','Obter acesso EV ou IO','Trocar o compressor a cada 2 min','Preparar adrenalina para o próximo ciclo']}));
    access=true;
  } else {
    steps.push(check(init,'Caixa 1'));
    steps.push(adrChoice(p,'Caixa 9','Adrenalina o mais cedo possível',`${init==='asys'?'Assistolia':'AESP'}. O colega coloca uma agulha IO.`)); adrs++; access=true;
    steps.push(act({box:'Caixa 10',title:'RCP 2 min + adrenalina',q:'O que fazes durante este ciclo de 2 minutos?',items:['RCP durante 2 minutos','Acesso EV ou IO (se ainda não houver)','Adrenalina a cada 3–5 min','Considerar via aérea avançada e capnografia (EtCO₂)']}));
  }
  let after = isSh(init)?'C4':'C10'; let rhythm=init; let checks=0; const target=rnd(3,4);
  while(true){
    checks++;
    const nonNext = after==='C10' ? 'C11' : 'C12';
    let r;
    if(checks>=target && nonNext==='C12') r='rosc';
    else if(checks>=6) r='aesp';
    else if(isSh(rhythm)) r = chance(.6)?rhythm:pick(['asys','aesp']);
    else r = chance(.3)?'vf':pick(['asys','aesp']);
    rhythm=r;
    const fromBox={C4:'Caixa 4',C6:'Caixa 6',C8:'Caixa 8',C10:'Caixa 10',C11:'Caixa 11'}[after];
    steps.push(check(r,fromBox));
    if(isSh(r)){
      if(after==='C6'){
        steps.push(shockStep('Caixa 7'));
        let given=false;
        if(amios<3){
          const first=amios===0; amios++; given=true;
          if(first) steps.push(ch({box:'Caixa 8',title:'Antiarrítmico',q:'FV/TVsp refratária após 3 choques. Que fármaco e dose administras?',
            opts:opts(`Amiodarona ${nf(D.amio(p.w,true))} mg EV/IO em bólus — 5 mg/kg`,[`Amiodarona ${nf(Math.min(5*p.w,300))} mg em perfusão de 20–60 min`,`Amiodarona ${nf(p.w)} mg — 1 mg/kg`,`Atropina ${nf(D.atro(p.w))} mg — 0,02 mg/kg`]),
            explain:`Amiodarona 5 mg/kg em bólus (máx. 300 mg), até 3 doses (máx. 150 mg nas seguintes) <b>ou</b> lidocaína 1 mg/kg = ${nf(p.w)} mg. A perfusão de 20–60 min é para TV <i>com pulso</i>.`}));
        }
        steps.push(act({box:'Caixa 8',title:'RCP 2 min + antiarrítmico',q:'O que fazes neste ciclo de 2 minutos?',items:['RCP durante 2 minutos',
          given ? `Amiodarona ${nf(D.amio(p.w,amios===1))} mg EV/IO (${amios}.ª dose) ou lidocaína ${nf(p.w)} mg` : 'Amiodarona: já foram dadas 3 doses — manter RCP e tratar causas',
          'Tratar as causas reversíveis (Hs e Ts)','Continuar adrenalina a cada 3–5 min (alterna com os choques)']}));
        if(!htDone && cause.ht){htDone=true;steps.push(htChoice('Caixa 8',cause,clue));}
        after='C8';
      } else {
        steps.push(shockStep('Caixa 5'));
        if(adrs===0){ steps.push(adrChoice(p,'Caixa 6','1.ª dose de adrenalina','Choque administrado, compressões retomadas. Tens acesso IO.')); }
        adrs++;
        steps.push(act({box:'Caixa 6',title:'RCP 2 min + adrenalina',q:'O que fazes neste ciclo de 2 minutos?',items:['RCP durante 2 minutos',`Adrenalina ${D.adrTxt(p.w)} a cada 3–5 min`,'Considerar via aérea avançada (TET ou supraglótico) e capnografia','Com via aérea avançada: compressões contínuas e 1 ventilação a cada 2–3 s']}));
        after='C6';
      }
    } else {
      if(after==='C10'){
        steps.push(act({box:'Caixa 11',title:'RCP 2 min + causas reversíveis',q:'Mantém-se ritmo não desfibrilhável. O que fazes?',items:['RCP durante 2 minutos','Tratar as causas reversíveis (Hs e Ts)','Continuar adrenalina a cada 3–5 min','Monitorizar a qualidade da RCP com EtCO₂']}));
        if(!htDone && cause.ht){htDone=true;steps.push(htChoice('Caixa 11',cause,clue));}
        after='C11';
      } else {
        const rosc=r==='rosc';
        const sit = rosc ? `Pulso femoral palpável; EtCO₂ subiu abruptamente de ${rnd(12,18)} para ${rnd(38,45)} mmHg.` : (r==='asys'?'Sem pulso; EtCO₂ 9 mmHg.':`Sem pulso palpável; EtCO₂ ${rnd(10,16)} mmHg.`);
        steps.push(ch({box:'Caixa 12',title:'Sinais de RCE?',sit,q:'Há sinais de retorno da circulação espontânea (RCE)?',keep:true,
          opts:[{t:'Sim — RCE',ok:rosc},{t:'Não — continuar RCP',ok:!rosc}],
          explain:rosc?'RCE → cuidados pós-paragem.':'Sem RCE → Caixa 10: RCP 2 min, adrenalina a cada 3–5 min, via aérea avançada.',
          vit: rosc?{fc:String(rhy.rosc.rate),pa:bpStr(p.hypo+rnd(-6,12)),spo2:'92',etco2:'40',fr:'Vent.'}:null}));
        if(rosc){
          steps.push(act({box:'RCE',title:'Cuidados pós-paragem',q:'Tens RCE. Quais são as prioridades a seguir?',items:['SpO₂ 94–99% (titular FiO₂) e PaCO₂ adequada, evitando hiper/hipocapnia graves',
            'PA sistólica e média > percentil 10 para a idade (fluidos ± inotrópicos/vasopressores)','Medir glicemia e evitar hipoglicemia; corrigir eletrólitos',
            'Controlo direcionado da temperatura; prevenir/tratar febre','Monitorizar ECG, EEG se possível; tratar convulsões; sedação/analgesia',
            'Seguir o Algoritmo de Abordagem Cardiovascular Após RCE']}));
          break;
        }
        adrs++;
        steps.push(act({box:'Caixa 10',title:'RCP 2 min + adrenalina',q:'Sem RCE. O que fazes neste ciclo?',items:['RCP durante 2 minutos','Acesso EV/IO (confirmar funcionante)',`Adrenalina ${D.adrTxt(p.w)} a cada 3–5 min`,'Considerar via aérea avançada e capnografia']}));
        after='C10';
      }
    }
  }
  return {p,setting:'Sala de reanimação — equipa de 4 elementos',story:c.story(p),vit:arrestV,steps};
}

/* ===================== 3. BRADICARDIA ===================== */
const BCAUSES=['Hipotermia','Hipoxia','Tóxicos/medicamentos','Aumento da pressão intracraniana','Aumento do tónus vagal','Bloqueio cardíaco','Fisiológica/adequada'];
function genBradi(){
  const cs=[
    {k:'Hipoxia',g:['lact','peq'],atro:false,story:p=>`${p.name} tem bronquiolite grave; está cada vez mais cansad${p.o} e o monitor mostra a FC a descer.`,sit:'SpO₂ baixa, tiragem marcada com respiração agora superficial.',treat:'oxigenação e ventilação eficazes — é a causa mais frequente de bradicardia em pediatria.',spo2:()=>rnd(70,80),improve:.75},
    {k:'Aumento do tónus vagal',g:['lact','peq'],atro:true,story:p=>`Durante a aspiração orofaríngea de ${p.name} (internad${p.o} por pneumonia), a FC cai subitamente.`,sit:'A bradicardia surgiu durante a aspiração; SpO₂ mantida.',treat:'parar o estímulo vagal (aspiração); atropina se persistir.',spo2:()=>rnd(93,96),improve:.5},
    {k:'Bloqueio cardíaco',g:['lact','peq','pre','esc'],atro:true,story:p=>`${p.name} foi operad${p.o} a um defeito do septo ventricular há 3 dias e está mais cansad${p.o} do que o habitual.`,sit:'Monitor: ondas P regulares, dissociadas de complexos QRS mais lentos (bloqueio AV completo).',treat:'pacing transtorácico/transvenoso; a atropina pode ajudar; consulta de cardiologia.',spo2:()=>rnd(94,97),improve:.3,strip:'avb'},
    {k:'Tóxicos/medicamentos',g:['peq','pre'],atro:false,story:p=>`${p.name} terá ingerido comprimidos de propranolol da avó há 1 hora.`,sit:'Blister vazio de propranolol; glicemia 58 mg/dL.',treat:'tratar a intoxicação (betabloqueante): contactar o CIAV para antídoto específico; adrenalina; tratar a hipoglicemia.',spo2:()=>rnd(94,97),improve:.4},
    {k:'Hipotermia',g:['esc','pre'],atro:false,story:p=>`${p.name} perdeu-se num passeio na serra e foi encontrad${p.o} ao fim de 6 horas, com roupa molhada.`,sit:'Temperatura central 30,8 °C; pele gelada.',treat:'reaquecimento ativo; manipular com cuidado (risco de FV).',spo2:()=>rnd(90,94),improve:.4,temp:'30,8'},
    {k:'Aumento da pressão intracraniana',g:['esc','pre','adol'],atro:false,story:p=>`${p.name} caiu de bicicleta sem capacete há 2 horas; vomitou e está cada vez mais sonolent${p.o}.`,sit:'Hipertensão arterial, bradicardia e respiração irregular (tríade de Cushing); pupila direita dilatada.',treat:'tratar a hipertensão intracraniana (ventilação adequada, cabeceira elevada, solução hipertónica) e TAC/neurocirurgia urgente.',spo2:()=>rnd(93,97),improve:.3,ht:true}
  ];
  const fisio=chance(.15);
  let c,p;
  if(fisio){ p=makePatient(['adol']); c={k:'Fisiológica/adequada',atro:false,story:p=>`${p.name}, atleta federad${p.o} de atletismo, veio por entorse do tornozelo. Na triagem, FC 46/min.`,sit:'Assintomátic${o}, bem perfundid${o}, PA normal; ECG: ritmo sinusal.',treat:'bradicardia sinusal fisiológica de atleta — sem tratamento.',spo2:()=>99,improve:1}; }
  else { c=pick(cs); p=makePatient(c.g); }
  const steps=[]; const sitC=c.sit.replace(/\$\{o\}/g,p.o);
  const comp = !fisio && !( (c.k==='Bloqueio cardíaco'||c.k==='Tóxicos/medicamentos') && chance(.3) );
  let hr = fisio?46 : comp ? (chance(.7)?rnd(38,56):rnd(62,70)) : (p.infant?rnd(72,85):rnd(48,55));
  const sys = c.ht ? p.hypo+rnd(45,60) : comp ? p.hypo-rnd(6,14) : sysN(p);
  const vit={fc:String(hr),fr:fisio?'14':String(comp?lo(p,'fr',0,4):nl(p,'fr')),spo2:String(c.spo2()),pa:bpStr(sys),tpc:comp?'5 s':'2 s',temp:c.temp||'36,6'};
  const rh={type:c.strip||'sinus',rate:hr};
  const site=p.infant?'braquial':'carotídeo/femoral';
  steps.push(ch({box:'Caixa 1',title:'Confirmar pulso',vit,rhythm:rh,sit:`Monitor com FC ${hr}/min. Palpas o pulso ${site} (≤10 s): <b>pulso palpável, lento</b>.`,
    q:'Antes de tudo: a criança tem pulso? Que algoritmo segues?',keep:true,
    opts:[{t:'Tem pulso → Algoritmo de Bradicardia com Pulso',ok:true},{t:'Sem pulso → Algoritmo de PCR',ok:false}],
    explain:'O primeiro passo é confirmar que há pulso: com pulso segue-se o algoritmo de bradicardia; sem pulso, o de PCR. A palpação do pulso repete-se a cada 2 minutos enquanto a bradicardia persistir.'}));
  steps.push(act({box:'Caixa 1',title:'Avaliação inicial',q:'Bradicardia com pulso. Que avaliação inicial fazes?',items:['Avaliação inicial e ABCDE','Avaliar sinais de compromisso: estado mental, perfusão (pulsos, TPC, pele), PA','Monitor cardiorrespiratório, oximetria e PA']}));
  const mental = comp ? (c.ht?`Abre os olhos apenas à dor (alteração aguda do estado mental).`:`Prostrad${p.o}, reage pouco; pulsos periféricos fracos, extremidades frias.`) : (fisio?'Conversa normalmente, pulsos amplos.':`Acordad${p.o} e interativ${p.o}; pulsos periféricos bons, extremidades quentes.`);
  steps.push(ch({box:'Caixa 2',title:'Compromisso cardiorrespiratório?',sit:`${sitC} ${mental}`,q:'Há compromisso cardiorrespiratório (alteração aguda do estado mental, sinais de choque ou hipotensão)?',keep:true,
    opts:[{t:'Sim',ok:comp},{t:'Não',ok:!comp}],explain:comp?`Sim${sys<p.hypo?` — PAS ${sys} < ${p.hypo} mmHg (hipotensão para a idade)`:''} → avaliação e suporte (Caixa 3).`:'Sem compromisso → suportar ABC, considerar O₂ e ECG de 12 derivações, observar e tratar a causa (Caixa 9).'}));
  const c9=()=>act({box:'Caixa 9',title:'Suporte e observação',q:'Que medidas tomas agora?',items:['Identificar e tratar as causas subjacentes','Suportar o ABC','Considerar O₂','Considerar ECG de 12 derivações','Observar (vigilância e reavaliação)']});
  const causeQ=box=>ch({box,title:'Causa provável',q:'Qual é a causa mais provável desta bradicardia?',opts:opts(c.k,shuffle(BCAUSES.filter(x=>x!==c.k))),explain:`<b>${c.k}</b>: ${c.treat}`});
  if(!comp){ steps.push(c9()); steps.push(causeQ('Caixa 9')); return {p,setting:fisio?'Triagem da urgência':'Urgência pediátrica',story:c.story(p),vit,rhythm:rh,steps}; }
  steps.push(act({box:'Caixa 3',title:'Avaliação e suporte',q:'Há compromisso. O que fazes primeiro?',items:['Manter a via aérea permeável e administrar O₂','Assistir a ventilação com pressão positiva, se necessário','Aplicar monitor cardiorrespiratório','Monitorizar o pulso']}));
  /* quantos ciclos de 2 min a bradicardia persiste antes do desfecho */
  const early = chance(c.improve);              /* melhora logo com O2/ventilação */
  const cycles = early ? 0 : rnd(1,3);
  const ending = early ? 'melhora' : (chance(.3) ? 'perde' : 'melhora');
  let atroGiven=0;
  for(let i=1;i<=cycles;i++){
    const nhr = chance(.7)?rnd(38,55):rnd(61,68);
    const sit4 = i===1 ? `Apesar de oxigenação e ventilação eficazes: <b>FC ${nhr}/min</b>, pulsos fracos, TPC 5 s, hipotensão.`
      : `Reavaliação ao fim do ciclo ${i-1}: <b>FC ${nhr}/min</b>, mantém má perfusão e hipotensão.`;
    steps.push(ch({box:'Caixa 4',title:'Bradicardia persiste com compromisso?',sit:sit4,vit:{fc:String(nhr)},rhythm:{type:c.strip||'sinus',rate:nhr},
      q:'A bradicardia persiste com compromisso cardiorrespiratório?',keep:true,opts:[{t:'Sim',ok:true},{t:'Não',ok:false}],
      explain:'Persiste → Caixa 5: RCP se FC <60/min, acesso EV/IO, adrenalina; atropina se tónus vagal aumentado ou bloqueio AV primário.'}));
    const cpr=nhr<60;
    steps.push(ch({box:'Caixa 5',title:'Compressões?',q:`FC ${nhr}/min com má perfusão. Inicias${i>1?' (ou manténs)':''} compressões torácicas?`,keep:true,
      opts:[{t:'Sim — FC <60/min com compromisso apesar de ventilação',ok:cpr},{t:'Não — FC ≥60/min; manter ventilação e dar fármacos',ok:!cpr}],
      explain:cpr?`RCP (${ratio(p)}) porque a FC é <60/min com compromisso apesar de oxigenação/ventilação.`:'A RCP só se inicia se FC <60/min. Aqui não; mantém-se o suporte ventilatório e os fármacos.'}));
    if(i===1){
      steps.push(adrChoice(p,'Caixa 5','Adrenalina','Acesso IO colocado.'));
      const at=D.atro(p.w);
      steps.push(ch({box:'Caixa 5',title:'Atropina?',sit:sitC,q:'Está indicada atropina neste doente?',keep:true,
        opts:[{t:`Sim — ${nf(at)} mg EV/IO (0,02 mg/kg; mín. 0,1 mg, máx. 0,5 mg)`,ok:c.atro},{t:'Não — a adrenalina é o fármaco a usar; atropina não está indicada aqui',ok:!c.atro}],
        explain:c.atro?`Atropina se <b>tónus vagal aumentado ou bloqueio AV primário</b>: ${nf(at)} mg, pode repetir 1 vez em 3–5 min.`:'A atropina reserva-se para tónus vagal aumentado ou bloqueio AV primário. Aqui: adrenalina + tratar a causa.'}));
      if(c.atro) atroGiven=1;
      steps.push(act({box:'Caixa 6',title:'Causas e pacing',q:'Em paralelo, o que mais fazes?',items:['Identificar e tratar as causas subjacentes',`Considerar pacing transtorácico ou transvenoso${c.k==='Bloqueio cardíaco'?' (indicado neste bloqueio AV completo)':''}`]}));
      steps.push(causeQ('Caixa 6'));
    } else {
      const items=[cpr?`Continuar RCP (${ratio(p)})`:'Manter ventilação com pressão positiva e O₂',`Repetir adrenalina ${D.adrTxt(p.w)} a cada 3–5 min`];
      if(c.atro && atroGiven===1){ items.push(`Pode repetir atropina 1 vez: ${nf(D.atro(p.w))} mg`); atroGiven=2; }
      items.push(c.k==='Bloqueio cardíaco'?'Preparar/iniciar pacing':'Continuar a tratar a causa; considerar pacing');
      steps.push(act({box:'Caixa 5–6',title:`Ciclo ${i}: fármacos e causa`,q:'Mantém-se a bradicardia com compromisso. O que fazes neste ciclo?',items}));
    }
    const lose = (i===cycles && ending==='perde');
    steps.push(ch({box:'Caixa 7',title:'Pulso presente?',sit:lose?`Fim do ciclo de 2 min. Palpas o pulso ${site}: <b>não é palpável</b>. O monitor mostra ritmo lento organizado.`:`Fim do ciclo de 2 min. Palpas o pulso ${site}: <b>presente</b>.`,
      vit:lose?{fc:'Sem pulso',pa:'—'}:null,rhythm:lose?{type:'pea',rate:rnd(25,35)}:null,
      q:'Palpas o pulso a cada 2 minutos. O pulso está presente?',keep:true,opts:[{t:'Sim',ok:!lose},{t:'Não',ok:lose}],
      explain:lose?'Sem pulso → Algoritmo de Paragem Cardiorrespiratória Pediátrica (Caixa 8).':'Pulso presente → voltar à Caixa 4 e reavaliar se a bradicardia persiste com compromisso.'}));
    if(lose){
      steps.push(ch({box:'Caixa 8',title:'Algoritmo de PCR',q:'Que algoritmo segues agora?',opts:opts('Algoritmo de Paragem Cardiorrespiratória Pediátrica (ritmo não desfibrilhável: RCP + adrenalina)',['Continuar no Algoritmo de Bradicardia e repetir atropina','Algoritmo de Taquiarritmia com Pulso','Cardioversão sincronizada 0,5–1 J/kg']),explain:'Perda de pulso → PCR: RCP de alta qualidade; AESP → adrenalina a cada 3–5 min.'}));
      return {p,setting:'Urgência pediátrica',story:c.story(p),vit,rhythm:rh,steps};
    }
  }
  const fhr = p.infant?rnd(125,150):p.G.fc[0]+rnd(5,20);
  steps.push(ch({box:'Caixa 4',title:'Bradicardia persiste com compromisso?',sit:`${cycles?'Reavaliação após o último ciclo':'Após oxigenação e ventilação eficazes'}: <b>FC ${fhr}/min</b>, pulsos amplos, TPC 2 s, mais reativ${p.o}.`,
    vit:{fc:String(fhr),tpc:'2 s',pa:bpStr(sysN(p))},rhythm:{type:'sinus',rate:fhr},
    q:'A bradicardia persiste com compromisso cardiorrespiratório?',keep:true,opts:[{t:'Sim',ok:false},{t:'Não',ok:true}],
    explain:'Melhorou → Caixa 9: suportar ABC, observar, identificar e tratar a causa.'}));
  steps.push(c9());
  if(!cycles) steps.push(causeQ('Caixa 9'));
  return {p,setting:'Urgência pediátrica',story:c.story(p),vit,rhythm:rh,steps};
}

/* ===================== 4. TAQUIARRITMIA ===================== */
function genTaqui(){
  const v=pick(['sinusal','tsvInst','tsvEst','largaInst','largaEst','tsvInst','tsvEst']);
  let p, story, hr, setting='Urgência pediátrica', cause;
  const steps=[];
  if(v==='sinusal'){
    p=makePatient(['lact','peq','pre']);
    cause=pick([
      {s:`${p.name} tem febre de 39,8 °C desde ontem e está irritável.`,t:'febre — antipirético e tratar a infeção.',temp:'39,8'},
      {s:`${p.name} tem gastroenterite com vómitos incoercíveis há 2 dias.`,t:`hipovolemia — bólus 20 mL/kg = ${nf(20*p.w)} mL de cristaloide isotónico, reavaliar.`,temp:'37,6'},
      {s:`${p.name} queimou o braço com água a ferver há 1 hora e chora intensamente.`,t:'dor — analgesia adequada.',temp:'36,9'}]);
    hr=p.infant?rnd(185,210):rnd(150,175); story=cause.s;
  } else {
    p=makePatient(v.startsWith('larga')?['pre','esc','adol']:['lact','lact','peq','esc','adol']);
    const narrow=v.startsWith('tsv');
    hr=narrow?(p.infant?rnd(240,290):rnd(195,240)):rnd(180,230);
    story = narrow ? (p.infant?`A mãe refere que ${p.name} está a mamar mal desde ontem, mais pálid${p.o} e "com o coração muito acelerado".`:`${p.name} sentiu palpitações de início súbito enquanto estava sentad${p.o} na aula.`)
      : pick([`${p.name}, com miocardiopatia dilatada, sente palpitações e tonturas.`,`${p.name}, operad${p.o} a tetralogia de Fallot em criança, refere palpitações há 30 min.`]);
  }
  const unstable = v==='tsvInst'||v==='largaInst';
  const sys = unstable ? p.hypo-rnd(5,15) : sysN(p);
  const vit={fc:String(hr),fr:String(unstable?hi(p,'fr',5,12):p.G.fr[1]+rnd(0,4)),spo2:String(unstable?rnd(90,94):rnd(96,99)),pa:bpStr(sys),tpc:unstable?'5 s':'2 s',temp:cause?cause.temp:'36,8'};
  const stype = v==='sinusal'?'sinus' : v.startsWith('tsv')?'svt':'vt';
  const rh={type:stype,rate:hr};
  steps.push(act({box:'Caixa 2',title:'Avaliação inicial e suporte',q:`Criança com suspeita de taquiarritmia (FC ${hr}/min). O que fazes de início?`,vit,rhythm:rh,items:['Manter a via aérea permeável','Assistir a ventilação com pressão positiva e O₂, se necessário','Monitor cardíaco, PA e oximetria','Acesso EV/IO','ECG de 12 derivações, se disponível']}));
  const feat = v==='sinusal' ? `Ondas P presentes e normais, intervalo RR variável, FC ${hr}/min; aumento gradual com ${p.infant?'o choro e a febre':'a atividade'}.`
    : v.startsWith('tsv') ? `Ondas P ausentes, intervalo RR fixo, FC ${hr}/min; início abrupto.` : `Complexos largos, regulares; ondas P não identificáveis; FC ${hr}/min.`;
  const sin=v==='sinusal';
  steps.push(ch({box:'Caixa 3',title:'Avaliar o ritmo',sit:feat,q:'Pelas características do ritmo, é provavelmente taquicardia sinusal?',keep:true,
    opts:[{t:'Sim — taquicardia sinusal provável',ok:sin},{t:'Não — provável taquiarritmia (não sinusal)',ok:!sin}],
    explain:sin?`Sinusal: P presentes/normais, RR variável, ${p.infant?'lactente <220/min':'criança <180/min'} → procurar e tratar a causa.`:`Não sinusal: P ausentes/anormais, RR fixo, ${p.infant?'lactente ≥220/min':'criança ≥180/min'}, início abrupto (ou QRS largo) → avaliar compromisso cardiorrespiratório.`}));
  if(sin){
    steps.push(act({box:'Caixa 5',title:'Procurar e tratar a causa',q:'O que fazes perante uma taquicardia sinusal?',items:['Procurar e tratar a causa (febre, dor, hipovolemia, hipoxia, ansiedade, anemia…)',`Neste caso: ${cause.t}`,'Não usar antiarrítmicos nem cardioversão']}));
    return {p,setting,story,vit,rhythm:rh,steps};
  }
  const mental = unstable ? `Sonolent${p.o}, pouco reativ${p.o}; pulsos fracos, extremidades frias, PAS ${sys} mmHg.` : `Acordad${p.o}, interage; pulsos bons, TPC 2 s, PAS ${sys} mmHg.`;
  steps.push(ch({box:'Caixa 6',title:'Compromisso cardiorrespiratório?',sit:mental,q:'Há compromisso cardiorrespiratório (alteração aguda do estado mental, sinais de choque, hipotensão)?',keep:true,
    opts:[{t:'Sim',ok:unstable},{t:'Não',ok:!unstable}],explain:unstable?`Sim (limite de hipotensão para a idade: PAS <${p.hypo} mmHg) → avaliar QRS (Caixa 7).`:'Não → avaliar QRS (Caixa 12): há tempo para abordagens menos invasivas.'}));
  const narrow=v.startsWith('tsv'); const qrs=narrow?pick(['0,06','0,07','0,08']):pick(['0,12','0,14','0,16']);
  steps.push(ch({box:unstable?'Caixa 7':'Caixa 12',title:'Duração do QRS',sit:`QRS no ECG: <b>${qrs} s</b>.`,q:'O QRS é estreito ou largo?',keep:true,
    opts:[{t:'Estreito (≤0,09 s)',ok:narrow},{t:'Largo (>0,09 s)',ok:!narrow}],explain:narrow?'QRS ≤0,09 s → TSV provável.':'QRS >0,09 s → TV possível (ou TSV com aberrância).'}));
  const w=p.w, a1=D.ad1(w), a2=D.ad2(w), cv1=`${nf(.5*w)}–${nf(w)} J`;
  const adenOpt=`Adenosina ${nf(a1)} mg EV/IO em bólus rápido + flush (0,1 mg/kg, máx. 6 mg)`;
  if(v==='tsvInst'){
    const hasIV=chance(.6);
    steps.push(ch({box:'Caixa 9',title:'TSV instável — tratamento',sit:hasIV?'Já tens um acesso EV funcionante no braço.':'Ainda não há acesso vascular; o desfibrilhador está pronto.',q:'Qual é o tratamento imediato?',
      opts:hasIV?opts(adenOpt,[`Amiodarona ${nf(5*w)} mg em bólus rápido`,'Manobras vagais e reavaliar em 10 min',`Desfibrilhação não sincronizada ${nf(2*w)} J`])
                :opts(`Cardioversão sincronizada ${cv1} (0,5–1 J/kg); sedar se possível, sem atrasar`,['Adenosina por via IM','Esperar por acesso EV antes de qualquer tratamento',`Desfibrilhação não sincronizada ${nf(4*w)} J`]),
      explain:hasIV?`TSV com compromisso e acesso EV/IO → adenosina 0,1 mg/kg (máx. 6 mg) = <b>${nf(a1)} mg</b>, bólus rápido com flush (técnica das 2 seringas). Alternativa: cardioversão sincronizada.`:`Sem acesso → <b>cardioversão sincronizada</b> 0,5–1 J/kg = ${cv1}; se ineficaz, 2 J/kg = ${nf(2*w)} J.`}));
    const fail=chance(.45);
    if(fail){
      steps.push(ch({box:'Caixa 9',title:'Sem conversão',sit:hasIV?`Pausa transitória no monitor, mas a TSV reinicia a ${hr}/min.`:'Após o choque mantém-se a TSV.',q:'Qual o passo seguinte?',
        opts:hasIV?opts(`Repetir adenosina ${nf(a2)} mg (0,2 mg/kg, máx. 12 mg) em bólus rápido`,[`Repetir adenosina ${nf(a1)} mg (mesma dose)`,`Adrenalina ${nf(.01*w)} mg`,'Atropina 0,02 mg/kg'])
                  :opts(`Nova cardioversão sincronizada ${nf(2*w)} J (2 J/kg)`,[`Repetir ${nf(.5*w)} J`,`Desfibrilhação não sincronizada ${nf(4*w)} J`,'Adenosina IM']),
        explain:hasIV?`Segunda dose de adenosina: 0,2 mg/kg (máx. 12 mg) = <b>${nf(a2)} mg</b>. Se mantiver, cardioversão sincronizada e consulta especializada.`:'Se a cardioversão inicial for ineficaz, aumentar para 2 J/kg.'}));
    }
    steps.push(act({box:'Caixa 9',title:'Após conversão',sit:`Conversão para ritmo sinusal a ${p.infant?rnd(130,150):rnd(90,110)}/min, melhoria da perfusão.`,vit:{fc:String(p.infant?140:100),pa:bpStr(sysN(p)),tpc:'2 s'},rhythm:{type:'sinus',rate:p.infant?140:100},
      q:'Ritmo convertido. O que fazes a seguir?',items:['Reavaliar ABCDE e perfusão','ECG de 12 derivações em ritmo sinusal','Monitorização contínua (risco de recorrência)','Consulta de cardiologia pediátrica']}));
  } else if(v==='tsvEst'){
    steps.push(act({box:'Caixa 14',title:'Manobras vagais',q:'TSV estável. Qual é a primeira intervenção e como a fazes nesta idade?',items:[
      'Considerar manobras vagais, com registo de ECG contínuo',
      p.infant?'Lactente: gelo na face (saco com gelo e água sobre a face), sem ocluir a via aérea, 15–20 s':'Criança: manobra de Valsalva (soprar por uma palhinha/seringa) ou gelo na face',
      'Não fazer pressão ocular','Preparar adenosina enquanto se tenta']}));
    const vagOk=chance(.3);
    if(vagOk){
      steps.push(act({box:'Caixa 14',title:'Conversão com manobras vagais',sit:'Com a manobra vagal, o ritmo converte para sinusal.',rhythm:{type:'sinus',rate:p.infant?140:95},vit:{fc:String(p.infant?140:95)},q:'Converteu. O que fazes agora?',
        items:['ECG de 12 derivações em ritmo sinusal','Vigilância (risco de recorrência)','Consulta de cardiologia pediátrica']}));
    } else {
      steps.push(ch({box:'Caixa 15',title:'Adenosina',sit:'As manobras vagais não resultaram. Tens acesso EV no braço.',q:'Qual o fármaco e a dose?',
        opts:opts(adenOpt,[`Adenosina ${nf(a2)} mg como 1.ª dose (0,2 mg/kg)`,`Amiodarona ${nf(5*w)} mg em bólus rápido`,`Cardioversão sincronizada ${cv1}`]),
        explain:`Adenosina 0,1 mg/kg (máx. 6 mg) = <b>${nf(a1)} mg</b>, bólus rápido com flush; se necessário, 0,2 mg/kg (máx. 12 mg) = ${nf(a2)} mg. A cardioversão reserva-se para doente instável ou refratário.`}));
      steps.push(act({box:'Caixa 15',title:'Após adenosina',sit:'Após a adenosina: pausa breve e ritmo sinusal.',rhythm:{type:'sinus',rate:p.infant?140:95},vit:{fc:String(p.infant?140:95)},q:'Converteu. O que fazes agora?',
        items:['ECG de 12 derivações em ritmo sinusal','Monitorização contínua','Consulta de cardiologia pediátrica']}));
    }
  } else if(v==='largaInst'){
    steps.push(ch({box:'Caixa 11',title:'TV possível com compromisso',q:'Qual é o tratamento imediato?',
      opts:opts(`Cardioversão sincronizada ${cv1} (0,5–1 J/kg); sedar se possível, sem atrasar`,[`Desfibrilhação não sincronizada ${nf(2*w)} J`,`Amiodarona ${nf(Math.min(5*w,300))} mg em bólus rápido e aguardar`,'Manobras vagais']),
      explain:`TV com pulso e compromisso → <b>cardioversão sincronizada</b> 0,5–1 J/kg = ${cv1}; se ineficaz, 2 J/kg = ${nf(2*w)} J. Consulta especializada antes de fármacos adicionais.`}));
    steps.push(act({box:'Caixa 11',title:'Após cardioversão',q:'O que fazes a seguir?',items:['Se ineficaz: aumentar para 2 J/kg','Consulta especializada antes de terapêutica farmacológica adicional','Amiodarona 5 mg/kg em 20–60 min ou procainamida apenas com orientação especializada','Reavaliar ABCDE; ECG de 12 derivações; procurar causas (eletrólitos, tóxicos)']}));
  } else {
    const reg=chance(.65);
    steps.push(ch({box:'Caixa 17',title:'QRS largo, estável',sit:reg?'O ritmo é <b>regular</b> e o QRS <b>monomórfico</b>.':'O ritmo é <b>irregular</b> e o QRS <b>polimórfico</b>.',q:'Que podes considerar neste momento?',
      opts:reg?opts(`Considerar adenosina ${nf(a1)} mg (0,1 mg/kg) e pedir consulta especializada`,['Cardioversão sincronizada imediata sem sedação','Desfibrilhação não sincronizada','Nada; alta com consulta em 1 semana'])
             :opts('Não dar adenosina; pedir consulta especializada (ritmo irregular/polimórfico)',[`Adenosina ${nf(a1)} mg em bólus rápido`,'Desfibrilhação não sincronizada imediata','Manobras vagais repetidas']),
      explain:reg?'Ritmo regular com QRS monomórfico → pode considerar-se adenosina (diagnóstica/terapêutica). Recomenda-se consulta especializada.':'A adenosina só se considera se o ritmo for regular e o QRS monomórfico. Aqui → consulta especializada.'}));
    steps.push(act({box:'Caixa 18',title:'Consulta especializada',q:'O doente mantém-se estável. O que mais fazes?',items:['Pedir consulta especializada (cardiologia pediátrica)','ECG de 12 derivações e monitorização contínua','Ter desfibrilhador pronto (pode ficar instável)','Procurar causas: eletrólitos, tóxicos, cardiopatia de base']}));
  }
  return {p,setting,story,vit,rhythm:rh,steps};
}

/* ===================== 5. CHOQUE SÉTICO ===================== */
function genSepsis(){
  const cases=[
    {g:['rn'],s:p=>`${p.name} tem febre (38,6 °C) desde esta manhã, recusa mamar e está "mais mole".`,temp:'38,6',signs:['Hipotonia, gemido, pouco reativo','Taquicardia','Febre','TPC 4 s, pele marmoreada'],warm:false,bolus10:true,why:'recém-nascido'},
    {g:['lact'],s:p=>`${p.name} tem febre de 39,5 °C há 12 h, está irritável e com pele marmoreada.`,temp:'39,5',signs:['Irritabilidade','Taquicardia','Febre','TPC 4 s, extremidades frias, marmoreado'],warm:false},
    {g:['peq','pre'],s:p=>`${p.name} tem febre desde a noite e apareceram manchas roxas nas pernas que não desaparecem à pressão.`,temp:'39,9',signs:['Sonolência','Taquicardia','Febre','Púrpura/petéquias, TPC 5 s, extremidades frias'],warm:false},
    {g:['esc'],s:p=>`${p.name} tem pielonefrite; hoje tem febre de 40 °C, calafrios e está confus${p.o}.`,temp:'40,0',signs:['Confusão','Taquicardia','Febre','Extremidades quentes, TPC "flash" (<1 s), pulsos amplos','Hipotensão diastólica'],warm:true},
    {g:['adol','esc'],s:p=>`${p.name}, em quimioterapia por leucemia (neutropénic${p.o}), está prostrad${p.o} e fri${p.o}.`,temp:'35,4',signs:['Prostração','Taquicardia','Hipotermia (35,4 °C)','Palidez, pele marmoreada, TPC 4 s'],warm:false},
    {g:['peq','pre'],s:p=>`${p.name}, com cardiopatia congénita operada e função ventricular diminuída, tem pneumonia e está cada vez mais prostrad${p.o}.`,temp:'39,1',signs:['Prostração','Taquicardia','Febre','TPC 4 s, extremidades frias'],warm:false,bolus10:true,why:'compromisso cardiovascular prévio'}
  ];
  const c=pick(cases); const p=makePatient(c.g); const w=p.w; const per=c.bolus10?10:20;
  const outcome=pick(['resp','refr','over','refr']);
  const hypoNow=chance(.5)||c.warm;
  const sys=hypoNow?p.hypo-rnd(6,14):sysN(p);
  const vit={fc:String(hi(p,'fc',30,50)),fr:String(hi(p,'fr',6,14)),spo2:String(rnd(91,95)),pa:c.warm?`${sys}/${Math.round(sys*.38)}`:bpStr(sys),tpc:c.warm?'<1 s':pick(['4 s','5 s']),temp:c.temp};
  const steps=[];
  steps.push(act({box:'Caixa 1',title:'Identificar choque sético',q:`Que sinais de choque sético identificas nest${p.o==='a'?'a':'e'} doente?`,vit,items:c.signs.concat([hypoNow?`Hipotensão (PAS ${sys} < ${p.hypo} mmHg)`:'Sem hipotensão — choque compensado (a hipotensão pode ou não estar presente)']),note:'Sinais: estado mental, FC, temperatura, perfusão; hipotensão pode estar ausente.'}));
  steps.push(act({box:'Caixa 2',title:'Estabilização inicial (10–15 min)',q:'Nos primeiros 10–15 minutos, o que fazes?',items:['Suportar o A-B-C; O₂','Monitorizar FC, PA e oximetria de pulso','Estabelecer acesso EV/IO (IO se o EV não for rápido)',`Bólus de cristaloide isotónico ${per} mL/kg, reavaliando após cada bólus`]}));
  steps.push(ch({box:'Caixa 2',title:'Volume do bólus',q:'Que volume tem o primeiro bólus de fluidos?',
    opts:opts(`${nf(per*w)} mL de cristaloide isotónico (${per} mL/kg)`,[`${nf((per===10?20:10)*w)} mL (${per===10?20:10} mL/kg)`,`${nf(40*w)} mL (40 mL/kg) de uma vez`,`${nf(per*w)} mL de dextrose a 10%`,`${nf(5*w)} mL de albumina (5 mL/kg)`]),
    explain:`Bólus de 10–20 mL/kg de cristaloide isotónico; <b>10 mL/kg em recém-nascidos e em doentes com compromisso cardiovascular prévio</b>${c.why?` — aqui: ${c.why}`:''}. Para ${nf(w)} kg: <b>${nf(per*w)} mL</b>.`}));
  const hypog=chance(.35);
  steps.push(act({box:'Caixa 3',title:'Na primeira hora',q:'Que mais tem de acontecer dentro da primeira hora?',items:['Colher hemocultura e análises (incluindo glicose e cálcio) — sem atrasar antibióticos nem fluidos','Antibiótico de largo espetro','Reavaliar após cada bólus; parar se crepitações, dificuldade respiratória ou hepatomegalia','Antipiréticos, se necessário']}));
  if(hypog){
    steps.push(ch({box:'Caixa 3',title:'Hipoglicemia',sit:`Glicemia capilar: <b>${rnd(38,48)} mg/dL</b>.`,q:'Como corriges?',
      opts:opts(`Dextrose 0,5–1 g/kg: D10W ${nf(5*w)}–${nf(10*w)} mL EV/IO`,[`D10W ${nf(1*w)} mL (1 mL/kg)`,`D50 ${nf(5*w)} mL EV`,'Aguardar resultado laboratorial']),
      explain:`Dextrose 0,5–1 g/kg EV/IO (D25W 2–4 mL/kg ou D10W 5–10 mL/kg) = D10W <b>${nf(5*w)}–${nf(10*w)} mL</b>. Reavaliar glicemia.`}));
  }
  const fcx=n=>String(Math.max(p.G.fc[1]+5,parseInt(vit.fc)-n));
  if(outcome==='over'){
    steps.push(ch({box:'Caixa 3',title:'Reavaliação após bólus',sit:`Após o ${chance(.5)?'1.º':'2.º'} bólus: FC ${fcx(5)}/min, <b>crepitações bibasais de novo, fígado palpável 4 cm abaixo do rebordo</b>, SpO₂ desce para 89%.`,vit:{spo2:'89',fc:fcx(5)},
      q:'O que fazes com a fluidoterapia?',opts:opts('Parar os bólus: há sinais de sobrecarga de fluidos',[`Repetir bólus de ${per} mL/kg`,`Bólus de ${nf(40*w)} mL (40 mL/kg)`,'Furosemida e continuar os bólus']),
      explain:'Crepitações, dificuldade respiratória ou hepatomegalia → <b>parar os bólus</b>. Com sobrecarga e choque persistente → Caixa 6 (cuidados intensivos + vasoativo).'}));
  } else {
    steps.push(ch({box:'Caixa 3',title:'Reavaliação após o 1.º bólus',sit:`Após o 1.º bólus: FC ${fcx(10)}/min, TPC 3–4 s, ainda prostrad${p.o}. Sem crepitações nem hepatomegalia.`,vit:{fc:fcx(10),tpc:'3 s'},
      q:'Qual o passo seguinte?',opts:opts(`Repetir bólus de ${nf(per*w)} mL (${per} mL/kg) e reavaliar`,['Iniciar já adrenalina em perfusão, sem mais fluidos','Parar fluidos e aguardar análises','Hidrocortisona 2 mg/kg']),
      explain:'Choque persistente sem sinais de sobrecarga → repetir bólus, reavaliando após cada um, até 40–60 mL/kg.'}));
  }
  const persist = outcome!=='resp';
  const c4sit = outcome==='resp' ? `Após um total de 40 mL/kg: FC ${p.G.fc[1]-5}/min, TPC 2 s, mais desperto, diurese presente, PA normal.`
    : outcome==='refr' ? `Após um total de 60 mL/kg: mantém FC ${fcx(5)}/min, TPC 4 s, PAS ${p.hypo-rnd(4,10)} mmHg, oligúria.` : 'Mantém sinais de choque e já tem sinais de sobrecarga de fluidos.';
  steps.push(ch({box:'Caixa 4',title:'Choque persistente ou sobrecarga?',sit:c4sit,vit:outcome==='resp'?{fc:String(p.G.fc[1]-5),tpc:'2 s',pa:bpStr(sysN(p))}:null,
    q:'Os sinais de choque persistem após 40–60 mL/kg, ou há sobrecarga de fluidos?',keep:true,opts:[{t:'Sim',ok:persist},{t:'Não',ok:!persist}],
    explain:persist?'Sim → Caixa 6: consulta de cuidados intensivos e iniciar/titular adrenalina ou noradrenalina.':'Não → Caixa 5: considerar consulta de cuidados intensivos e manter reavaliação.'}));
  if(!persist){
    steps.push(act({box:'Caixa 5',title:'Choque resolvido',q:'O choque respondeu aos fluidos. E agora?',items:['Considerar consulta de cuidados intensivos','Manter antibiótico e reavaliação frequente','Objetivos: estado mental, FC e temperatura normais, PA adequada, perfusão e diurese melhores']}));
    return {p,setting:'Urgência pediátrica',story:c.s(p),vit,steps};
  }
  steps.push(ch({box:'Caixa 6',title:'Choque refratário',q:'Qual é a atitude?',
    opts:opts('Pedir cuidados intensivos e iniciar perfusão de adrenalina ou noradrenalina, titulada',['Mais 3 bólus de 20 mL/kg antes de qualquer fármaco','Hidrocortisona como primeira medida','Bicarbonato de sódio 1 mEq/kg']),
    explain:`Obter consulta de cuidados intensivos e iniciar/titular <b>adrenalina</b> (0,03–0,2 mcg/kg/min no choque hipotensivo, segundo a tabela) ou <b>noradrenalina</b> (0,05–0,5 mcg/kg/min). ${c.warm?'Choque "quente" (vasodilatado): a noradrenalina é uma boa escolha.':'Choque "frio": a adrenalina é uma boa escolha.'}`}));
  steps.push(act({box:'Caixa 7',title:'Monitorização avançada',q:'Com o vasoativo em curso, o que mais fazes?',items:['Monitorizar pressão venosa central e pressão intra-arterial','Continuar adrenalina/noradrenalina e bólus conforme necessário','Verificar se via aérea, oxigenação e ventilação são adequadas','Considerar hidrocortisona em dose de stress se a hemodinâmica se mantiver inadequada']}));
  if(chance(.65)){
    steps.push(ch({box:'Caixa 7',title:'Hidrocortisona',sit:'Apesar de fluidos adequados e de adrenalina em titulação, mantém hipotensão.',q:'Que dose de hidrocortisona?',
      opts:opts(`${nf(D.hc(w))} mg EV — 2 mg/kg (máx. 100 mg)`,[`${nf(Math.min(10*w,500))} mg — 10 mg/kg`,`${nf(.2*w)} mg — 0,2 mg/kg`,`${nf(Math.min(.6*w,16))} mg de dexametasona`]),
      explain:`Hidrocortisona em dose de stress: 2 mg/kg EV em bólus (máx. 100 mg) = <b>${nf(D.hc(w))} mg</b>.`}));
  }
  return {p,setting:'Urgência pediátrica',story:c.s(p),vit,steps};
}

/* ===================== 6. APÓS RCE ===================== */
function genRCE(){
  const cases=[
    {g:['peq','pre','esc'],s:p=>`${p.name} teve uma PCR após afogamento numa piscina; RCE ao fim de 14 min de RCP.`,f:'Hipoxia (afogamento) e hipotermia',temp:'34,8',card:false},
    {g:['esc','adol'],s:p=>`${p.name} teve uma PCR em FV por hipercaliemia (insuficiência renal); RCE após 3 choques.`,f:'Hipercaliemia',temp:'36,9',card:false},
    {g:['lact','peq'],s:p=>`${p.name} teve uma PCR em AESP no contexto de choque sético; RCE após 10 min.`,f:'Hipovolemia/sépsis e acidose',temp:'38,4',card:false},
    {g:['esc','adol','pre'],s:p=>`${p.name}, com miocardite viral, teve uma PCR em TV sem pulso; RCE após 2 choques. A ecografia mostra má função ventricular.`,f:'Disfunção miocárdica (miocardite)',temp:'37,2',card:true},
    {g:['lact'],s:p=>`${p.name}, com bronquiolite grave, teve uma PCR hipóxica (bradicardia → assistolia); RCE após 6 min.`,f:'Hipoxia',temp:'37,0',card:false}
  ];
  const c=pick(cases); const p=makePatient(c.g); const w=p.w; const per=c.card?10:20;
  const steps=[]; const etco2=chance(.5)?rnd(55,65):rnd(22,26);
  const vit={fc:String(hi(p,'fc',5,25)),fr:'Vent.',spo2:'100',pa:'—',tpc:'4 s',temp:c.temp,etco2:String(etco2)};
  steps.push(ch({box:'Caixa 1',title:'Ventilação e oxigenação',sit:`Entubad${p.o} e ventilad${p.o} com <b>FiO₂ 1,0</b>; SpO₂ 100%; EtCO₂ ${etco2} mmHg.`,vit,rhythm:{type:'sinus',rate:parseInt(vit.fc)},
    q:'O que fazes à FiO₂?',opts:opts('Reduzir a FiO₂ progressivamente para manter SpO₂ 94–99%',['Manter FiO₂ 1,0 nas primeiras 24 h','Reduzir até SpO₂ 88–92%','Retirar o O₂ e manter ar ambiente']),
    explain:'Titular a FiO₂ para SpO₂ 94–99% (ou adequada à criança); se a saturação for 100%, reduzir a FiO₂. Evitar hiperoxia.'}));
  steps.push(act({box:'Caixa 1',title:'Otimizar a ventilação',q:`EtCO₂ ${etco2} mmHg. Como ajustas a ventilação?`,items:['Confirmar via aérea avançada e capnografia com onda',
    etco2>50?'Hipercapnia: aumentar a ventilação (frequência/volume) e confirmar com gasimetria':'Hipocapnia: reduzir a ventilação e confirmar com gasimetria',
    'Ter como alvo uma PCO₂ adequada ao doente, limitando hipercapnia ou hipocapnia graves']}));
  const hypo=chance(.5); const sys=hypo?p.hypo-rnd(5,14):p.hypo+rnd(5,14);
  steps.push(act({box:'Caixa 2',title:'Choque persistente',sit:`PA ${bpStr(sys)} mmHg, TPC 4 s, extremidades frias, lactato 5,2 mmol/L, oligúria.`,vit:{pa:bpStr(sys),tpc:'4 s'},
    q:'Mantém sinais de choque. Como abordas?',items:[`Identificar e tratar fatores contribuintes (Hs e Ts + traumatismo) — aqui: ${c.f}`,`Considerar bólus EV/IO de cristaloide isotónico ${per} mL/kg${c.card?' (bólus menor por má função cardíaca)':''}`,'Considerar suporte inotrópico e/ou vasopressor se refratário a fluidos']}));
  steps.push(ch({box:'Caixa 2',title:'Volume do bólus',q:'Que bólus consideras?',
    opts:opts(`${nf(per*w)} mL (${per} mL/kg) de cristaloide isotónico`,[`${nf((per===10?20:10)*w)} mL (${per===10?20:10} mL/kg)`,`${nf(40*w)} mL (40 mL/kg)`,`${nf(per*w)} mL de soro hipotónico`]),
    explain:`20 mL/kg de cristaloide isotónico; considerar bólus menores (10 mL/kg) se suspeita de má função cardíaca. ${c.card?'Aqui há miocardite → 10 mL/kg':'Aqui → 20 mL/kg'} = <b>${nf(per*w)} mL</b>.`}));
  steps.push(ch({box:'Caixa 2',title:'Hipotensivo ou normotensivo?',sit:`PAS ${sys} mmHg (${who(p)}).`,q:'Este choque é hipotensivo ou normotensivo?',keep:true,
    opts:[{t:'Choque hipotensivo',ok:hypo},{t:'Choque normotensivo',ok:!hypo}],
    explain:`Hipotensão = PAS <${p.hypo} mmHg nesta idade (${p.infant?'lactente: <70':p.years>10?'>10 anos: <90':`1–10 anos: <70 + 2 × idade = ${p.hypo}`}). PAS ${sys} → <b>${hypo?'hipotensivo (Caixa 4)':'normotensivo (Caixa 5)'}</b>.`}));
  steps.push(ch({box:hypo?'Caixa 4':'Caixa 5',title:'Fármaco vasoativo',q:`Choque ${hypo?'hipotensivo':'normotensivo'} após RCE. Que fármaco(s)?`,
    opts:hypo?opts('Adrenalina ou noradrenalina em perfusão',['Apenas adrenalina','Nitroprussiato','Nenhum; só fluidos']):opts('Adrenalina em perfusão',['Noradrenalina isolada','Nitroprussiato','Nenhum; só fluidos']),
    explain:hypo?'Choque hipotensivo pós-RCE → <b>adrenalina ou noradrenalina</b>.':'Choque normotensivo pós-RCE → <b>adrenalina</b>.'}));
  const lowG=chance(.4);
  steps.push(act({box:'Caixa 6',title:'Neuroproteção e metabolismo',sit:lowG?`Glicemia: <b>${rnd(40,52)} mg/dL</b>. Mantém-se em coma (sem resposta a estímulos).`:'Glicemia 112 mg/dL. Mantém-se em coma (sem resposta a estímulos).',
    q:'Que mais tens de vigiar e tratar?',items:['Monitorizar e tratar agitação e convulsões (EEG contínuo se possível)',lowG?`Tratar a hipoglicemia: dextrose 0,5–1 g/kg (D10W ${nf(5*w)}–${nf(10*w)} mL)`:'Monitorizar e tratar a hipoglicemia',
    'Avaliar gasimetria, eletrólitos séricos e cálcio','Em coma: manter controlo direcionado da temperatura, tratar febre de forma agressiva','Considerar consulta e transporte para centro terciário']}));
  const m=D.maint(w);
  steps.push(ch({box:'Caixa 6',title:'Fluidos de manutenção',q:`Qual o débito estimado de fluidos de manutenção para ${nf(w)} kg?`,
    opts:opts(`${nf(m)} mL/h`,[`${nf(4*w)} mL/h`,`${nf(m+20)} mL/h`,`${nf(Math.round(m*1.5))} mL/h`,`${nf(Math.max(10,m-20))} mL/h`]),
    explain:`Regra 4-2-1: <10 kg → 4 mL/kg/h; 10–20 kg → 40 mL/h + 2 mL/kg/h por kg acima de 10; >20 kg → 60 mL/h + 1 mL/kg/h por kg acima de 20. Para ${nf(w)} kg = <b>${nf(m)} mL/h</b>. Usar fluidos isotónicos (com dextrose em lactentes); evitar hipotónicos.`}));
  steps.push(ch({box:'Pós-paragem',title:'Controlo da temperatura',sit:`Temperatura central ${c.temp} °C; mantém-se em coma.`,q:'Qual a estratégia de temperatura?',
    opts:opts('CDT 32–34 °C seguido de 36–37,5 °C, ou apenas 36–37,5 °C, até 5 dias; prevenir febre e arrepios',['Arrefecer a 30 °C durante 72 h','Sem controlo de temperatura; paracetamol só se >40 °C','Reaquecer rapidamente até 38,5 °C']),
    explain:'Em coma: controlo direcionado da temperatura (32–34 °C seguido de 36–37,5 °C, ou apenas 36–37,5 °C) até 5 dias. Prevenir a febre e os arrepios; o reaquecimento é um período de risco (hipotensão, eletrólitos, hipoglicemia, convulsões).'}));
  steps.push(ch({box:'Pós-paragem',title:'Prognóstico',q:'Quando e como fazes o prognóstico neurológico?',
    opts:opts('Adiar pelo menos 72 h após a PCR e usar múltiplas modalidades',['Às 24 h, pelas pupilas','Logo após o RCE, pela duração da RCP','Às 12 h, só com o EEG']),
    explain:'Adiar o prognóstico ≥72 h após a PCR, com múltiplas modalidades (clínicas e outras) e não um fator isolado; o CDT pode alterar a avaliação.'}));
  return {p,setting:'Unidade de cuidados intensivos / sala de reanimação',story:c.s(p),vit,rhythm:{type:'sinus',rate:parseInt(vit.fc)},steps};
}

/* ===================== catálogo ===================== */
const ALGS={
  sas:{name:'Abordagem Sistemática',code:'SAS',color:'--a-sas',desc:'Avaliação inicial, respira/tem pulso, avaliar → identificar → intervir.',gen:genSAS,
    ref:[['1','Avaliação inicial: aspeto, trabalho respiratório, circulação'],['2','Não responde / intervenção imediata? Sim→3 · Não→10'],['3','Pedir ajuda; ativar sistema de emergência'],['4','Respira e tem pulso? Sim→10 · Sem pulso→7 · Pulso mas resp. anormal→5'],['5','Via aérea; ventilar (1 a cada 2–3 s); O₂; monitorizar pulso e SpO₂'],['6','FC <60 com compromisso apesar de O₂/ventilação? Sim→7 · Não→12'],['7','Iniciar RCP (C-A-B)'],['8','Algoritmo de PCR pediátrica'],['9','RCE → pós-paragem; seguir para 12'],['10','Compromisso grave VA/ventilação/perfusão? Sim→11 · Não→12'],['11','Suportar A-B-C; O₂; monitorizar'],['12','Avaliar → identificar → intervir; repetir. PCR → 7']]},
  pcr:{name:'Paragem Cardiorrespiratória',code:'PCR',color:'--a-pcr',desc:'FV/TV sem pulso e assistolia/AESP: choques, adrenalina, antiarrítmicos, Hs e Ts.',gen:genPCR,
    ref:[['1','RCP; insuflador + O₂; monitor/desfibrilhador. Desfibrilhável? Sim→2 · Não→9'],['2-3','FV/TVsp → choque 2 J/kg'],['4','RCP 2 min; acesso EV/IO. Desfib.? Sim→5 · Não→12'],['5','Choque 4 J/kg'],['6','RCP 2 min; adrenalina 3–5 min; via aérea avançada. Desfib.? Sim→7 · Não→12'],['7','Choque ≥4 J/kg (máx. 10 J/kg)'],['8','RCP 2 min; amiodarona ou lidocaína; Hs e Ts. Desfib.? Sim→5 · Não→12'],['9','Assistolia/AESP: adrenalina já'],['10','RCP 2 min; EV/IO; adrenalina 3–5 min; via aérea. Desfib.? Sim→5 · Não→11'],['11','RCP 2 min; Hs e Ts. Desfib.? Sim→5 · Não→12'],['12','Sem RCE→10 · RCE→pós-paragem'],['Dose','Adrenalina 0,01 mg/kg (máx. 1 mg) · Amiodarona 5 mg/kg (máx. 300; até 3 doses) · Lidocaína 1 mg/kg']]},
  bradi:{name:'Bradicardia com Pulso',code:'BRADI',color:'--a-bradi',desc:'Compromisso? Ventilar e oxigenar, RCP se <60, adrenalina, atropina quando indicada.',gen:genBradi,
    ref:[['1','Confirmar pulso → criança com bradicardia e pulso'],['2','Compromisso (estado mental, choque, hipotensão)? Sim→3 · Não→9'],['3','Via aérea + O₂; ventilação se necessário; monitor; pulso'],['4','Persiste com compromisso? Sim→5 · Não→9'],['5','RCP se FC <60; EV/IO; adrenalina; atropina se vagal/BAV primário'],['6','Tratar causas; considerar pacing'],['7','Palpar pulso a cada 2 min. Presente→4 (reavaliar) · Ausente→8'],['8','Algoritmo de PCR'],['9','Tratar causas; suportar ABC; considerar O₂ e ECG 12D; observar'],['Dose','Adrenalina 0,01 mg/kg · Atropina 0,02 mg/kg (mín. 0,1; máx. 0,5 mg), repetir 1×']]},
  taqui:{name:'Taquiarritmia com Pulso',code:'TAQUI',color:'--a-taqui',desc:'Sinusal vs TSV vs QRS largo, estável ou instável: vagais, adenosina, cardioversão.',gen:genTaqui,
    ref:[['2','Via aérea; ventilação/O₂ se necessário; EV/IO; ECG 12D'],['3','Sinusal provável→4-5 (tratar causa) · Não→6'],['6','Compromisso? Sim→7 · Não→12'],['7','QRS ≤0,09 s→8-9 · >0,09 s→10-11'],['9','TSV instável: adenosina (se EV/IO) ou cardioversão sincronizada'],['11','TV possível: cardioversão sincronizada; consulta antes de fármacos'],['12','Estável: QRS estreito→13 · largo→16'],['14-15','TSV estável: manobras vagais → adenosina'],['17','QRS largo regular e monomórfico: considerar adenosina'],['18','Consulta especializada'],['Dose','Adenosina 0,1 mg/kg (máx. 6) → 0,2 mg/kg (máx. 12) · Cardioversão 0,5–1 J/kg → 2 J/kg']]},
  sepsis:{name:'Choque Sético',code:'SÉPSIS',color:'--a-sepsis',desc:'Primeira hora: acesso, bólus, culturas, antibiótico; refratário → vasoativos.',gen:genSepsis,
    ref:[['1','Sinais: estado mental, FC, temperatura, perfusão; ± hipotensão'],['2','10–15 min: ABC, monitorizar, EV/IO, bólus 10–20 mL/kg (10 em RN/cardiopatas)'],['3','1.ª hora: hemocultura + glicose/cálcio; antibiótico; reavaliar cada bólus; parar se sobrecarga'],['4','Choque após 40–60 mL/kg ou sobrecarga? Não→5 · Sim→6'],['5','Considerar cuidados intensivos'],['6','Cuidados intensivos; adrenalina ou noradrenalina'],['7','PVC e PA invasiva; continuar; via aérea/ventilação; hidrocortisona se refratário'],['Dose','Hidrocortisona 2 mg/kg (máx. 100 mg)']]},
  rce:{name:'Cuidados Após RCE',code:'PÓS-RCE',color:'--a-rce',desc:'SpO₂ 94–99%, choque hipotensivo vs normotensivo, glicemia, temperatura, prognóstico.',gen:genRCE,
    ref:[['1','Titular FiO₂ para SpO₂ 94–99%; via aérea avançada + capnografia; PCO₂ adequada'],['2','Choque persistente: tratar fatores; bólus 20 mL/kg (10 se má função cardíaca); inotrópico/vasopressor'],['3','Fatores: Hs e Ts + traumatismo'],['4','Hipotensivo: adrenalina ou noradrenalina'],['5','Normotensivo: adrenalina'],['6','Convulsões, glicemia, gasimetria/eletrólitos/cálcio; CDT se coma; transferir'],['Fluidos','4-2-1: <10 kg 4 mL/kg/h; 10–20 kg 40 + 2/kg; >20 kg 60 + 1/kg']]}
};
