"use strict";
const state={csrf:"",preview:null,todayCounts:{},loaded:{today:false,portfolio:false,relationships:false},property:{id:null,data:null,tab:"geral",mercado:null,pollTimer:null},portfolioRows:[],portfolioFilter:"todos",assistant:{sessionId:null,busy:false,sessions:[],loaded:false,scope:{objectType:"general",objectId:null,title:"Conversa geral"}}};
const $=id=>document.getElementById(id);

async function api(url,options={}){
  const mutating=options.method&&options.method!=="GET";
  if(mutating&&!state.csrf){
    const seed=await fetch("/painel/api/os/hoje",{credentials:"same-origin"});
    const seedBody=await seed.json().catch(()=>({}));
    if(seed.status===401){location.href="/painel";throw new Error("Sessão encerrada.");}
    if(!seed.ok||!seedBody.csrf)throw new Error(seedBody.erro||"Não foi possível iniciar a ação com segurança.");
    state.csrf=seedBody.csrf;
  }
  const rawBody=typeof Blob!=="undefined"&&options.body instanceof Blob;
  const headers={...(rawBody?{"Content-Type":options.body.type||"application/octet-stream"}:{"Content-Type":"application/json"}),...(options.headers||{})};
  if(mutating) headers["X-CSRF-Token"]=state.csrf;
  const r=await fetch(url,{credentials:"same-origin",...options,headers});
  let body={};try{body=await r.json();}catch{}
  if(r.status===401){location.href="/painel";throw new Error("Sessão encerrada.");}
  if(!r.ok) throw new Error(body.erro||"Não foi possível concluir a ação.");
  return body;
}
function el(tag,attrs={},children=[]){const node=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==="class")node.className=v;else if(k==="text")node.textContent=v;else if(k.startsWith("data-")||k.startsWith("aria-"))node.setAttribute(k,v);else node[k]=v;}for(const child of [].concat(children)){if(child!=null)node.append(child.nodeType?child:document.createTextNode(String(child)));}return node;}
const money=v=>v==null?"Preço a confirmar":Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const date=v=>v?new Date(v).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}):"Sem prazo";
function skeletons(target,n=3){target.replaceChildren(...Array.from({length:n},()=>el("div",{class:"skeleton"})));}
function empty(target,title,copy){target.replaceChildren(el("div",{class:"empty-card"},[el("h3",{text:title}),el("p",{text:copy})]));}
function errorCard(target,error){target.replaceChildren(el("div",{class:"error-card"},[el("h3",{text:"Não foi possível carregar"}),el("p",{text:error.message})]));}
function toast(message){const t=$("toast");t.textContent=message;t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,2800);}
function badge(priority){const labels={baixa:"Baixa",normal:"Normal",alta:"Atenção",critica:"Crítica"};const cls=priority==="critica"?"badge critical":priority==="alta"?"badge high":"badge";return el("span",{class:cls,text:labels[priority]||"Ação"});}

async function loadToday(force=false){if(state.loaded.today&&!force)return;const target=$("todayActions");skeletons(target);try{const data=await api("/painel/api/os/hoje");state.csrf=data.csrf||state.csrf;state.loaded.today=true;state.todayLoadedAt=Date.now();const c=data.counts||{};state.todayCounts=c;renderCountsLine(c);$("todaySummary").textContent=data.actions?.length?`Encontrei ${data.actions.length} movimento${data.actions.length===1?"":"s"} que merece${data.actions.length===1?"":"m"} sua atenção.`:"Seu dia está sob controle. Posso analisar a carteira ou registrar um novo movimento.";updateGuide(c);renderActions(data.actions||[]);renderNovidade(data.novidade);}catch(e){errorCard(target,e);}}
/* Novidade do mercado: recompensa exógena diária — mudanças de preço VERIFICADAS pelo
   radar nos bairros da carteira. Sem mudança recente, o card simplesmente não existe
   (aparição rara e com motivo — Mestre dos Magos, não mural). */
function renderNovidade(n){const target=$("todayNews");if(!target)return;if(!n||!n.itens?.length)return target.replaceChildren();
  const cab=n.escopo==="carteira"?"Preços mudaram nos bairros da sua carteira":"Preços mudaram em Goiânia";
  const tipoRotulo=t=>({apartamento:"Apartamento",casa:"Casa",terreno:"Terreno",galpao:"Galpão",sala_comercial:"Sala comercial",loja:"Loja"})[t]||"Imóvel";
  const itens=n.itens.map(i=>{const queda=Number(i.para)<Number(i.de);
    const pct=i.variacaoPct!=null?` ${String(Math.abs(Number(i.variacaoPct))).replace(".",",")}%`:"";
    return el("div",{class:"news-item"},[
      el("p",{text:`${tipoRotulo(i.tipo)} no ${i.bairro}${i.area?` · ${i.area} m²`:""} — ${queda?"baixou":"subiu"}${pct}: de ${money(i.de)} para ${money(i.para)}`}),
      i.url?el("a",{class:"text-button as-link",href:i.url,target:"_blank",rel:"noopener",text:`Ver anúncio${i.portal?` (${i.portal})`:""} ↗`}):null,
    ]);});
  target.replaceChildren(el("article",{class:"action-card news-card"},[
    el("p",{class:"eyebrow",text:`Novidade do mercado · últimos ${n.janelaDias||7} dias`}),
    el("h3",{text:cab}),...itens,
    el("p",{class:"news-foot",text:"Mudança verificada: o MESMO anúncio (portal + id) reencontrado com preço novo em duas coletas. Use como argumento de precificação com seus proprietários."}),
  ]));}
/* Contadores em UMA linha tocável — resumo, não dashboard (decisão de 17/07). Revisão de
   melhorias da automelhoria mora no painel admin, fora da tela diária. */
function renderCountsLine(c){const target=$("todayCounts");if(!target)return;const partes=[[c.properties||0,n=>`${n} imóve${n===1?"l":"is"}`,"portfolio",null],[c.opportunities||0,n=>`${n} interessado${n===1?"":"s"}`,"portfolio","interessados"],[c.tasks||0,n=>`${n} pendência${n===1?"":"s"}`,"portfolio","pendencias"]];if(c.intelligence_signals>0)partes.push([c.intelligence_signals,n=>`✦ ${n} sinal(is) do radar`,"portfolio","radar"]);const nodes=[];partes.forEach(([v,rotulo,destino,filter],i)=>{if(i)nodes.push(document.createTextNode(" · "));const b=el("button",{class:"counts-link",type:"button",text:rotulo(v)});b.addEventListener("click",()=>{if(filter)state.portfolioFilter=filter;if(destino==="portfolio"&&state.loaded.portfolio)renderPortfolio();switchView(destino);});nodes.push(b);});target.replaceChildren(...nodes);}
/* Manchete, não mural: a ação nº 1 em destaque, 2 seguintes visíveis, o resto sob demanda. */
function renderActions(actions){const target=$("todayActions");if(!actions.length)return empty(target,"Comece pelo primeiro imóvel","Toque em ＋ Novo e descreva por texto ou voz — você confirma antes de salvar. A partir daí, o Hoje organiza seu dia sozinho.");const VISIVEIS=3;const cards=actions.map((a,i)=>actionCard(a,i===0));target.replaceChildren(...cards.slice(0,VISIVEIS));const resto=cards.slice(VISIVEIS);if(resto.length){const ver=el("button",{class:"card-action secondary",type:"button",text:`Ver todas (${actions.length})`});ver.addEventListener("click",()=>{ver.remove();target.append(...resto);});target.append(ver);}}
function actionCard(a,destaque){const action=el("button",{class:"card-action",type:"button",text:a.actionLabel||"Abrir"});if(a.source==="task")action.addEventListener("click",()=>completeTask(a.id,action));else if(a.entityType==="inventory_property"&&a.entityId)action.addEventListener("click",()=>openProperty(a.entityId));else if(a.entityType==="opportunity"&&a.stage==="visita_agendada"&&a.entityId)action.addEventListener("click",()=>openAssistantForScope({objectType:"visit",objectId:a.entityId,title:a.title},"Prepare esta visita. Monte um resumo objetivo do cliente e do imóvel, uma lista do que preciso confirmar, os argumentos sustentados pelos dados e cinco perguntas para fazer durante a visita.",true));else if(a.entityType==="opportunity"&&a.propertyId)action.addEventListener("click",()=>openProperty(a.propertyId,{tab:"comercial",oppId:a.entityId}));else action.addEventListener("click",()=>switchView(a.entityType==="inventory_property"?"portfolio":"relationships"));/* Gap e sinal não têm prazo — a data de criação vira idade honesta ("aberto há N dias") */
const abertoHa=v=>{if(!v)return "Sem prazo";const dias=Math.floor((Date.now()-new Date(v).getTime())/86400000);return dias<=0?"Aberto hoje":`Aberto há ${dias} dia${dias===1?"":"s"}`;};
return el("article",{class:"action-card"+(destaque?" is-headline":"")},[destaque?el("p",{class:"eyebrow",text:"Comece por esta"}):null,el("div",{class:"action-top"},[el("div",{},[el("h3",{text:a.title}),el("p",{text:a.reason})]),badge(a.priority)]),el("div",{class:"meta"},[el("span",{text:["property_gap","intelligence"].includes(a.source)?abertoHa(a.dueAt):date(a.dueAt)}),el("span",{text:a.source==="property_gap"?"Cadastro progressivo":a.source==="opportunity"?"Oportunidade":a.source==="intelligence"?"Radar do imóvel":a.source==="stale_property"?"Carteira parada":"Tarefa"})]),action]);}
async function completeTask(id,button){button.disabled=true;button.textContent="Concluindo…";try{await api(`/painel/api/os/tarefas/${id}/concluir`,{method:"POST",body:"{}"});toast("Tarefa concluída.");state.loaded.today=false;await loadToday(true);}catch(e){toast(e.message);button.disabled=false;button.textContent="Marcar como concluída";}}

