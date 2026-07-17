"use strict";
const state={csrf:"",preview:null,loaded:{today:false,portfolio:false,relationships:false},property:{id:null,data:null,tab:"geral",mercado:null},portfolioRows:[],portfolioFilter:"todos",assistant:{sessionId:null,busy:false}};
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
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(mutating) headers["X-CSRF-Token"]=state.csrf;
  const r=await fetch(url,{credentials:"same-origin",...options,headers});
  let body={};try{body=await r.json();}catch{}
  if(r.status===401){location.href="/painel";throw new Error("Sessão encerrada.");}
  if(!r.ok) throw new Error(body.erro||"Não foi possível concluir a ação.");
  return body;
}
function el(tag,attrs={},children=[]){const node=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==="class")node.className=v;else if(k==="text")node.textContent=v;else if(k.startsWith("data-"))node.setAttribute(k,v);else node[k]=v;}for(const child of [].concat(children)){if(child!=null)node.append(child.nodeType?child:document.createTextNode(String(child)));}return node;}
const money=v=>v==null?"Preço a confirmar":Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const date=v=>v?new Date(v).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}):"Sem prazo";
function skeletons(target,n=3){target.replaceChildren(...Array.from({length:n},()=>el("div",{class:"skeleton"})));}
function empty(target,title,copy){target.replaceChildren(el("div",{class:"empty-card"},[el("h3",{text:title}),el("p",{text:copy})]));}
function errorCard(target,error){target.replaceChildren(el("div",{class:"error-card"},[el("h3",{text:"Não foi possível carregar"}),el("p",{text:error.message})]));}
function toast(message){const t=$("toast");t.textContent=message;t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,2800);}
function badge(priority){const labels={baixa:"Baixa",normal:"Normal",alta:"Atenção",critica:"Crítica"};const cls=priority==="critica"?"badge critical":priority==="alta"?"badge high":"badge";return el("span",{class:cls,text:labels[priority]||"Ação"});}