/* Filtros rápidos da Carteira (item 15 do plano): determinísticos e EXPLICADOS —
   "parado" tem definição pública (sem interessado aberto e sem movimento há 14 dias),
   nunca um julgamento opaco. Contagem em cada filtro; vazio explica o critério. */
const PARADO_DIAS=14;
const FILTROS_CARTEIRA=[
  ["todos","Todos",()=>true,"Capture o primeiro imóvel por texto ou voz. Ele nascerá como prospecção e ganhará detalhes progressivamente."],
  ["prospeccao","Prospecção",p=>["prospect","visited"].includes(p.capture_stage),"Nenhum imóvel em prospecção ou visitado."],
  ["captados","Captados",p=>p.capture_stage==="captured","Nenhum imóvel captado ainda — avance o estágio no dossiê quando a autorização sair."],
  ["divulgacao","Em divulgação",p=>["ready_to_publish","qualified"].includes(p.capture_stage),"Nenhum imóvel pronto para divulgar ou qualificado."],
  ["interessados","Com interessados",p=>p.open_opportunities>0,"Nenhum imóvel com oportunidade aberta — registre interessados no dossiê."],
  ["pendencias","Com pendências",p=>p.pending_tasks>0,"Nenhuma pendência aberta na carteira. Cadastros em dia."],
  ["radar","Com sinais do radar",p=>p.intelligence_signals>0,"Nenhum sinal de mercado está ligado à carteira neste momento."],
  ["parados","Parados",p=>!(p.open_opportunities>0)&&!["sold","rented"].includes(p.capture_stage)&&(Date.now()-new Date(p.updated_at||p.created_at).getTime())>PARADO_DIAS*86400000,`Nenhum imóvel parado — parado aqui é quem está sem interessado aberto e sem movimento há mais de ${PARADO_DIAS} dias.`],
  ["desfecho","Vendidos/alugados",p=>["sold","rented"].includes(p.capture_stage),"Nenhum desfecho registrado ainda — eles ficam guardados aqui."],
];
function propertyCard(p){
  const abrir=el("button",{class:"card-action secondary",type:"button",text:"Abrir dossiê"});
  abrir.addEventListener("click",()=>openProperty(p.id));
  return el("article",{class:"entity-card"},[el("div",{class:"entity-top"},[el("div",{},[el("h3",{text:p.title||"Imóvel"}),el("p",{text:[p.neighborhood,p.owner_name?`Proprietário: ${p.owner_name}`:"Proprietário a vincular"].filter(Boolean).join(" · ")})]),el("span",{class:"badge",text:stageLabel(p.capture_stage)})]),el("div",{class:"meta"},[el("span",{text:money(p.asking_price)}),el("span",{text:`${p.pending_tasks||0} pendência(s)`}),el("span",{text:`${p.open_opportunities||0} oportunidade(s)`}),p.intelligence_signals?el("span",{class:"radar-count",text:`✦ ${p.intelligence_signals} sinal(is) do radar`}):null]),abrir]);
}
function renderPortfolio(){
  const rows=state.portfolioRows||[];
  $("portfolioFilters").replaceChildren(...FILTROS_CARTEIRA.map(([id,rotulo,pred])=>{
    const n=rows.filter(pred).length;
    const b=el("button",{class:"tab"+(state.portfolioFilter===id?" is-active":""),type:"button",text:`${rotulo} (${n})`});
    b.addEventListener("click",()=>{state.portfolioFilter=id;renderPortfolio();});
    return b;
  }));
  const alvo=$("portfolioList");
  const [,,pred,vazio]=FILTROS_CARTEIRA.find(f=>f[0]===state.portfolioFilter)||FILTROS_CARTEIRA[0];
  const filtrados=rows.filter(pred);
  if(!filtrados.length)return empty(alvo,rows.length?"Nada neste filtro":"Sua carteira ainda está vazia",vazio);
  alvo.replaceChildren(...filtrados.map(propertyCard));
}
async function loadPortfolio(){if(state.loaded.portfolio)return;const target=$("portfolioList");skeletons(target);try{const data=await api("/painel/api/os/carteira");state.loaded.portfolio=true;state.portfolioRows=data.properties||[];renderPortfolio();}catch(e){errorCard(target,e);}}
const stageLabel=s=>({prospect:"Prospecção",visited:"Visitado",captured:"Captado",ready_to_publish:"Pronto para divulgar",qualified:"Qualificado",inactive:"Inativo",sold:"Vendido",rented:"Alugado"})[s]||s;

async function loadRelationships(){if(state.loaded.relationships)return;const target=$("relationshipsList");skeletons(target);try{const data=await api("/painel/api/os/relacionamentos");state.loaded.relationships=true;const rows=data.contacts||[];if(!rows.length)return empty(target,"Nenhum relacionamento registrado","Proprietários e clientes aparecerão aqui quando forem capturados ou vinculados a uma oportunidade.");target.replaceChildren(...rows.map(c=>{const ask=el("button",{class:"card-action secondary",type:"button",text:"Perguntar sobre esta pessoa"});ask.addEventListener("click",()=>openAssistantForScope({objectType:"contact",objectId:c.id,title:c.name}));return el("article",{class:"entity-card"},[el("div",{class:"entity-top"},[el("div",{},[el("h3",{text:c.name}),el("p",{text:[typeLabel(c.type),c.phone?`Telefone final ${String(c.phone).slice(-4)}`:null].filter(Boolean).join(" · ")})]),el("span",{class:"badge",text:`${c.open_opportunities||0} aberta(s)`})]),el("div",{class:"meta"},[el("span",{text:c.last_interaction_at?`Última interação: ${date(c.last_interaction_at)}`:"Sem interação registrada"}),el("span",{text:c.source||"cadastro"})]),ask]);}));}catch(e){errorCard(target,e);}}
const typeLabel=t=>({proprietario:"Proprietário",comprador:"Comprador",locatario:"Locatário",investidor:"Investidor",parceiro:"Parceiro",incorporador:"Incorporador",fornecedor:"Fornecedor"})[t]||t;

function switchView(name){if(name!=="property")stopPropertyIntelligencePoll();document.querySelectorAll(".view").forEach(v=>{const active=v.dataset.view===name;v.hidden=!active;v.classList.toggle("is-active",active);});document.querySelectorAll(".nav-item[data-target]").forEach(b=>{const active=b.dataset.target===name;b.classList.toggle("is-active",active);if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});if(name==="today")loadToday();if(name==="portfolio")loadPortfolio();if(name==="relationships")loadRelationships();scrollTo({top:0,behavior:"smooth"});}

/* ---------------- D-4: captura por VOZ (Web Speech API, custo zero) ----------------
   A voz só PREENCHE o texto — interpretar e confirmar continuam manuais: nada é salvo
   sem confirmação, nem falando. Sem suporte (ex.: iOS antigo), o botão nem aparece. */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let rec=null,ouvindo=false;
function vozStatus(t){const s=$("voiceStatus");if(s)s.textContent=t;}
function vozParar(){ouvindo=false;if(rec){try{rec.stop();}catch{}}const b=$("voiceToggle");if(b){b.textContent="🎤 Falar em vez de digitar";b.classList.remove("is-listening");}vozStatus("");}
function vozIniciar(){
  rec=new SR();rec.lang="pt-BR";rec.continuous=true;rec.interimResults=true;
  rec.onresult=ev=>{
    let interim="";
    for(let i=ev.resultIndex;i<ev.results.length;i++){
      const r=ev.results[i];
      if(r.isFinal){const tx=r[0].transcript.trim();if(tx){const ta=$("captureText");ta.value=(ta.value.trim()+" "+tx).trim();}}
      else interim+=r[0].transcript;
    }
    vozStatus(interim?`Ouvindo: “${interim.trim()}”`:"Ouvindo… fale naturalmente.");
  };
  rec.onerror=ev=>{vozParar();vozStatus(ev.error==="not-allowed"?"Microfone sem permissão — libere nas configurações do navegador e tente de novo.":"A voz falhou agora — digite normalmente que funciona igual.");};
  rec.onend=()=>{if(ouvindo){try{rec.start();}catch{vozParar();}}}; /* Chrome corta sozinho em pausas — religa até o corretor mandar parar */
  ouvindo=true;rec.start();
  const b=$("voiceToggle");b.textContent="■ Parar de ouvir";b.classList.add("is-listening");
  vozStatus("Ouvindo… fale naturalmente.");
}
if(SR){const b=$("voiceToggle");b.hidden=false;b.addEventListener("click",()=>ouvindo?vozParar():vozIniciar());$("captureDialog").addEventListener("close",vozParar);}

function openCapture(){const d=$("captureDialog");$("captureStatus").textContent="";$("capturePreview").hidden=true;state.preview=null;d.showModal();setTimeout(()=>$("captureText").focus(),50);}
async function interpretCapture(){if(ouvindo)vozParar();const text=$("captureText").value.trim();const button=$("interpretCapture");button.disabled=true;button.textContent="Interpretando…";$("captureStatus").className="status";try{const data=await api("/painel/api/os/captura/interpretar",{method:"POST",body:JSON.stringify({text})});state.preview=data;renderPreview(data);$("captureStatus").textContent="Confira os dados. Nada foi salvo ainda.";}catch(e){$("captureStatus").className="status error";$("captureStatus").textContent=e.message;}finally{button.disabled=false;button.textContent="Interpretar cadastro";}}
function renderPreview(data){const p=data.property||{},o=data.owner||{};const fields=[["Tipo",typeLabelProperty(p.propertyType)],["Bairro",p.neighborhood||"A confirmar"],["Quartos",p.bedrooms??"A confirmar"],["Preço",money(p.askingPrice)],["Proprietário",o.name||"A confirmar"],["Permuta",p.acceptsSwap?"Aceita":"Não informada"]];$("previewFields").replaceChildren(...fields.map(([l,v])=>el("div",{class:"preview-field"},[el("small",{text:l}),el("strong",{text:String(v)})])));$("previewMissing").replaceChildren(...(data.missing||[]).map(x=>el("li",{text:x})));$("capturePreview").hidden=false;}
const typeLabelProperty=t=>({apartamento:"Apartamento",casa:"Casa",terreno:"Terreno",galpao:"Galpão",sala_comercial:"Sala comercial",fazenda:"Fazenda",loja:"Loja"})[t]||"A confirmar";
async function confirmCapture(){if(!state.preview)return;const button=$("confirmCapture");button.disabled=true;button.textContent="Criando imóvel…";try{const data=await api("/painel/api/os/captura/confirmar",{method:"POST",body:JSON.stringify(state.preview)});$("captureDialog").close();$("captureText").value="";state.preview=null;state.loaded.today=false;state.loaded.portfolio=false;toast(`${data.property.title} criado. Próximos passos preparados.`);switchView("today");await loadToday(true);}catch(e){$("captureStatus").className="status error";$("captureStatus").textContent=e.message;}finally{button.disabled=false;button.textContent="Confirmar e criar imóvel";}}

/* ---------------- D-1: dossiê do imóvel (Visão geral · Comercial · Arquivos · Histórico) ---------------- */
const tempLabel=t=>({quente:"🔥 Quente",morno:"Morno",frio:"Frio"})[t]||t;
const OPP_STAGES=[["novo_interessado","Novo interessado"],["em_qualificacao","Em qualificação"],["imovel_apresentado","Imóvel apresentado"],["visita_agendada","Visita agendada"],["visitou","Visitou"],["negociando","Negociando"],["proposta","Proposta"],["fechado","Fechado"],["perdido","Perdido"]];
const OBJECOES=[["preco","Preço"],["financiamento","Financiamento"],["documentacao","Documentação"],["localizacao","Localização"],["caracteristicas","Características do imóvel"],["comprou_outro","Comprou outro"],["desistiu","Desistiu da compra"],["sem_retorno","Parou de responder"]];
const oppStageLabel=s=>(OPP_STAGES.find(x=>x[0]===s)||[])[1]||s;
/* D-2: o interessado CAMINHA pelo funil dentro do dossiê — perdido exige objeção tipificada */
function oppCard(o){
  const fechado=o.stage==="fechado",perdido=o.stage==="perdido";
  const head=el("div",{class:"entity-top"},[el("div",{},[el("h3",{text:o.contact_name}),el("p",{text:[oppStageLabel(o.stage),perdido&&o.loss_reason?`motivo: ${(OBJECOES.find(x=>x[0]===o.loss_reason)||[])[1]||o.loss_reason}`:null,o.contact_phone?`tel. final ${String(o.contact_phone).slice(-4)}`:null].filter(Boolean).join(" · ")})]),el("span",{class:fechado?"badge":perdido?"badge critical":o.temperature==="quente"?"badge high":"badge",text:fechado?"🎉 Fechado":perdido?"Perdido":tempLabel(o.temperature)})]);
  const meta=el("div",{class:"meta"},[el("span",{text:`Desde ${date(o.created_at)}`}),el("span",{text:o.last_interaction_at?`Última interação: ${date(o.last_interaction_at)}`:"Sem interação registrada"}),el("span",{text:o.next_action_at?`Próximo passo: ${date(o.next_action_at)}`:"Sem próximo passo marcado"})]);
  const form=el("form",{class:"os-form"});
  const stage=el("select",{class:"os-select"});OPP_STAGES.forEach(([v,l])=>stage.append(el("option",{value:v,text:l,selected:o.stage===v})));
  const temp=el("select",{class:"os-select"});[["quente","🔥 Quente"],["morno","Morno"],["frio","Frio"]].forEach(([v,l])=>temp.append(el("option",{value:v,text:l,selected:o.temperature===v})));
  const prox=el("input",{class:"os-input",type:"date",value:o.next_action_at?String(o.next_action_at).slice(0,10):""});
  const motivoWrap=el("div",{hidden:o.stage!=="perdido"});
  const motivo=el("select",{class:"os-select"});OBJECOES.forEach(([v,l])=>motivo.append(el("option",{value:v,text:l,selected:o.loss_reason===v})));
  motivoWrap.append(el("label",{text:"Por que perdeu? (a objeção ensina o funil)"}),motivo);
  stage.addEventListener("change",()=>{motivoWrap.hidden=stage.value!=="perdido";});
  const btn=el("button",{class:"card-action secondary",type:"submit",text:"Salvar andamento"});
  form.append(el("label",{text:"Estágio"}),stage,el("label",{text:"Temperatura"}),temp,el("label",{text:"Próximo passo (data)"}),prox,motivoWrap,btn);
  form.addEventListener("submit",ev=>{ev.preventDefault();saveOpportunity(o.id,{stage:stage.value,temperature:temp.value,nextActionAt:prox.value,lossReason:stage.value==="perdido"?motivo.value:undefined},btn);});
  /* D-3 (FU-2): mensagem PRONTA do estágio — copiar ou abrir o WhatsApp; quem envia é você */
  const acoes=el("div",{class:"opp-actions"});
  if(o.mensagem){
    const msgBox=el("details",{class:"opp-msg"},[el("summary",{text:"Mensagem pronta para este estágio"}),el("p",{text:o.mensagem})]);
    const copiar=el("button",{class:"card-action secondary",type:"button",text:"⧉ Copiar mensagem"});
    copiar.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(o.mensagem);toast("Mensagem copiada — cole no WhatsApp. Depois toque em ✓ Registrei contato.");}catch{prompt("Copie:",o.mensagem);}});
    acoes.append(msgBox,copiar);
    if(o.contact_phone)acoes.append(el("a",{class:"card-action secondary as-link",href:`https://wa.me/${String(o.contact_phone).replace(/\D/g,"")}?text=${encodeURIComponent(o.mensagem)}`,target:"_blank",rel:"noopener",text:"Abrir no WhatsApp ↗"}));
  }
  const contato=el("button",{class:"card-action secondary",type:"button",text:"✓ Registrei contato"});
  contato.addEventListener("click",()=>markContacted(o.id,contato));
  if(o.stage==="visita_agendada"){
    const preparar=el("button",{class:"card-action",type:"button",text:"✦ Preparar esta visita"});
    preparar.addEventListener("click",()=>openAssistantForScope({objectType:"visit",objectId:o.id,title:`Visita · ${o.contact_name}`},"Prepare esta visita. Monte um resumo objetivo do cliente e do imóvel, uma lista do que preciso confirmar, os argumentos sustentados pelos dados e cinco perguntas para fazer durante a visita.",true));
    acoes.append(preparar);
  }
  acoes.append(contato);
  return el("article",{class:"entity-card","data-opp-id":o.id},[head,meta,acoes,form]);
}
async function markContacted(id,btn){
  btn.disabled=true;btn.textContent="Registrando…";
  try{await api(`/painel/api/os/oportunidades/${id}/contato`,{method:"POST",body:"{}"});toast("Contato registrado — o Hoje deixa de cobrar por 3 dias.");invalidateLists();await loadProperty();}
  catch(e){toast(e.message);btn.disabled=false;btn.textContent="✓ Registrei contato";}
}
async function saveOpportunity(id,dados,btn){
  btn.disabled=true;btn.textContent="Salvando…";
  try{
    const r=await api(`/painel/api/os/oportunidades/${id}/atualizar`,{method:"POST",body:JSON.stringify(dados)});
    toast(r.semMudanca?"Nada mudou no funil.":dados.stage==="fechado"?"Negócio fechado — parabéns! 🎉":"Funil atualizado.");
    invalidateLists();await loadProperty();
  }catch(e){toast(e.message);btn.disabled=false;btn.textContent="Salvar andamento";}
}
const stageOpts=[["prospect","Prospecção"],["visited","Visitado"],["captured","Captado"],["ready_to_publish","Pronto para divulgar"],["qualified","Qualificado"],["inactive","Inativo"],["sold","Vendido"],["rented","Alugado"]];
function invalidateLists(){state.loaded.today=false;state.loaded.portfolio=false;state.loaded.relationships=false;}
function stopPropertyIntelligencePoll(){if(state.property.pollTimer){clearTimeout(state.property.pollTimer);state.property.pollTimer=null;}}
function propertyViewActive(){const view=document.querySelector('.view[data-view="property"]');return !!view&&!view.hidden;}
function schedulePropertyIntelligencePoll(data){stopPropertyIntelligencePoll();const active=(data?.intelligence?.jobs||[]).some(j=>["pending","running"].includes(j.status));if(!active||!propertyViewActive())return;const propertyId=state.property.id;state.property.pollTimer=setTimeout(()=>{if(state.property.id===propertyId&&propertyViewActive())loadProperty({silent:true});},20000);}
function syncPropTabs(tab){document.querySelectorAll("#propTabs .tab").forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle("is-active",on);b.setAttribute("aria-selected",String(on));});}
/* opts.tab/opts.oppId: a cobrança do Hoje abre direto o card do interessado na aba Comercial */
function openProperty(id,opts={}){stopPropertyIntelligencePoll();state.property={id,data:null,tab:opts.tab||"geral",mercado:null,pollTimer:null,focusOpp:opts.oppId||null};syncPropTabs(state.property.tab);switchView("property");loadProperty();}
async function loadProperty({silent=false}={}){const body=$("propBody"),propertyId=state.property.id;if(!silent)skeletons(body,3);try{const data=await api(`/painel/api/os/imoveis/${propertyId}`);if(state.property.id!==propertyId)return;state.property.data=data;if(!state.property.mercado&&data.latestValuation)state.property.mercado={...data.latestValuation,sample:data.latestValuation.result?.sample};renderPropHead();renderPropTab();schedulePropertyIntelligencePoll(data);}catch(e){if(!silent)errorCard(body,e);else if(state.property.id===propertyId&&propertyViewActive())state.property.pollTimer=setTimeout(()=>loadProperty({silent:true}),40000);}}
function renderPropHead(){const p=state.property.data.property,signals=(state.property.data.intelligence?.findings||[]).filter(f=>f.status==="candidate"&&!intelligenceFeedbackArchived(f.feedback?.decision)).length;const ask=el("button",{class:"card-action secondary",type:"button",text:"Perguntar ao assistente sobre este imóvel"});ask.addEventListener("click",()=>openAssistantForScope({objectType:"property",objectId:p.id,title:p.title||"Imóvel"}));$("propHead").replaceChildren(el("p",{class:"eyebrow",text:`${stageLabel(p.capture_stage)} · ${typeLabelProperty(p.property_type)}`}),el("h1",{id:"propTitle",text:p.title||"Imóvel"}),el("p",{class:"hero-copy",text:[p.neighborhood||"Bairro a confirmar",money(p.asking_price),p.owner_name?`Proprietário: ${p.owner_name}`:"Proprietário a vincular"].join(" · ")}),signals?el("span",{class:"badge high",text:`✦ ${signals} sinal(is) para revisar`}):null,ask);}
function setTab(tab){state.property.tab=tab;syncPropTabs(tab);renderPropTab();}
function fieldCell(label,value){return el("div",{class:"field-cell"},[el("small",{text:label}),el("strong",{text:String(value)})]);}