async function loadToday(force=false){if(state.loaded.today&&!force)return;const target=$("todayActions");skeletons(target);try{const data=await api("/painel/api/os/hoje");state.csrf=data.csrf||state.csrf;state.loaded.today=true;const c=data.counts||{};const cards=[[c.tasks||0,"ações pendentes"],[c.properties||0,"imóveis na carteira"],[c.contacts||0,"relacionamentos"],[c.opportunities||0,"oportunidades abertas"]];$("todayCounts").replaceChildren(...cards.map(([v,l])=>el("div",{class:"count-card"},[el("strong",{text:String(v)}),el("span",{text:l})])));$("todaySummary").textContent=data.actions?.length?`Há ${data.actions.length} item(ns) priorizado(s). O que está funcionando bem não ocupa espaço.`:"Nenhuma pendência crítica agora. Use Capturar para registrar o próximo movimento.";renderActions(data.actions||[]);await loadImprovements();}catch(e){errorCard(target,e);}}
function renderActions(actions){const target=$("todayActions");if(!actions.length)return empty(target,"Seu dia está limpo","Quando houver prazo, oportunidade ou cadastro incompleto, a próxima ação aparecerá aqui.");target.replaceChildren(...actions.map(a=>{const action=el("button",{class:"card-action",type:"button",text:a.actionLabel||"Abrir"});if(a.source==="task")action.addEventListener("click",()=>completeTask(a.id,action));else if(a.entityType==="inventory_property"&&a.entityId)action.addEventListener("click",()=>openProperty(a.entityId));else action.addEventListener("click",()=>switchView(a.entityType==="inventory_property"?"portfolio":"relationships"));return el("article",{class:"action-card"},[el("div",{class:"action-top"},[el("div",{},[el("h3",{text:a.title}),el("p",{text:a.reason})]),badge(a.priority)]),el("div",{class:"meta"},[el("span",{text:date(a.dueAt)}),el("span",{text:a.source==="property_gap"?"Cadastro progressivo":a.source==="opportunity"?"Oportunidade":"Tarefa"})]),action]);}));}
async function loadImprovements(){const section=$("improvementSection"),target=$("improvementList");try{const data=await api("/painel/api/os/melhorias");const rows=data.proposals||[];section.hidden=!rows.length;if(!rows.length)return;target.replaceChildren(...rows.map(p=>{const approve=el("button",{class:"card-action",type:"button",text:"Aprovar teste"});const reject=el("button",{class:"card-action secondary",type:"button",text:"Agora não"});approve.addEventListener("click",()=>reviewImprovement(p.id,"approved",approve));reject.addEventListener("click",()=>reviewImprovement(p.id,"rejected",reject));return el("article",{class:"improvement-card"},[el("div",{class:"action-top"},[el("div",{},[el("h3",{text:p.title}),el("p",{text:p.reason})]),el("span",{class:p.risk==="alto"?"badge critical":p.risk==="medio"?"badge high":"badge",text:`Risco ${p.risk}`})]),p.expected_benefit?el("p",{class:"benefit",text:`Benefício esperado: ${p.expected_benefit}`}):null,el("div",{class:"improvement-actions"},[approve,reject])]);}));}catch{section.hidden=true;}}
async function reviewImprovement(id,decision,button){button.disabled=true;try{await api(`/painel/api/os/melhorias/${id}/revisar`,{method:"POST",body:JSON.stringify({decision})});toast(decision==="approved"?"Teste autorizado. Nada foi aplicado em produção.":"Sugestão arquivada.");await loadImprovements();}catch(e){toast(e.message);button.disabled=false;}}
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
  ["parados","Parados",p=>!(p.open_opportunities>0)&&!["sold","rented"].includes(p.capture_stage)&&(Date.now()-new Date(p.updated_at||p.created_at).getTime())>PARADO_DIAS*86400000,`Nenhum imóvel parado — parado aqui é quem está sem interessado aberto e sem movimento há mais de ${PARADO_DIAS} dias.`],
  ["desfecho","Vendidos/alugados",p=>["sold","rented"].includes(p.capture_stage),"Nenhum desfecho registrado ainda — eles ficam guardados aqui."],
];
function propertyCard(p){
  const abrir=el("button",{class:"card-action secondary",type:"button",text:"Abrir dossiê"});
  abrir.addEventListener("click",()=>openProperty(p.id));
  return el("article",{class:"entity-card"},[el("div",{class:"entity-top"},[el("div",{},[el("h3",{text:p.title||"Imóvel"}),el("p",{text:[p.neighborhood,p.owner_name?`Proprietário: ${p.owner_name}`:"Proprietário a vincular"].filter(Boolean).join(" · ")})]),el("span",{class:"badge",text:stageLabel(p.capture_stage)})]),el("div",{class:"meta"},[el("span",{text:money(p.asking_price)}),el("span",{text:`${p.pending_tasks||0} pendência(s)`}),el("span",{text:`${p.open_opportunities||0} oportunidade(s)`})]),abrir]);
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

async function loadRelationships(){if(state.loaded.relationships)return;const target=$("relationshipsList");skeletons(target);try{const data=await api("/painel/api/os/relacionamentos");state.loaded.relationships=true;const rows=data.contacts||[];if(!rows.length)return empty(target,"Nenhum relacionamento registrado","Proprietários e clientes aparecerão aqui quando forem capturados ou vinculados a uma oportunidade.");target.replaceChildren(...rows.map(c=>el("article",{class:"entity-card"},[el("div",{class:"entity-top"},[el("div",{},[el("h3",{text:c.name}),el("p",{text:[typeLabel(c.type),c.phone?`Telefone final ${String(c.phone).slice(-4)}`:null].filter(Boolean).join(" · ")})]),el("span",{class:"badge",text:`${c.open_opportunities||0} aberta(s)`})]),el("div",{class:"meta"},[el("span",{text:c.last_interaction_at?`Última interação: ${date(c.last_interaction_at)}`:"Sem interação registrada"}),el("span",{text:c.source||"cadastro"})])])));}catch(e){errorCard(target,e);}}
const typeLabel=t=>({proprietario:"Proprietário",comprador:"Comprador",locatario:"Locatário",investidor:"Investidor",parceiro:"Parceiro",incorporador:"Incorporador",fornecedor:"Fornecedor"})[t]||t;

function switchView(name){document.querySelectorAll(".view").forEach(v=>{const active=v.dataset.view===name;v.hidden=!active;v.classList.toggle("is-active",active);});document.querySelectorAll(".nav-item[data-target]").forEach(b=>{const active=b.dataset.target===name;b.classList.toggle("is-active",active);if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});if(name==="today")loadToday();if(name==="portfolio")loadPortfolio();if(name==="relationships")loadRelationships();scrollTo({top:0,behavior:"smooth"});}

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
  acoes.append(contato);
  return el("article",{class:"entity-card"},[head,meta,acoes,form]);
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
function openProperty(id){state.property={id,data:null,tab:"geral",mercado:null};switchView("property");loadProperty();}
async function loadProperty(){const body=$("propBody");skeletons(body,3);try{const data=await api(`/painel/api/os/imoveis/${state.property.id}`);state.property.data=data;renderPropHead();renderPropTab();}catch(e){errorCard(body,e);}}
function renderPropHead(){const p=state.property.data.property;$("propHead").replaceChildren(el("p",{class:"eyebrow",text:`${stageLabel(p.capture_stage)} · ${typeLabelProperty(p.property_type)}`}),el("h1",{id:"propTitle",text:p.title||"Imóvel"}),el("p",{class:"hero-copy",text:[p.neighborhood||"Bairro a confirmar",money(p.asking_price),p.owner_name?`Proprietário: ${p.owner_name}`:"Proprietário a vincular"].join(" · ")}));}
function setTab(tab){state.property.tab=tab;document.querySelectorAll("#propTabs .tab").forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle("is-active",on);b.setAttribute("aria-selected",String(on));});renderPropTab();}
function fieldCell(label,value){return el("div",{class:"field-cell"},[el("small",{text:label}),el("strong",{text:String(value)})]);}

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
    body.replaceChildren(
      el("article",{class:"entity-card"},[el("h3",{text:"Dados do imóvel"}),grid]),
      pend.length?el("div",{},[el("p",{class:"eyebrow",text:`Pendências (${pend.length})`}),el("div",{class:"stack"},pendCards)]):el("div",{class:"empty-card"},[el("h3",{text:"Nenhuma pendência aberta"}),el("p",{text:"O cadastro deste imóvel está em dia para o estágio atual."})]),
      el("article",{class:"entity-card"},[el("h3",{text:"Completar cadastro"}),el("p",{text:"Pendências que a atualização resolver se concluem sozinhas."}),form]));
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
  }else if(state.property.tab==="arquivos"){
    body.replaceChildren(el("div",{class:"empty-card"},[el("h3",{text:"Fotos e documentos chegam na Fase 8"}),el("p",{text:"Arquivos entram com versão, aprovação e compartilhamento controlado — documento sensível não se improvisa. Até lá, mantenha fotos e PDFs no seu aparelho."})]));
  }else{
    const evs=(d.events||[]);
    body.replaceChildren(evs.length?el("div",{class:"entity-card"},[el("div",{class:"timeline"},evs.map(e=>el("div",{class:"timeline-item"},[el("time",{text:new Date(e.occurred_at).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}),el("p",{text:e.rotulo})])))]):el("div",{class:"empty-card"},[el("h3",{text:"Sem eventos ainda"}),el("p",{text:"Cada mudança relevante deste imóvel ficará registrada aqui, com data — a linha do tempo é a prova do seu trabalho."})]));
  }
}
function mercadoAcao(p,ch){
  const pronto=["apartamento","casa"].includes(p.property_type)&&p.neighborhood&&ch.areaM2>0;
  if(!pronto){const faltas=[];if(!["apartamento","casa"].includes(p.property_type))faltas.push("referência disponível para apartamento e casa");if(!p.neighborhood)faltas.push("confirme o bairro");if(!(ch.areaM2>0))faltas.push("informe a área na Visão geral");return el("p",{class:"field-help",text:`Para buscar: ${faltas.join(" · ")}.`});}
  const btn=el("button",{class:"card-action",type:"button",text:"Buscar referência agora"});
  btn.addEventListener("click",()=>buscarMercadoRef(btn));
  return btn;
}
async function buscarMercadoRef(btn){
  const p=state.property.data.property,ch=p.characteristics||{};
  btn.disabled=true;btn.textContent="Buscando nos portais… (até 2 min)";
  try{
    const r=await fetch("/motor/mercado",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({propertyType:p.property_type,neighborhood:p.neighborhood,areaM2:Number(ch.areaM2)}),signal:AbortSignal.timeout(120000)});
    const d=await r.json();if(!r.ok)throw new Error(d.erro||"busca indisponível agora");
    state.property.mercado=d;renderMercado(d);
  }catch(e){btn.disabled=false;btn.textContent="Buscar referência agora";toast(e.message);}
}
function renderMercado(d){
  const card=$("mercadoCard");if(!card)return;
  if(d.status==="amostra_insuficiente"){card.append(el("p",{class:"field-help",text:`Ainda sem amostra suficiente para comparar (${d.sample?.aposDedup??0} oferta(s), mínimo 5). O acervo engorda a cada varredura noturna.`}));return;}
  const r=d.result;if(!r)return;
  card.querySelector(".mercado-num")?.remove();
  card.append(el("div",{class:"mercado-num"},[el("strong",{text:money(r.estimatedValue)}),el("span",{text:`${money(r.probableRange?.minimum)} a ${money(r.probableRange?.maximum)} · ${r.sample?.totalAccepted??"—"} oferta(s) no cálculo · confiança ${r.confidence?.rotulo||"—"}`}),el("span",{text:" — referência por OFERTAS públicas; a avaliação completa mora no Radar."})]));
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
function appendAssistantMessage(role,text,extra=""){
  const target=$("assistantMessages");target.querySelector(".assistant-empty")?.remove();
  const message=el("div",{class:`assistant-message ${role} ${extra}`.trim(),text});target.append(message);target.scrollTop=target.scrollHeight;return message;
}
function openAssistant(){const dialog=$("assistantDialog");dialog.showModal();setTimeout(()=>$("assistantInput").focus(),50);}
async function ensureAssistantSession(){
  if(state.assistant.sessionId)return state.assistant.sessionId;
  const result=await api("/painel/api/os/assistente/sessoes",{method:"POST",body:JSON.stringify({objectType:"general",title:"Meu dia"})});
  state.assistant.sessionId=result.session.id;return result.session.id;
}
async function submitAssistant(event){
  event?.preventDefault();if(state.assistant.busy)return;
  const input=$("assistantInput"),text=input.value.trim();if(!text)return;
  state.assistant.busy=true;$("sendAssistant").disabled=true;input.disabled=true;appendAssistantMessage("user",text);input.value="";
  const waiting=appendAssistantMessage("assistant","Analisando apenas o contexto necessário…","waiting");
  try{
    const sessionId=await ensureAssistantSession();
    const result=await api(`/painel/api/os/assistente/sessoes/${sessionId}/mensagens`,{method:"POST",body:JSON.stringify({message:text})});
    waiting.classList.remove("waiting");waiting.textContent=result.reply;
  }catch(error){waiting.classList.remove("waiting");waiting.textContent=`Não foi possível responder agora. ${error.message}`;}
  finally{state.assistant.busy=false;$("sendAssistant").disabled=false;input.disabled=false;input.focus();$("assistantMessages").scrollTop=$("assistantMessages").scrollHeight;}
}
$("openAssistant").addEventListener("click",openAssistant);
$("openAssistantNav").addEventListener("click",openAssistant);
$("assistantForm").addEventListener("submit",submitAssistant);
document.querySelectorAll("[data-assistant-prompt]").forEach(button=>button.addEventListener("click",()=>{$("assistantInput").value=button.dataset.assistantPrompt;$("assistantInput").focus();}));
document.querySelectorAll("#propTabs .tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
$("propBack").addEventListener("click",()=>switchView("portfolio"));

document.querySelectorAll(".nav-item[data-target]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.target)));
$("openCaptureTop").addEventListener("click",openCapture);$("interpretCapture").addEventListener("click",interpretCapture);$("confirmCapture").addEventListener("click",confirmCapture);$("refreshToday").addEventListener("click",()=>loadToday(true));
loadToday();