const intelligenceKindLabel=k=>({possible_duplicate:"Possível duplicidade",price_change:"Mudança de preço",urgent_sale_signal:"Possível urgência",market_anomaly:"Anomalia de mercado",data_conflict:"Conflito de dados",source_gap:"Cobertura insuficiente",other:"Sinal exploratório"})[k]||"Sinal";
const intelligenceRelationLabel=r=>r==="direct"?"Sobre este imóvel":r==="comparable"?"Em um comparável deste imóvel":"No mesmo bairro";
const intelligenceCorrectedRelationLabel=r=>({direct:"sobre este imóvel",comparable:"apenas um comparável",neighborhood:"apenas contexto do bairro",unrelated:"não relacionado"})[r]||r;
const intelligenceConfidence=v=>Number(v)>=.85?"Confiança alta":Number(v)>=.7?"Confiança média":"Exploratório";
const intelligenceFeedbackLabel=d=>({confirmed:"✓ Confirmado por você",false_positive:"Marcado como incorreto",inconclusive:"Ainda inconclusivo",watching:"Em acompanhamento",expired:"Sinal expirado",wrong_scope:"Ligação com o imóvel está incorreta"})[d]||"Decisão registrada";
const intelligenceFeedbackReasonLabel=r=>({confirmed_by_source:"confirmado nas fontes",different_property:"é outro imóvel",different_unit:"é outra unidade",catalog_or_multi_listing:"catálogo ou vários anúncios",wrong_geography:"localização errada",wrong_transaction:"venda/aluguel incorreto",stale_source:"fonte desatualizada",unproven_price:"preço não comprovado",change_not_found:"mudança não encontrada",duplicate_signal:"sinal duplicado",insufficient_evidence:"evidência insuficiente",no_commercial_relevance:"sem relevância comercial",expired_signal:"perdeu a validade",legacy_review:"decisão da versão anterior",other:"outro motivo"})[r]||null;
const intelligenceFeedbackArchived=d=>["false_positive","expired","wrong_scope"].includes(d);
/* "Próximo passo" determinístico por tipo de sinal — o card diz o que FAZER, sem delegar a decisão a um chat */
const intelligenceNextStep=k=>({possible_duplicate:"Abra a fonte e confirme se é o mesmo imóvel antes de usar.",price_change:"Compare com o preço pedido e, se fizer sentido, avise o proprietário.",urgent_sale_signal:"Fale com o proprietário antes que outro corretor chegue.",market_anomaly:"Confira a fonte antes de citar em negociação.",data_conflict:"Verifique qual informação está certa na fonte original.",source_gap:"Considere divulgar este imóvel em mais canais.",other:"Abra a fonte e decida se vale acompanhar."})[k]||"Confira a fonte antes de usar em negociação.";
/* Sem decisão registrada = em acompanhamento. Por isso 3 ações bastam:
   É isso mesmo · Não é isso · Depois — a taxonomia completa fica no banco. */
function signalCard(f,d,{archived=false}={}){
  const sources=(f.evidence||[]).map(e=>el("a",{href:e.url,target:"_blank",rel:"noopener",text:e.title||e.domain||"Abrir fonte"}));
  const actions=el("div",{class:"signal-actions"});
  if(f.feedback){
    const undo=el("button",{class:"text-button",type:"button",text:"Desfazer decisão"});
    undo.addEventListener("click",()=>undoPropertySignal(f.id,undo));
    actions.append(undo);
  }else if(!archived){
    const confirm=el("button",{class:"card-action secondary",type:"button",text:"É isso mesmo"});
    const incorrect=el("button",{class:"card-action secondary",type:"button",text:"Não é isso"});
    const later=el("button",{class:"text-button",type:"button",text:"Depois"});
    confirm.addEventListener("click",()=>reviewPropertySignal(f.id,"confirmed",confirm,{reason:"confirmed_by_source"}));
    incorrect.addEventListener("click",()=>openSignalFeedback(f.id));
    later.addEventListener("click",()=>reviewPropertySignal(f.id,"watching",later));
    actions.append(confirm,incorrect,later);
  }
  return el("article",{class:"entity-card signal-card"+(archived?" is-archived":"")},[
    el("div",{class:"entity-top"},[el("div",{},[el("p",{class:"eyebrow",text:intelligenceRelationLabel(f.relation)}),el("h3",{text:f.title})]),el("span",{class:Number(f.confidence)>=.85?"badge high":"badge",text:intelligenceConfidence(f.confidence)})]),
    el("div",{class:"meta"},[el("span",{text:intelligenceKindLabel(f.kind)}),f.feedback?.legacy?el("span",{text:"Decisão anterior migrada"}):null]),el("p",{text:f.summary}),
    !archived&&!f.feedback?el("p",{class:"signal-next",text:`Próximo passo: ${intelligenceNextStep(f.kind)}`}):null,
    f.feedback?el("div",{class:"signal-feedback",text:[intelligenceFeedbackLabel(f.feedback.decision),intelligenceFeedbackReasonLabel(f.feedback.reason),f.feedback.correction?.relation?`relação corrigida: ${intelligenceCorrectedRelationLabel(f.feedback.correction.relation)}`:null].filter(Boolean).join(" · ")}):null,
    sources.length?el("details",{class:"signal-sources"},[el("summary",{text:`Ver fontes (${sources.length})`}),el("div",{class:"source-links"},sources)]):null,actions,
  ]);
}
function intelligencePanel(d){
  const intel=d.intelligence||{findings:[],jobs:[]},allFindings=intel.findings||[],findings=allFindings.filter(f=>f.status!=="rejected"&&!intelligenceFeedbackArchived(f.feedback?.decision)),archived=allFindings.filter(f=>f.status==="rejected"||intelligenceFeedbackArchived(f.feedback?.decision)),jobs=intel.jobs||[],active=jobs.find(j=>["pending","running"].includes(j.status)),latest=jobs[0],coverage=latest?.result_summary||{};
  /* Copy de corretor: nada de "lote", contagem de evidências vai para "Ver detalhes" —
     modelo e pipeline nunca aparecem (regra: esconder modelos e estrutura administrativa) */
  const progress=active?.status==="running"?"Analisando — esta tela atualiza sozinha.":active?"Aguardando para começar. Esta tela atualiza sozinha.":latest?.status==="failed"?"A última investigação não concluiu. Você pode tentar novamente.":null;
  const request=el("button",{class:"card-action",type:"button",text:active?"Investigação em andamento":"Investigar este imóvel agora",disabled:!!active});
  request.addEventListener("click",()=>requestPropertyIntelligence(request));
  const intro=el("article",{class:"entity-card intelligence-card"},[
    el("div",{class:"entity-top"},[el("div",{},[el("p",{class:"eyebrow",text:"Radar do imóvel"}),el("h3",{text:findings.length?`${findings.length} sinal(is) para sua decisão`:archived.length?"Nenhum sinal ativo":"Nenhum sinal ligado ainda"})]),active?el("span",{class:"badge",text:active.status==="running"?"Analisando":"Na fila"}):null]),
    el("p",{text:findings.length?"Hipóteses rastreáveis encontradas na internet e no acervo. Confira as fontes antes de usar em negociação.":archived.length?"Os sinais anteriores já foram revisados. Você pode consultar ou desfazer as decisões no histórico abaixo.":"Peça uma investigação focada neste imóvel. O radar buscará anúncios correspondentes, reprecificação, conflitos e comparáveis."}),
    progress?el("p",{class:"status",text:progress}):null,coverage.collectedEvidence!=null?el("details",{class:"signal-sources"},[el("summary",{text:"Ver detalhes da investigação"}),el("div",{class:"meta coverage-meta"},[el("span",{text:`${coverage.evidence||0} evidência(s) útil(eis)`}),el("span",{text:`${coverage.rejectedEvidence||0} descartada(s)`}),coverage.sources!=null?el("span",{text:`${coverage.sources} fonte(s)`}):null])]):null,request,
  ]);
  const cards=findings.map(f=>signalCard(f,d));
  const history=archived.length?el("details",{class:"signal-history"},[el("summary",{text:`Decisões anteriores (${archived.length})`}),el("div",{class:"stack"},archived.map(f=>signalCard(f,d,{archived:true}))) ]):null;
  return el("section",{class:"intelligence-stack"},[intro,...cards,history]);
}
async function requestPropertyIntelligence(btn){
  btn.disabled=true;btn.textContent="Colocando na fila…";
  try{const r=await api(`/painel/api/os/imoveis/${state.property.id}/inteligencia/investigar`,{method:"POST",body:"{}"});state.property.data.intelligence.jobs.unshift(r.job);toast("Investigação solicitada. O radar começa em até 10 minutos.");renderPropHead();renderPropTab();schedulePropertyIntelligencePoll(state.property.data);}
  catch(e){toast(e.message);btn.disabled=false;btn.textContent="Investigar este imóvel agora";}
}
function openSignalFeedback(findingId){const dialog=$("signalFeedbackDialog");dialog.dataset.findingId=findingId;$("signalFeedbackReason").value="";$("signalFeedbackRelation").value="";$("signalFeedbackNote").value="";$("signalFeedbackStatus").textContent="";$("saveSignalFeedback").disabled=false;dialog.showModal();setTimeout(()=>$("signalFeedbackReason").focus(),50);}
async function reviewPropertySignal(findingId,decision,btn,extra={}){
  btn.disabled=true;
  try{await api(`/painel/api/os/imoveis/${state.property.id}/inteligencia/${findingId}/revisar`,{method:"POST",body:JSON.stringify({decision,...extra})});if($("signalFeedbackDialog").open)$("signalFeedbackDialog").close();invalidateLists();await loadProperty({silent:true});toast(decision==="confirmed"?"Sinal confirmado — esta decisão vai calibrar o radar.":decision==="watching"?"Sinal colocado em acompanhamento.":decision==="inconclusive"?"Sinal mantido como inconclusivo.":"Correção registrada no histórico.");}
  catch(e){toast(e.message);btn.disabled=false;$("signalFeedbackStatus").textContent=e.message;}
}
async function undoPropertySignal(findingId,btn){
  btn.disabled=true;
  try{await api(`/painel/api/os/imoveis/${state.property.id}/inteligencia/${findingId}/desfazer`,{method:"POST"});invalidateLists();await loadProperty({silent:true});toast("Decisão desfeita. O sinal voltou para revisão.");}
  catch(e){toast(e.message);btn.disabled=false;}
}
async function submitSignalFeedback(event){
  event.preventDefault();const dialog=$("signalFeedbackDialog"),findingId=dialog.dataset.findingId,reason=$("signalFeedbackReason").value,relation=$("signalFeedbackRelation").value,note=$("signalFeedbackNote").value.trim(),button=$("saveSignalFeedback");
  if(!reason){$("signalFeedbackStatus").textContent="Escolha o motivo da correção.";return;}
  const decision=reason==="expired_signal"?"expired":["different_property","different_unit"].includes(reason)?"wrong_scope":"false_positive";
  await reviewPropertySignal(findingId,decision,button,{reason,correction:relation?{relation}:{},note});
}

function renderPropTab(){
  const d=state.property.data;if(!d)return;
  const p=d.property,ch=p.characteristics||{},body=$("propBody");
  if(state.property.tab==="geral"){
    const pend=(d.tasks||[]).filter(t=>!["concluida","cancelada"].includes(t.status));
    const grid=el("div",{class:"field-grid"},[
      fieldCell("Tipo",typeLabelProperty(p.property_type)),fieldCell("Bairro",p.neighborhood||"A confirmar"),
      fieldCell("Quartos",ch.bedrooms??"A confirmar"),fieldCell("Área (m²)",ch.areaM2??"A confirmar"),
      fieldCell("Preço pedido",money(p.asking_price)),fieldCell("Permuta",(p.commercial_conditions||{}).acceptsSwap?"Aceita":"Não informada"),
      fieldCell("Proprietário",p.owner_name||"A vincular"),fieldCell("Telefone",p.owner_phone?`final ${String(p.owner_phone).slice(-4)}`:"A confirmar"),
    ]);
    const pendCards=pend.map(t=>{const btn=el("button",{class:"card-action secondary",type:"button",text:"Marcar como resolvida"});btn.addEventListener("click",()=>completePropTask(t.id,btn));return el("article",{class:"action-card"},[el("div",{class:"action-top"},[el("div",{},[el("h3",{text:t.title}),el("p",{text:`Prazo: ${date(t.due_at)}`})]),badge(t.priority)]),btn]);});
    const form=el("form",{class:"os-form",id:"propForm"});
    form.append(
      el("label",{text:"Bairro"}),el("input",{class:"os-input",name:"neighborhood",value:p.neighborhood||"",placeholder:"ex.: Setor Bueno"}),
      el("label",{text:"Endereço (rua e número)"}),el("input",{class:"os-input",name:"address",value:p.address||"",placeholder:"ex.: Rua T-37, 1000"}),
      el("label",{text:"Preço pedido (R$)"}),el("input",{class:"os-input",name:"askingPrice",inputMode:"numeric",value:p.asking_price!=null?String(Math.round(p.asking_price)):"",placeholder:"ex.: 890000"}),
      el("label",{text:"Quartos"}),el("input",{class:"os-input",name:"bedrooms",inputMode:"numeric",value:ch.bedrooms??"",placeholder:"ex.: 3"}),
      el("label",{text:"Área (m²)"+(p.property_type==="apartamento"?" — privativa":"")}),el("input",{class:"os-input",name:"areaM2",inputMode:"numeric",value:ch.areaM2??"",placeholder:p.property_type==="apartamento"?"a privativa do anúncio, nunca a total do condomínio":"ex.: 220"}),
      el("label",{text:"Estágio da captação"}),(()=>{const s=el("select",{class:"os-select",name:"captureStage"});stageOpts.forEach(([v,l])=>s.append(el("option",{value:v,text:l,selected:p.capture_stage===v})));return s;})());
    if(!p.owner_contact_id)form.append(
      el("label",{text:"Proprietário (nome)"}),el("input",{class:"os-input",name:"ownerName",placeholder:"vincular agora evita perder o contato"}),
      el("label",{text:"Proprietário (telefone)"}),el("input",{class:"os-input",name:"ownerPhone",inputMode:"tel",placeholder:"ex.: (62) 9 9999-0000"}));
    const save=el("button",{class:"primary-button",type:"submit",text:"Salvar alterações"});
    form.append(save);
    form.addEventListener("submit",ev=>{ev.preventDefault();saveProperty(form,save);});
    /* Dados do imóvel PRIMEIRO; o radar apoia a decisão, não abre a página */
    body.replaceChildren(
      el("article",{class:"entity-card"},[el("h3",{text:"Dados do imóvel"}),grid]),
      pend.length?el("div",{},[el("p",{class:"eyebrow",text:`Pendências (${pend.length})`}),el("div",{class:"stack"},pendCards)]):el("div",{class:"empty-card"},[el("h3",{text:"Nenhuma pendência aberta"}),el("p",{text:"O cadastro deste imóvel está em dia para o estágio atual."})]),
      el("article",{class:"entity-card"},[el("h3",{text:"Completar cadastro"}),el("p",{text:"Pendências que a atualização resolver se concluem sozinhas."}),form]),
      intelligencePanel(d));
  }else if(state.property.tab==="comercial"){
    const ops=(d.opportunities||[]).map(o=>oppCard(o));
    const form=el("form",{class:"os-form"});
    const nome=el("input",{class:"os-input",name:"name",placeholder:"Nome do interessado"});
    const tel=el("input",{class:"os-input",name:"phone",inputMode:"tel",placeholder:"Telefone (opcional)"});
    const temp=el("select",{class:"os-select",name:"temperature"});[["quente","🔥 Quente"],["morno","Morno"],["frio","Frio"]].forEach(([v,l])=>temp.append(el("option",{value:v,text:l,selected:v==="morno"})));
    const btn=el("button",{class:"primary-button",type:"submit",text:"Registrar interessado"});
    form.append(el("label",{text:"Nome"}),nome,el("label",{text:"Telefone"}),tel,el("label",{text:"Temperatura"}),temp,btn);
    form.addEventListener("submit",ev=>{ev.preventDefault();addOpportunity({name:nome.value,phone:tel.value,temperature:temp.value},btn);});
    body.replaceChildren(
      el("article",{class:"entity-card",id:"mercadoCard"},[el("h3",{text:"Referência de mercado"}),el("p",{text:"Compara com ofertas anunciadas publicamente (OLX, Zap, Viva Real). Ofertas não são transações e não substituem avaliação profissional."}),mercadoAcao(p,ch)]),
      ops.length?el("div",{},[el("p",{class:"eyebrow",text:`Interessados (${ops.length})`}),el("div",{class:"stack"},ops)]):el("div",{class:"empty-card"},[el("h3",{text:"Nenhum interessado registrado"}),el("p",{text:"Registre abaixo quem demonstrou interesse — a oportunidade passa a ser cobrada na tela Hoje."})]),
      el("article",{class:"entity-card"},[el("h3",{text:"Novo interessado"}),form]));
    if(state.property.mercado)renderMercado(state.property.mercado);
    /* Deep-link do Hoje: rola até o interessado cobrado com a mensagem pronta já aberta */
    if(state.property.focusOpp){const alvoOpp=body.querySelector(`[data-opp-id="${state.property.focusOpp}"]`);if(alvoOpp){alvoOpp.querySelector("details.opp-msg")?.setAttribute("open","");alvoOpp.classList.add("is-focused");setTimeout(()=>alvoOpp.scrollIntoView({behavior:"smooth",block:"center"}),80);}state.property.focusOpp=null;}
  }else if(state.property.tab==="arquivos"){
    renderPropertyFiles(d,body);
  }else{
    const evs=(d.events||[]);
    body.replaceChildren(evs.length?el("div",{class:"entity-card"},[el("div",{class:"timeline"},evs.map(e=>el("div",{class:"timeline-item"},[el("time",{text:new Date(e.occurred_at).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}),el("p",{text:e.rotulo})])))]):el("div",{class:"empty-card"},[el("h3",{text:"Sem eventos ainda"}),el("p",{text:"Cada mudança relevante deste imóvel ficará registrada aqui, com data — a linha do tempo é a prova do seu trabalho."})]));
  }
}
const documentStatus=d=>d.status==="indexed"?"Pronto para consultar":d.status==="reviewed"?"Revisado":d.status==="extracted"?"Texto extraído":d.status==="extracting"?"Processando":d.status==="error"?"Não foi possível ler":d.extraction_method==="ocr-pending"?"Guardado · leitura da imagem pendente":"Guardado";
const fileSize=value=>{const n=Number(value||0);return n>=1048576?`${(n/1048576).toLocaleString("pt-BR",{maximumFractionDigits:1})} MB`:n?`${Math.ceil(n/1024)} KB`:"Tamanho não informado";};
function renderPropertyFiles(d,body){
  const rows=d.documents||[],input=el("input",{class:"os-input",type:"file",multiple:true,accept:".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"});
  const send=el("button",{class:"primary-button",type:"button",text:"Adicionar ao dossiê"});
  send.addEventListener("click",()=>uploadPropertyDocuments(input,send));
  const uploader=el("article",{class:"entity-card"},[el("h3",{text:"Adicionar arquivos do imóvel"}),el("p",{text:"PDF, Word, texto ou imagem, até 8 MB por arquivo. PDF e Word são lidos localmente; nenhum arquivo é enviado ao K3 durante o cadastro."}),el("div",{class:"file-picker"},[input,send]),el("p",{class:"field-help",text:"Documentos ficam privados na VPS. O assistente recebe somente trechos relacionados à sua pergunta."})]);
  const cards=rows.map(d=>el("article",{class:"entity-card document-row"},[el("div",{class:"entity-top"},[el("div",{},[el("h3",{text:d.file_name}),el("p",{text:[fileSize(d.byte_size),d.page_count?`${d.page_count} página(s)`:null].filter(Boolean).join(" · ")})]),el("span",{class:d.status==="error"?"badge critical":"badge",text:documentStatus(d)})]),el("a",{class:"card-action secondary as-link",href:d.download_url,text:"Baixar arquivo"})]));
  const readable=rows.some(x=>["extracted","indexed","reviewed"].includes(x.status));
  const analyze=readable?el("button",{class:"card-action",type:"button",text:"✦ Analisar documentos com o assistente"}):null;
  analyze?.addEventListener("click",()=>openAssistantForScope({objectType:"property",objectId:d.property.id,title:d.property.title||"Imóvel"},"Analise os documentos deste imóvel. Separe fatos, riscos aparentes e informações que ainda precisam de conferência. Cite o nome do arquivo e a página quando estiver disponível; não dê conclusão jurídica definitiva.",true));
  body.replaceChildren(...[uploader,analyze,rows.length?el("div",{},[el("p",{class:"eyebrow",text:`No dossiê (${rows.length})`}),el("div",{class:"stack"},cards)]):el("div",{class:"empty-card"},[el("h3",{text:"Nenhum arquivo neste imóvel"}),el("p",{text:"Comece pela matrícula, autorização de venda ou documento que ajude a preparar a negociação."})])].filter(Boolean));
}
async function uploadPropertyDocuments(input,button){
  const files=[...(input.files||[])];if(!files.length)return toast("Escolha pelo menos um arquivo.");
  if(files.some(file=>file.size>8*1024*1024))return toast("Cada arquivo pode ter no máximo 8 MB.");
  button.disabled=true;let done=0;
  try{
    for(const file of files){button.textContent=`Guardando ${done+1} de ${files.length}…`;await api(`/painel/api/os/imoveis/${state.property.id}/documentos`,{method:"POST",body:file,headers:{"X-File-Name":encodeURIComponent(file.name)}});done++;}
    input.value="";toast(`${done} arquivo${done===1?"":"s"} adicionado${done===1?"":"s"} ao dossiê.`);await loadProperty();
  }catch(error){toast(`${done?`${done} concluído(s). `:""}${error.message}`);await loadProperty();}
  finally{button.disabled=false;button.textContent="Adicionar ao dossiê";}
}
function mercadoAcao(p,ch){
  const pronto=p.transaction_type==="venda"&&["apartamento","casa"].includes(p.property_type)&&p.neighborhood&&ch.areaM2>0;
  if(!pronto){const faltas=[];if(p.transaction_type!=="venda")faltas.push("referência atual disponível apenas para venda");if(!["apartamento","casa"].includes(p.property_type))faltas.push("referência disponível para apartamento e casa");if(!p.neighborhood)faltas.push("confirme o bairro");if(!(ch.areaM2>0))faltas.push("informe a área na Visão geral");return el("p",{class:"field-help",text:`Para buscar: ${faltas.join(" · ")}.`});}
  const btn=el("button",{class:"card-action",type:"button",text:"Buscar referência agora"});
  btn.addEventListener("click",()=>buscarMercadoRef(btn));
  return btn;
}
async function buscarMercadoRef(btn){
  const p=state.property.data.property,ch=p.characteristics||{};
  btn.disabled=true;btn.textContent="Pesquisando a fundo… isso pode levar até 3 min";
  try{
    const d=await api(`/painel/api/os/imoveis/${p.id}/mercado`,{method:"POST",body:"{}",signal:AbortSignal.timeout(180000)});
    state.property.mercado=d;renderMercado(d);
  }catch(e){toast(e.message);}
  finally{btn.disabled=false;btn.textContent=state.property.mercado?"Pesquisar novamente":"Buscar referência agora";}
}
function mercadoAssistantAction(status){
  const p=state.property.data.property;
  const btn=el("button",{class:"card-action secondary market-result",type:"button",text:"Pedir uma análise ao assistente"});
  const pedido=status==="calculada"
    ? "Analise esta avaliação, critique os comparáveis e destaque riscos e próximos passos."
    : "Analise esta pesquisa de mercado insuficiente, explique as evidências encontradas e o melhor próximo passo.";
  btn.addEventListener("click",()=>openAssistantForScope({objectType:"property",objectId:p.id,title:p.title||"Imóvel"},pedido,true));
  return btn;
}
/* Gate de confiança dos comparáveis (decisão de 17/07, aceite P0): antes de usar o número,
   o corretor VÊ o que entrou e o que ficou de fora — bairro, área, quartos, preço, fonte,
   distância e motivo. Sem número secreto: o funil de exclusões é sempre visível. */
function compLinha(c,contexto=false){
  const dist=c.distanciaM!=null?(c.distanciaM<1000?`${c.distanciaM} m`:`${(c.distanciaM/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})} km`):null;
  const partes=[c.bairro,c.area?`${c.area} m²`:null,c.quartos!=null?`${c.quartos} quarto${c.quartos===1?"":"s"}`:null,
    c.preco?money(c.preco):null,c.pm2?`R$ ${Number(c.pm2).toLocaleString("pt-BR")}/m²`:null,dist,c.portal||null,
    contexto?(c.motivoExclusao||"fora do cálculo"):null].filter(Boolean).join(" · ");
  return el("div",{class:"comp-row"},[el("span",{text:partes}),c.url?el("a",{href:c.url,target:"_blank",rel:"noopener",text:"abrir ↗"}):null]);
}
function painelComparaveis(d){
  const s=d.result?.sample||d.sample||{};
  const inclusos=d.comparaveis||[],outliers=d.outliers||[],contexto=d.result?.contextoRegional||d.contextoRegional||[];
  const funil=[[s.totalFound,"encontrada(s)"],[s.foraDoBairro,"de outro bairro — fora do cálculo"],
    [s.foraDaFaixaDeArea,"com área fora de 75%–133%"],[s.quartosIncompativeis,"com mais de 1 quarto de diferença"],
    [s.semArea,"sem área no anúncio"],[s.duplicadosAgrupados,"duplicada(s) entre portais"],
    [s.totalOutliers,"fora da cerca estatística"],[s.excluidosManual,"excluída(s) por você em revisão"]]
    .filter(([n])=>Number(n)>0);
  if(!inclusos.length&&!outliers.length&&!contexto.length&&!funil.length)return null;
  /* avaliação RESTAURADA não persiste a lista de ofertas — o rótulo usa o total do
     sample e a nota explica que a lista completa vem ao pesquisar de novo */
  const noCalculo=inclusos.length||Number(s.totalAccepted)||0;
  const rotulo=d.status==="calculada"?`Como esse número foi formado (${noCalculo} oferta(s) no cálculo)`:"O que a pesquisa encontrou e por que não há número";
  const det=el("details",{class:"signal-sources market-result comp-panel"},[el("summary",{text:rotulo})]);
  if(funil.length)det.append(el("div",{class:"meta"},funil.map(([n,l])=>el("span",{text:`${n} ${l}`}))));
  if(inclusos.length)det.append(el("p",{class:"eyebrow",text:"No cálculo"}),el("div",{class:"comp-list"},inclusos.map(c=>compLinha(c))));
  if(outliers.length)det.append(el("p",{class:"eyebrow",text:"Fora da cerca estatística"}),el("div",{class:"comp-list"},outliers.map(o=>compLinha({...o,motivoExclusao:o.razao||"outlier"},true))));
  if(contexto.length)det.append(el("p",{class:"eyebrow",text:"Contexto regional — nunca entra no valor"}),el("div",{class:"comp-list"},contexto.map(c=>compLinha(c,true))));
  if(!inclusos.length&&(d.result?.sample||d.sample))det.append(el("p",{class:"field-help",text:"A lista completa das ofertas aparece ao pesquisar novamente; este resumo vem da pesquisa registrada."}));
  det.append(el("p",{class:"field-help",text:"Revise as ofertas antes de usar o número em conversa ou documento — o relatório completo lista as mesmas evidências."}));
  return det;
}
function renderMercado(d){
  const card=$("mercadoCard");if(!card)return;
  card.querySelectorAll(".market-result").forEach(n=>n.remove());
  if(d.status==="amostra_insuficiente"){
    const n=d.sample?.aposDedup??0,min=d.sample?.minimoParaCalcular??5;
    const fontes=d.aoVivo?.portais||d.result?.pesquisa?.fontesConsultadas?.length||0;
    const box=el("div",{class:"market-safety market-result"},[
      el("strong",{text:"Pesquisa concluída. Seu relatório está pronto."}),
      el("p",{text:`Pesquisamos${fontes?` em ${fontes} fonte(s)`:" a fundo"} e encontramos ${n} oferta(s) compatível(is) no mesmo bairro.`}),
      el("p",{text:`Para calcular um preço com segurança são necessárias pelo menos ${min}. Por isso nenhum valor foi inventado — mas todas as evidências e exclusões estão no relatório.`}),
      d.id?el("a",{class:"card-action secondary as-link",href:`/motor/avaliacoes/${d.id}/documento`,target:"_blank",rel:"noopener",text:"Abrir relatório da pesquisa"}):null,
    ]);
    const painelIns=painelComparaveis(d);if(painelIns)card.append(painelIns);
    card.append(box,mercadoAssistantAction(d.status));return;
  }
  const r=d.result;if(!r)return;
  card.append(el("div",{class:"mercado-num market-result"},[el("strong",{text:money(r.estimatedValue)}),el("span",{text:`${money(r.probableRange?.minimum)} a ${money(r.probableRange?.maximum)} · ${r.sample?.totalAccepted??"—"} oferta(s) do mesmo bairro · confiança ${r.confidence?.rotulo||"—"}`}),el("span",{text:"Referência por ofertas públicas com filtro profissional; bairros diferentes ficam fora da conta."}),d.id?el("a",{class:"card-action secondary as-link",href:`/motor/avaliacoes/${d.id}/documento`,target:"_blank",rel:"noopener",text:"Abrir relatório completo"}):null]));
  const painel=painelComparaveis(d);if(painel)card.append(painel);
  card.append(mercadoAssistantAction(d.status));
}
async function saveProperty(form,btn){
  btn.disabled=true;btn.textContent="Salvando…";
  const f=new FormData(form);const campos={};
  for(const k of ["neighborhood","address","askingPrice","bedrooms","areaM2","captureStage","ownerName","ownerPhone"]){if(f.has(k))campos[k]=String(f.get(k)).trim();}
  try{
    const r=await api(`/painel/api/os/imoveis/${state.property.id}/atualizar`,{method:"POST",body:JSON.stringify(campos)});
    toast(r.semMudanca?"Nada para salvar — os dados já estavam assim.":"Cadastro atualizado.");
    invalidateLists();await loadProperty();
  }catch(e){toast(e.message);btn.disabled=false;btn.textContent="Salvar alterações";}
}
async function completePropTask(id,btn){btn.disabled=true;btn.textContent="Concluindo…";try{await api(`/painel/api/os/tarefas/${id}/concluir`,{method:"POST",body:"{}"});toast("Pendência resolvida.");invalidateLists();await loadProperty();}catch(e){toast(e.message);btn.disabled=false;btn.textContent="Marcar como resolvida";}}
async function addOpportunity(dados,btn){btn.disabled=true;btn.textContent="Registrando…";try{await api(`/painel/api/os/imoveis/${state.property.id}/oportunidade`,{method:"POST",body:JSON.stringify(dados)});toast("Interessado registrado — a tela Hoje passa a cobrar o retorno.");invalidateLists();state.property.tab="comercial";await loadProperty();}catch(e){toast(e.message);btn.disabled=false;btn.textContent="Registrar interessado";}}

/* Assistente privado: sessão geral criada sob demanda. Modelos e ferramentas nunca aparecem na UX. */
function storageGet(key){try{return localStorage.getItem(key);}catch{return null;}}
function storageSet(key,value){try{localStorage.setItem(key,value);}catch{}}
function updateGuide(counts=state.todayCounts){
  const card=$("guideCard");if(!card)return;
  /* guia é de primeiro uso: some sozinho quando os passos foram cumpridos, não só no ×.
     Exceção: "0" = o corretor reabriu pelo "?" — pedido explícito vence o auto-esconder. */
  const flag=storageGet("ci-guide-hidden");
  const concluiu=Number(counts.properties||0)>0&&storageGet("ci-guide-assistant")==="1";
  card.hidden=flag==="1"||(flag!=="0"&&concluiu);
  $("guideCapture")?.classList.toggle("is-done",Number(counts.properties||0)>0);
  $("guideAssistant")?.classList.toggle("is-done",storageGet("ci-guide-assistant")==="1");
}
function showGuide(){storageSet("ci-guide-hidden","0");const card=$("guideCard");if(card){card.hidden=false;card.scrollIntoView({behavior:"smooth",block:"center"});}}
function appendAssistantMessage(role,text,extra=""){
  const target=$("assistantMessages");target.querySelector(".assistant-empty")?.remove();
  const message=el("div",{class:`assistant-message ${role} ${extra}`.trim(),text});target.append(message);target.scrollTop=target.scrollHeight;return message;
}
function assistantEmpty(){return el("p",{class:"assistant-empty",text:"A conversa começa quando você enviar o primeiro pedido. Esta versão consulta dados, mas não altera nada."});}
function openAssistant(prompt="",load=true){const dialog=$("assistantDialog");if(prompt)$("assistantInput").value=prompt;if(!dialog.open)dialog.showModal();if(load&&!state.assistant.loaded)loadAssistantSessions();setTimeout(()=>$("assistantInput").focus(),50);}
const sessionTypeLabel=type=>({general:"Conversa geral",property:"Imóvel",contact:"Cliente",valuation:"Avaliação",visit:"Visita",investment:"Investimento"})[type]||"Conversa";
/* O conceito de "sessão" nunca aparece: um chip diz sobre o que se fala e um botão volta
   à conversa geral. O contexto é escolhido pelos botões da aplicação, não por um seletor. */
function renderAssistantSessions(){
  const chip=$("assistantScopeChip"),back=$("assistantGeneralBtn");if(!chip)return;
  const scope=state.assistant.scope||{objectType:"general"};
  const geral=scope.objectType==="general";
  chip.textContent=geral?"Conversa geral":`Falando sobre: ${scope.title}`;
  if(back)back.hidden=geral;
}
async function loadAssistantHistory(sessionId){
  if(!sessionId||sessionId==="__general__")return;
  const data=await api(`/painel/api/os/assistente/sessoes/${sessionId}`);
  state.assistant.sessionId=data.session.id;
  state.assistant.scope={objectType:data.session.object_type,objectId:data.session.object_id,title:data.session.title};
  $("assistantContext").textContent=data.session.object_type==="general"?"Conversa geral":sessionTypeLabel(data.session.object_type)+" · "+data.session.title;
  const target=$("assistantMessages");target.replaceChildren(...((data.messages||[]).length?(data.messages||[]).map(m=>el("div",{class:`assistant-message ${m.role}`,text:m.content})):[assistantEmpty()]));target.scrollTop=target.scrollHeight;
  renderAssistantSessions();
}
async function loadAssistantSessions(preferredId=null){
  try{
    const data=await api("/painel/api/os/assistente/sessoes");state.assistant.sessions=data.sessions||[];state.assistant.loaded=true;
    renderAssistantSessions();
    /* Abrir pelo botão do nav sempre cai na conversa geral; um objeto só entra em foco
       quando o corretor toca em "Perguntar sobre..." dentro do imóvel ou do cliente. */
    const wanted=preferredId||state.assistant.sessionId;
    if(wanted&&state.assistant.sessions.some(s=>s.id===wanted))await loadAssistantHistory(wanted);
    else {const general=state.assistant.sessions.find(s=>s.object_type==="general");if(general)await loadAssistantHistory(general.id);}
  }catch{state.assistant.loaded=true;renderAssistantSessions();}
}
async function ensureAssistantSession(){
  if(state.assistant.sessionId)return state.assistant.sessionId;
  const scope=state.assistant.scope||{objectType:"general",objectId:null,title:"Conversa geral"};
  const result=await api("/painel/api/os/assistente/sessoes",{method:"POST",body:JSON.stringify(scope)});
  state.assistant.sessionId=result.session.id;await loadAssistantSessions(result.session.id);return result.session.id;
}
async function openAssistantForScope(scope,prompt="",autoSend=false){
  /* erro ao abrir o escopo (ex.: visita cujo estágio mudou) reverte para o estado
     anterior — o diálogo nunca fica preso em "Abrindo…" */
  const anterior={scope:state.assistant.scope,sessionId:state.assistant.sessionId};
  openAssistant(prompt,false);state.assistant.scope=scope;state.assistant.sessionId=null;
  $("assistantContext").textContent="Abrindo "+sessionTypeLabel(scope.objectType).toLowerCase()+"…";
  try{
    const result=await api("/painel/api/os/assistente/sessoes",{method:"POST",body:JSON.stringify(scope)});
    await loadAssistantSessions(result.session.id);
    if(autoSend)await submitAssistant();
  }catch(error){
    state.assistant.scope=anterior.scope||{objectType:"general",objectId:null,title:"Conversa geral"};
    state.assistant.sessionId=anterior.sessionId;
    renderAssistantSessions();
    $("assistantContext").textContent=state.assistant.scope.objectType==="general"?"Conversa geral":sessionTypeLabel(state.assistant.scope.objectType)+" · "+state.assistant.scope.title;
    toast(error.message);
  }
}
async function submitAssistant(event){
  event?.preventDefault();if(state.assistant.busy)return;
  const input=$("assistantInput"),text=input.value.trim();if(!text)return;
  state.assistant.busy=true;$("sendAssistant").disabled=true;input.disabled=true;let waiting=null;
  try{
    const sessionId=await ensureAssistantSession();
    appendAssistantMessage("user",text);input.value="";
    waiting=appendAssistantMessage("assistant","Consultando somente os dados necessários…","waiting");
    const result=await api(`/painel/api/os/assistente/sessoes/${sessionId}/mensagens`,{method:"POST",body:JSON.stringify({message:text})});
    waiting.classList.remove("waiting");waiting.textContent=result.reply;storageSet("ci-guide-assistant","1");updateGuide();
  }catch(error){if(!waiting)waiting=appendAssistantMessage("assistant","");waiting.classList.remove("waiting");waiting.textContent=`Não foi possível responder agora. ${error.message}`;}
  finally{state.assistant.busy=false;$("sendAssistant").disabled=false;input.disabled=false;input.focus();$("assistantMessages").scrollTop=$("assistantMessages").scrollHeight;}
}
async function askFromHome(event){event.preventDefault();const input=$("homeAssistantInput"),prompt=input.value.trim();if(!prompt)return;input.value="";await openAssistantForScope({objectType:"general",objectId:null,title:"Conversa geral"},prompt,true);}
function prefillAssistant(prompt){openAssistantForScope({objectType:"general",objectId:null,title:"Conversa geral"},prompt);}
const hour=new Date().getHours();$("dayGreeting").textContent=`${hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite"}, Bruno`;
$("openAssistantNav").addEventListener("click",()=>openAssistant());
$("homeAssistantForm").addEventListener("submit",askFromHome);
document.querySelectorAll("[data-home-prompt]").forEach(button=>button.addEventListener("click",()=>prefillAssistant(button.dataset.homePrompt)));
$("guideCapture").addEventListener("click",openCapture);
$("guideAssistant").addEventListener("click",()=>openAssistantForScope({objectType:"general",objectId:null,title:"Conversa geral"},"Analise minha situação atual e me diga o melhor primeiro passo."));
$("dismissGuide").addEventListener("click",()=>{storageSet("ci-guide-hidden","1");$("guideCard").hidden=true;});
$("openGuide").addEventListener("click",showGuide);
$("assistantForm").addEventListener("submit",submitAssistant);
$("signalFeedbackForm").addEventListener("submit",submitSignalFeedback);
$("cancelSignalFeedback").addEventListener("click",()=>$("signalFeedbackDialog").close());
$("assistantGeneralBtn").addEventListener("click",async()=>{if(state.assistant.busy)return;await openAssistantForScope({objectType:"general",objectId:null,title:"Conversa geral"});});
document.querySelectorAll("[data-assistant-prompt]").forEach(button=>button.addEventListener("click",()=>{$("assistantInput").value=button.dataset.assistantPrompt;$("assistantInput").focus();}));
document.querySelectorAll("#propTabs .tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
$("propBack").addEventListener("click",()=>switchView("portfolio"));

document.querySelectorAll(".nav-item[data-target]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.target)));
$("openCaptureTop").addEventListener("click",openCapture);$("interpretCapture").addEventListener("click",interpretCapture);$("confirmCapture").addEventListener("click",confirmCapture);$("refreshToday").addEventListener("click",()=>loadToday(true));
/* Aba que voltou ao foco em outro dia (ou >30 min) não pode mostrar o Hoje de ontem */
document.addEventListener("visibilitychange",()=>{if(document.visibilityState!=="visible"||!state.todayLoadedAt)return;const ultimo=new Date(state.todayLoadedAt);if(Date.now()-state.todayLoadedAt>30*60000||new Date().toDateString()!==ultimo.toDateString())loadToday(true);});
loadToday();loadAssistantSessions();
