const KEY="ultreia-expenses-web-v1";
const DEFAULT_CATEGORIES=[
  {name:"Desayuno",icon:"🥐"},{name:"Comida",icon:"🥪"},{name:"Cena",icon:"🍽️"},
  {name:"Dormir",icon:"🛌"},{name:"Supermercado",icon:"🛒"},{name:"Otros",icon:"🐚"}
];
const PRESETS={
  camino:["Desayuno","Comida","Cena","Dormir","Supermercado","Otros"],
  viaje:["Transporte","Alojamiento","Comida","Entradas","Compras","Otros"],
  vacaciones:["Alojamiento","Comida","Transporte","Actividades","Compras","Otros"],
  mensual:["Vivienda","Alimentación","Transporte","Ocio","Salud","Otros"],
  personalizado:[]
};
const PRESET_ICONS={
  Desayuno:"🥐",Comida:"🥪",Cena:"🍽️",Dormir:"🛌",Supermercado:"🛒",Otros:"🐚",
  Transporte:"🚗",Alojamiento:"🛏️",Entradas:"🎟️",Compras:"🛍️",Actividades:"🎯",Vivienda:"🏠",Alimentación:"🛒",Ocio:"🎭",Salud:"❤️"
};
const ICON_OPTIONS=["🥐","🥪","🍽️","🛌","🛒","🚗","🚌","✈️","🛏️","🎟️","🛍️","🎯","🏠","🍎","☕","⛽","💊","🎭","📱","💶","🐚","📦","📌","⭐","🔧","🐾","🏖️","🏔️"];
let state=load();
let editingId=null;
let categoryReturn="summary";

function normalizeCategories(list){
  if(!Array.isArray(list))return [];
  const seen=new Set();
  return list.map(c=>typeof c==="string"?{name:c,icon:PRESET_ICONS[c]||"📌"}:{name:String(c?.name||"").trim(),icon:String(c?.icon||"📌")})
    .filter(c=>c.name&&!seen.has(c.name)&&seen.add(c.name));
}
function presetCategories(type){return (PRESETS[type]||PRESETS.camino).map(name=>({name,icon:PRESET_ICONS[name]||"📌"}));}
function ensurePlanCategories(plan){
  let cats=normalizeCategories(plan.categories);
  if(!cats.length)cats=DEFAULT_CATEGORIES.map(x=>({...x}));
  return {...plan,categories:cats,type:plan.type||"camino"};
}
function hasExpenses(){return state.expenses.length>0}
function applyTypeTemplate(type){
  state.plan.categories=type==="personalizado"?[]:presetCategories(type);
  save();
  renderPlanCategories();
}
function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY)||"{}");
    const oldPlan=x.plan||{};
    const plan=ensurePlanCategories({budget:Number(oldPlan.budget||0),start:oldPlan.start||null,end:oldPlan.end||null,title:String(oldPlan.title||"").toUpperCase(),type:oldPlan.type||"camino",categories:oldPlan.categories});
    return {expenses:Array.isArray(x.expenses)?x.expenses:[],plan};
  }catch{return {expenses:[],plan:ensurePlanCategories({budget:0,start:null,end:null,title:"",type:"camino",categories:[]})}}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function money(n){return Number(n||0).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €"}
function isoDate(d=new Date()){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function parseAmount(v){return Number(String(v).replace(",","."))}
function dateEs(s){if(!s)return "";const [y,m,d]=s.split("-");return `${d}/${m}/${y}`}
function dayExpenses(date){return state.expenses.filter(e=>e.date===date).reduce((a,e)=>a+e.amount,0)}
function total(){return state.expenses.reduce((a,e)=>a+e.amount,0)}
function daysInclusive(a,b){if(!a||!b)return 0;const x=new Date(a+"T00:00:00"),y=new Date(b+"T00:00:00");return y<x?0:Math.floor((y-x)/86400000)+1}
function remainingDays(){if(!state.plan.end)return 0;const today=isoDate();return today>state.plan.end?0:daysInclusive(today,state.plan.end)}
function periodBudget(){return Number(state.plan.budget||0)}
function remainingBudget(){return Math.max(0,periodBudget()-total())}
function dailyBudget(){
  const end=state.plan.end,start=state.plan.start,b=periodBudget();
  if(!start||!end||b<=0)return 0;
  const today=isoDate();
  if(today<start||today>end)return b/daysInclusive(start,end);
  const spentBefore=state.expenses.filter(e=>e.date>=start&&e.date<today).reduce((a,e)=>a+e.amount,0);
  return Math.max(0,b-spentBefore)/Math.max(1,daysInclusive(today,end));
}
function averageDaily(){if(!state.plan.start)return 0;const today=isoDate();if(today<state.plan.start)return 0;return total()/daysInclusive(state.plan.start,today)}
function pace(){
  const {start,end}=state.plan,b=periodBudget();
  if(!start||!end||b<=0)return ["—",""];
  const totalDays=daysInclusive(start,end),today=isoDate();
  if(today<start)return ["Antes del viaje",""];
  const elapsed=Math.min(totalDays,daysInclusive(start,today));
  const expected=b*elapsed/totalDays;
  const actual=state.expenses.filter(e=>e.date>=start&&e.date<=today).reduce((a,e)=>a+e.amount,0);
  const ratio=expected?actual/expected:0;
  if(Math.abs(ratio-1)<=.10)return ["En ritmo","on"];
  return ratio>1?["Por encima","high"]:["Por debajo","low"];
}
function getCategory(name){return state.plan.categories.find(c=>c.name===name)||{name,icon:PRESET_ICONS[name]||"📌"}}
function categoryIcon(name){return getCategory(name).icon}
function render(){
  document.getElementById("planTitle").textContent=state.plan.title||"";
  document.getElementById("planTitle").style.display=state.plan.title?"block":"none";
  const todaySpent=dayExpenses(isoDate()),todayEl=document.getElementById("today"),todayStat=document.getElementById("todayStat");
  todayEl.textContent=money(todaySpent);todayStat.classList.remove("today-under","today-over");
  const db=dailyBudget();if(db>0)todayStat.classList.add(todaySpent>db?"today-over":"today-under");
  document.getElementById("average").textContent=money(averageDaily());document.getElementById("total").textContent=money(total());
  document.getElementById("dailyBudget").textContent=money(db);
  const [p,cls]=pace(),paceEl=document.getElementById("pace");paceEl.innerHTML=`<span class="pace-dot">●</span><span>${p}</span>`;paceEl.className="pace "+cls;
  const b=periodBudget(),t=total();document.getElementById("progressBar").style.width=(b?Math.min(100,t/b*100):0)+"%";
  document.getElementById("remaining").textContent=`Presupuesto restante: ${money(remainingBudget())}`;
  document.getElementById("budgetInfo").textContent=b&&state.plan.start&&state.plan.end?`${money(b)} · ${remainingDays()} días restantes · ${dateEs(state.plan.start)} — ${dateEs(state.plan.end)}`:"Configura tu presupuesto y las fechas.";
  renderExpenses();
}
function categoryTotals(){
  return state.plan.categories.map(c=>({concept:c.name,sum:state.expenses.filter(e=>e.concept===c.name).reduce((a,e)=>a+e.amount,0),icon:c.icon})).sort((a,b)=>b.sum-a.sum);
}
function openCategories(){
  categoryReturn="summary";const box=document.getElementById("categorySummaryRows");box.innerHTML="";
  categoryTotals().forEach(({concept,sum,icon})=>{const b=document.createElement("button");b.className="category-modal-row";b.innerHTML=`<span class="emoji">${icon}</span><span class="name">${escapeHtml(concept)}</span><span class="value">${money(sum)}</span><span class="arrow">›</span>`;b.onclick=()=>showCategory(concept);box.appendChild(b)});
  document.getElementById("categoryDialog").showModal();
}
function renderExpenses(){
  const box=document.getElementById("expenses"),empty=document.getElementById("empty");box.innerHTML="";
  [...state.expenses].sort((a,b)=>b.date.localeCompare(a.date)).forEach(e=>{const row=document.createElement("div");row.className="expense";row.innerHTML=`<span class="emoji">${categoryIcon(e.concept)}</span><div class="expense-main"><div class="expense-title">${escapeHtml(e.concept.toUpperCase())}</div><div class="expense-sub">${dateEs(e.date)}${e.comment?" · "+escapeHtml(e.comment):""}</div></div><span class="expense-amount">${money(e.amount)}</span><button class="expense-delete" type="button" aria-label="Borrar movimiento">BORRAR</button>`;row.querySelector(".expense-main").onclick=()=>openExpense(e);row.querySelector(".expense-delete").onclick=()=>deleteExpense(e);enableSwipeDelete(row,e);box.appendChild(row)});
  empty.style.display=state.expenses.length?"none":"block";
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function deleteExpense(e){if(confirm("¿Borrar este movimiento?")){state.expenses=state.expenses.filter(x=>x.id!==e.id);save();render()}}
function enableSwipeDelete(row,e){let startX=0,startY=0,dx=0,tracking=false;const reveal=88;row.addEventListener("touchstart",ev=>{if(!ev.touches.length)return;startX=ev.touches[0].clientX;startY=ev.touches[0].clientY;dx=0;tracking=true;row.classList.add("swiping")},{passive:true});row.addEventListener("touchmove",ev=>{if(!tracking||!ev.touches.length)return;const x=ev.touches[0].clientX,y=ev.touches[0].clientY,diffX=x-startX,diffY=y-startY;if(Math.abs(diffY)>Math.abs(diffX)+8){tracking=false;row.classList.remove("swiping");row.style.transform="translateX(0)";return}dx=Math.max(-reveal,Math.min(0,diffX));if(diffX<0)row.style.transform=`translateX(${dx}px)`},{passive:true});row.addEventListener("touchend",()=>{if(!tracking)return;tracking=false;row.classList.remove("swiping");row.style.transform=dx<-40?`translateX(-${reveal}px)`:"translateX(0)";dx=0});row.addEventListener("touchcancel",()=>{tracking=false;row.classList.remove("swiping");row.style.transform="translateX(0)"})}
function renderConceptOptions(selected=""){
  const select=document.getElementById("concept");
  select.innerHTML="";
  state.plan.categories.forEach(c=>{const o=document.createElement("option");o.value=c.name;o.textContent=`${c.icon} ${c.name}`;select.appendChild(o)});
  if(selected && state.plan.categories.some(c=>c.name===selected)) select.value=selected;
  else select.selectedIndex=-1;
  document.getElementById("conceptPlaceholder").hidden=!!select.value;
  select.required=true;
}
function openExpense(e=null){
  editingId=e?.id||null;document.getElementById("expenseDialogTitle").textContent=e?"Editar gasto":"Registrar gasto";renderConceptOptions(e?.concept||"");
  document.getElementById("amount").value=e?String(e.amount).replace(".",","):"";document.getElementById("comment").value=e?.comment||"";document.getElementById("location").value=e?.location||"";document.getElementById("locationStatus").textContent="";document.getElementById("expenseDate").value=e?.date||isoDate();
  if(state.plan.start)document.getElementById("expenseDate").min=state.plan.start;if(state.plan.end)document.getElementById("expenseDate").max=state.plan.end;
  const dialog=document.getElementById("expenseDialog");dialog.showModal();requestAnimationFrame(()=>document.getElementById("expenseDialogTitle").focus({preventScroll:true}));
}
let locating=false,locationTimer=null,bestAccuracy=Infinity,bestPosition=null;
function setLocationStatus(text,working=false){const el=document.getElementById("locationStatus");el.textContent=text||"";el.classList.toggle("working",!!working)}
function localityFromReverseGeocode(data){return data?.locality||data?.city||data?.town||data?.village||data?.municipality||data?.principalSubdivision||""}
async function reverseGeocode(lat,lon){const url=`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=es`;const r=await fetch(url,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("No se pudo obtener la localidad");return r.json()}
function stopLocationWatch(){locating=false;if(locationTimer){clearTimeout(locationTimer);locationTimer=null}if(window._locationWatchId!=null){navigator.geolocation.clearWatch(window._locationWatchId);window._locationWatchId=null}}
async function acceptBestLocation(){stopLocationWatch();if(!bestPosition){setLocationStatus("No se ha conseguido una ubicación. Puedes reintentar o escribirla a mano.");return}if(bestAccuracy>10){setLocationStatus(`Precisión final ${Math.round(bestAccuracy)} m. No es suficiente; puedes reintentar o escribirla a mano.`);return}try{setLocationStatus(`Precisión ${Math.round(bestAccuracy)} m · obteniendo localidad…`,true);const data=await reverseGeocode(bestPosition.coords.latitude,bestPosition.coords.longitude);const locality=localityFromReverseGeocode(data);if(locality){document.getElementById("location").value=locality;setLocationStatus(`Localización obtenida · precisión ${Math.round(bestAccuracy)} m`)}else setLocationStatus(`Precisión ${Math.round(bestAccuracy)} m, pero no se ha encontrado la localidad. Puedes escribirla a mano.`)}catch{setLocationStatus(`Precisión ${Math.round(bestAccuracy)} m, pero no se ha podido obtener la localidad. Puedes escribirla a mano.`)}}
function locateExpense(){if(!navigator.geolocation){setLocationStatus("Este dispositivo no permite obtener la ubicación. Puedes escribirla a mano.");return}if(locating)return;locating=true;bestAccuracy=Infinity;bestPosition=null;const btn=document.getElementById("locateBtn");btn.classList.add("active");btn.textContent="…";setLocationStatus("Buscando ubicación…",true);locationTimer=setTimeout(()=>{if(locating)acceptBestLocation()},20000);window._locationWatchId=navigator.geolocation.watchPosition(pos=>{const accuracy=Number(pos.coords.accuracy||Infinity);if(accuracy<bestAccuracy){bestAccuracy=accuracy;bestPosition=pos;setLocationStatus(`Buscando ubicación · precisión ${Math.round(accuracy)} m`,true)}if(accuracy<=10)acceptBestLocation()},err=>{if(!locating)return;stopLocationWatch();btn.classList.remove("active");btn.textContent="⌖";const msg=err.code===1?"Permiso de ubicación denegado.":err.code===2?"No se ha podido obtener la ubicación.":"Se ha agotado el tiempo de búsqueda.";setLocationStatus(`${msg} Puedes reintentar o escribirla a mano.`)},{enableHighAccuracy:true,maximumAge:0,timeout:20000})}
function showCategory(c){
  categoryReturn="summary";const rows=state.expenses.filter(e=>e.concept===c).sort((a,b)=>b.date.localeCompare(a.date));document.getElementById("categoryTitle").textContent=`${categoryIcon(c)}  ${c}`;const box=document.getElementById("categoryRows");box.innerHTML="";
  if(!rows.length)box.innerHTML='<div class="empty">No hay gastos en esta categoría.</div>';
  rows.forEach(e=>{const r=document.createElement("div");r.className="cat-card";const comment=e.comment?escapeHtml(e.comment):"",location=e.location?escapeHtml(e.location):"";r.innerHTML=`<div class="cat-card-top"><span class="cat-card-date">${dateEs(e.date)}</span><strong class="cat-card-amount">${money(e.amount)}</strong></div><div class="cat-card-line cat-card-comment">${comment||"Sin comentario"}</div><div class="cat-card-line cat-card-location">${location?`<span class="cat-pin">⌖</span>${location}`:""}</div>`;box.appendChild(r)});
  document.getElementById("categoryDialog").close();document.getElementById("categoryDetailDialog").showModal();
}
function iconOptions(selected){return ICON_OPTIONS.map(i=>`<option value="${i}" ${i===selected?"selected":""}>${i}</option>`).join("")}
function renderPlanCategories(){
  const box=document.getElementById("planCategories");box.innerHTML="";
  state.plan.categories.forEach((c,i)=>{const row=document.createElement("div");row.className="plan-category-row";row.innerHTML=`<select class="cat-icon" aria-label="Icono de ${escapeHtml(c.name)}">${iconOptions(c.icon)}</select><input class="cat-name" value="${escapeHtml(c.name)}" maxlength="32" aria-label="Nombre de categoría"><button type="button" class="cat-remove" aria-label="Eliminar categoría">×</button>`;row.querySelector(".cat-icon").onchange=ev=>{state.plan.categories[i].icon=ev.target.value;save();renderConceptOptions(document.getElementById("concept").value)};row.querySelector(".cat-name").onchange=ev=>renameCategory(i,ev.target.value);row.querySelector(".cat-remove").onclick=()=>removeCategory(i);box.appendChild(row)});
}
function renameCategory(i,value){const name=value.trim();if(!name){renderPlanCategories();return}const old=state.plan.categories[i].name;if(state.plan.categories.some((c,idx)=>idx!==i&&c.name.toLowerCase()===name.toLowerCase())){alert("Ya existe una categoría con ese nombre.");renderPlanCategories();return}if(old!==name)state.expenses.forEach(e=>{if(e.concept===old)e.concept=name});state.plan.categories[i].name=name;save();renderPlanCategories();renderConceptOptions(document.getElementById("concept").value===old?name:document.getElementById("concept").value);render()}
function removeCategory(i){const c=state.plan.categories[i];const used=state.expenses.some(e=>e.concept===c.name);if(used){alert("No puedes eliminar una categoría que ya tiene gastos registrados. Puedes cambiarle el nombre o conservarla.");return}if(state.plan.categories.length<=1){alert("Debe quedar al menos una categoría.");return}if(confirm(`¿Eliminar la categoría «${c.name}»?`)){state.plan.categories.splice(i,1);save();renderPlanCategories();renderConceptOptions();render()}}
function addCategory(){const base="Nueva categoría";let n=1,name=base;while(state.plan.categories.some(c=>c.name.toLowerCase()===name.toLowerCase()))name=`${base} ${++n}`;state.plan.categories.push({name,icon:"📌"});save();renderPlanCategories();const last=document.querySelector("#planCategories .plan-category-row:last-child .cat-name");last?.focus();last?.select()}
function openPlan(){
  document.getElementById("planTitleInput").value=state.plan.title||"";
  const type=document.getElementById("planType");type.value=state.plan.type||"camino";
  document.getElementById("budget").value=state.plan.budget?String(state.plan.budget).replace(".",","):"";
  document.getElementById("startDate").value=state.plan.start||"";
  document.getElementById("endDate").value=state.plan.end||"";
  const locked=hasExpenses();
  type.disabled=locked;
  
  document.getElementById("planLockedNote")?.remove();
  renderPlanCategories();document.getElementById("planDialog").showModal();
}
document.getElementById("concept").addEventListener("change",()=>{document.getElementById("conceptPlaceholder").hidden=true});
document.getElementById("locateBtn").onclick=locateExpense;
document.getElementById("expenseDialog").addEventListener("close",()=>{stopLocationWatch();const b=document.getElementById("locateBtn");b.classList.remove("active");b.textContent="⌖"});
document.getElementById("newExpenseBtn").onclick=()=>{if(!state.plan.start||!state.plan.end){alert("Primero configura el presupuesto y las fechas.");openPlan();return}openExpense()};
document.getElementById("planBtn").onclick=openPlan;
document.getElementById("planType").addEventListener("change",ev=>{if(hasExpenses()){ev.target.value=state.plan.type||"camino";return}applyTypeTemplate(ev.target.value)});document.getElementById("categoriesBtn").onclick=openCategories;document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());document.getElementById("categoryBackBtn").onclick=()=>{document.getElementById("categoryDetailDialog").close();openCategories()};
document.getElementById("addCategoryBtn").onclick=addCategory;
document.getElementById("restoreCategories").onclick=()=>{const type=document.getElementById("planType").value;if(type==="personalizado"){alert("Personalizado no tiene categorías predefinidas. Añádelas manualmente.");return}if(confirm(`¿Restaurar las categorías de «${document.getElementById("planType").selectedOptions[0].textContent}»? Esto sustituirá las categorías actuales del control.`)){applyTypeTemplate(type)}};
document.getElementById("expenseForm").onsubmit=e=>{e.preventDefault();const amount=parseAmount(document.getElementById("amount").value),date=document.getElementById("expenseDate").value,concept=document.getElementById("concept").value;if(!amount||amount<=0||!date||!concept){if(!concept)alert("Elige una categoría antes de guardar.");return}if((state.plan.start&&date<state.plan.start)||(state.plan.end&&date>state.plan.end)){alert("La fecha está fuera del periodo.");return}const item={id:editingId||crypto.randomUUID(),concept,comment:document.getElementById("comment").value.trim(),location:document.getElementById("location").value.trim(),amount,date};if(editingId)state.expenses=state.expenses.map(x=>x.id===editingId?item:x);else state.expenses.push(item);save();document.getElementById("expenseDialog").close();render()};
document.getElementById("planForm").onsubmit=e=>{e.preventDefault();
  const title=document.getElementById("planTitleInput").value.trim().toUpperCase(),type=document.getElementById("planType").value;
  const budget=parseAmount(document.getElementById("budget").value),start=document.getElementById("startDate").value,end=document.getElementById("endDate").value;
  if(!budget||budget<=0||!start||!end||end<start){alert("Revisa presupuesto y fechas.");return}
  if(hasExpenses() && type!==state.plan.type){alert("No puedes cambiar el tipo de control porque ya hay movimientos. Usa «Restablecer» para empezar un control nuevo.");return}
  state.plan={...state.plan,budget,start,end,title,type,categories:normalizeCategories(state.plan.categories)};
  save();document.getElementById("planDialog").close();render()};
document.getElementById("resetPlan").onclick=()=>{if(confirm("¿Restablecer el plan y borrar todos los gastos?")){state={expenses:[],plan:ensurePlanCategories({budget:0,start:null,end:null,title:"",type:"camino",categories:[]})};save();document.getElementById("planDialog").close();render()}};
document.getElementById("exportBtn").onclick=()=>{const rows=[["Título del control","Tipo de control","Fecha","Categoría","Comentario","Localización","Importe (€)"],...state.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(e=>[state.plan.title||"",document.getElementById("planType")?.selectedOptions?.[0]?.textContent||state.plan.type,dateEs(e.date),e.concept,e.comment,e.location||"",e.amount.toFixed(2)])];const csv="\ufeff"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\r\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);const safeTitle=(state.plan.title||"control_gastos").replace(/[^A-Z0-9ÁÉÍÓÚÜÑ _-]/gi,"").trim().replace(/\s+/g,"_")||"control_gastos";a.download=`${safeTitle}.csv`;a.click();URL.revokeObjectURL(a.href)};

const HELP_KEY="control-gastos-help-v2";
const CONTEXT_HELP_KEY="control-gastos-context-v1";
const helpSteps=[
  {target:".plan-card",emoji:"👀",title:"Tu resumen diario",text:"Aquí verás cuánto puedes gastar hoy, lo que te queda y cómo vas respecto a tu presupuesto."},
  {target:"#planBtn",emoji:"⚙️",title:"Configura tu control",text:"Desde aquí creas o modificas tu presupuesto, eliges el tipo de control y personalizas sus categorías. Dentro de esta pantalla tienes una ayuda específica con el botón ?.",},
  {target:"#newExpenseBtn",emoji:"💸",title:"Añade un gasto",text:"Pulsa aquí para registrar un gasto. Solo aparecerán las categorías que tengas configuradas para este control. Dentro de la pantalla también encontrarás una ayuda paso a paso.",},
  {target:"#categoriesBtn",emoji:"📊",title:"Consulta por categorías",text:"Aquí puedes ver cuánto llevas gastado en cada categoría y entrar en el detalle de sus movimientos."},
  {target:"#exportBtn",emoji:"📥",title:"Descarga tus datos",text:"Con esta flecha puedes exportar todos tus movimientos a un archivo CSV para guardarlos o abrirlos en Excel."},
  {target:"#helpBtn",emoji:"💡",title:"La ayuda siempre está aquí",text:"Si algún día necesitas recordar cómo funciona algo, toca este botón y podrás volver a hacer este recorrido."},
  {target:".daily-budget-card",emoji:"🎯",title:"Y ya está",text:"Tu presupuesto diario se recalcula con lo que queda y los días restantes. Ahora ya puedes empezar a controlar tus gastos.",final:true}
];

const contextHelpSets={
  expense:[
    {target:"#concept",emoji:"🏷️",title:"Categoría",text:"Elige aquí el tipo de gasto. Solo aparecen las categorías que tengas configuradas en este control."},
    {target:"#amount",emoji:"💶",title:"Importe",text:"Introduce cuánto has pagado. Puedes escribir la cantidad con coma decimal."},
    {target:"#comment",emoji:"📝",title:"Comentario",text:"Es opcional. Úsalo para añadir un detalle que quieras recordar."},
    {target:"#location",emoji:"📍",title:"Localización",text:"Puedes escribirla a mano o usar el botón ⌖ para obtenerla mediante GPS. La localización es opcional."},
    {target:"#expenseDate",emoji:"📅",title:"Fecha",text:"Indica el día al que corresponde el gasto. Por defecto se usa la fecha de hoy."}
  ],
  plan:[
    {target:"#planTitleInput",emoji:"✏️",title:"Título",text:"Ponle un nombre a tu control. Se guardará en mayúsculas para identificarlo fácilmente."},
    {target:"#planType",emoji:"🧭",title:"Tipo de control",text:"Elige Camino, Viaje, Vacaciones, Gastos del mes o Personalizado. El tipo determina las categorías iniciales."},
    {target:"#budget",emoji:"💰",title:"Presupuesto total",text:"Introduce el dinero total disponible para todo el periodo."},
    {target:"#startDate",emoji:"📅",title:"Fechas",text:"Indica desde qué día hasta qué día dura el control. El presupuesto diario se calcula con esas fechas."},
    {target:".categories-config",emoji:"🏷️",title:"Categorías de este control",text:"Aquí puedes cambiar el nombre, elegir el emoji, añadir categorías o eliminar las que todavía no tengan gastos."},
    {target:"#addCategoryBtn",emoji:"➕",title:"Añadir categoría",text:"Crea una categoría nueva. Después puedes cambiar su nombre y su emoji directamente en la lista."}
  ],
  categories:[
    {target:"#categorySummaryRows",emoji:"📊",title:"Tus categorías",text:"Aquí ves cuánto llevas gastado en cada categoría, ordenado de mayor a menor gasto."},
    {target:"#categorySummaryRows",emoji:"👆",title:"Entra en el detalle",text:"Toca una categoría para ver sus movimientos, con fecha, importe, comentario y localización cuando exista."}
  ],
  categoryDetail:[
    {target:"#categoryRows",emoji:"🔎",title:"Detalle de la categoría",text:"Aquí aparecen todos los gastos de esta categoría, del más reciente al más antiguo."},
    {target:"#categoryBackBtn",emoji:"↩️",title:"Volver",text:"Pulsa aquí para regresar al resumen de gastos por categoría."}
  ]
};
let contextHelpKind=null,contextHelpIndex=0;
function closeContextHelp(){
  const layer=document.querySelector(".dialog-context-help");
  if(layer)layer.remove();
  document.body.classList.remove("help-open");
}
function positionContextHelp(){
  const layer=document.querySelector(".dialog-context-help"),card=layer?.querySelector(".context-help-card"),spot=layer?.querySelector(".context-help-spotlight"),arrow=layer?.querySelector(".context-help-arrow");
  if(!layer||!card||!spot)return;
  const steps=contextHelpSets[contextHelpKind],step=steps[contextHelpIndex],el=document.querySelector(step.target);if(!el)return;
  const r=el.getBoundingClientRect(),pad=5;
  spot.style.left=`${r.left-pad}px`;spot.style.top=`${r.top-pad}px`;spot.style.width=`${r.width+pad*2}px`;spot.style.height=`${r.height+pad*2}px`;
  const cr=card.getBoundingClientRect(),gap=10;
  let top=r.bottom+gap,left=Math.max(10,Math.min(window.innerWidth-cr.width-10,r.left));
  if(top+cr.height>window.innerHeight-10)top=Math.max(10,r.top-cr.height-gap);
  card.style.left=`${left}px`;card.style.top=`${top}px`;
  if(arrow){const ax=left+cr.width/2,ay=top<r.top?top+cr.height:top;const ex=r.left+r.width/2,ey=top<r.top?r.top:r.bottom;arrow.style.left=`${ex-15}px`;arrow.style.top=`${(ey+ay)/2-15}px`;arrow.style.transform=`rotate(${Math.atan2(ey-ay,ex-ax)*180/Math.PI}deg)`;}
}
function renderContextHelp(){
  closeContextHelp();
  const steps=contextHelpSets[contextHelpKind];if(!steps)return;
  const host={expense:"expenseDialog",plan:"planDialog",categories:"categoryDialog",categoryDetail:"categoryDetailDialog"}[contextHelpKind];
  const hostDialog=document.getElementById(host);
  if(!hostDialog)return;
  const layer=document.createElement("div");layer.className="dialog-context-help";
  layer.innerHTML=`<div class="context-help-spotlight"></div><div class="context-help-arrow">➜</div><div class="context-help-card"><div class="help-kicker"><span class="context-help-emoji">✨</span> AYUDA · <span class="context-help-step">1</span>/<span class="context-help-total">${steps.length}</span></div><h3 class="context-help-title"></h3><p class="context-help-text"></p><div class="help-actions"><button type="button" class="secondary context-help-close">Salir</button><button type="button" class="primary context-help-next">Siguiente</button></div></div>`;
  hostDialog.appendChild(layer);
  const update=()=>{const step=steps[contextHelpIndex];layer.querySelector(".context-help-emoji").textContent=step.emoji;layer.querySelector(".context-help-step").textContent=String(contextHelpIndex+1);layer.querySelector(".context-help-title").textContent=step.title;layer.querySelector(".context-help-text").textContent=step.text;layer.querySelector(".context-help-next").textContent=contextHelpIndex===steps.length-1?"Terminar":"Siguiente";requestAnimationFrame(positionContextHelp)};
  layer.querySelector(".context-help-close").onclick=closeContextHelp;
  layer.querySelector(".context-help-next").onclick=()=>{if(contextHelpIndex>=steps.length-1){closeContextHelp();return}contextHelpIndex++;update()};
  update();
}
function startContextHelp(kind){contextHelpKind=kind;contextHelpIndex=0;renderContextHelp()}
let helpIndex=0,helpIsInitial=false;
function helpTargetElement(step){return document.querySelector(step.target)}
function positionHelpCard(el){
  const card=document.getElementById("helpCard"),spot=document.getElementById("helpSpotlight"),arrow=document.getElementById("helpArrow");
  if(!el)return;
  const r=el.getBoundingClientRect(),pad=7;
  spot.style.left=`${Math.max(4,r.left-pad)}px`;spot.style.top=`${Math.max(4,r.top-pad)}px`;spot.style.width=`${r.width+pad*2}px`;spot.style.height=`${r.height+pad*2}px`;
  const cardH=card.offsetHeight||185,gap=18;
  let top=r.bottom+gap;
  if(top+cardH>window.innerHeight-10)top=r.top-cardH-gap;
  if(top<10)top=10;
  const left=Math.min(Math.max(10,r.left),window.innerWidth-card.offsetWidth-10);
  card.style.left=`${left}px`;card.style.top=`${top}px`;
  const cr=card.getBoundingClientRect(),tx=r.left+r.width/2,ty=r.top+r.height/2,cx=cr.left+cr.width/2,cy=cr.top+cr.height/2;
  const fromX=tx>=cx?cr.right-12:cr.left+12, fromY=ty>=cy?cr.bottom-16:cr.top+16;
  const dx=tx-fromX,dy=ty-fromY,angle=Math.atan2(dy,dx)*180/Math.PI;
  arrow.style.left=`${fromX-15}px`;arrow.style.top=`${fromY-15}px`;arrow.style.transform=`rotate(${angle}deg)`;arrow.hidden=false;
}
function renderHelpStep(){
  const step=helpSteps[helpIndex],overlay=document.getElementById("helpOverlay"),title=document.getElementById("helpTitle"),text=document.getElementById("helpText"),next=document.getElementById("helpNext"),emoji=document.getElementById("helpEmoji");
  document.getElementById("helpStep").textContent=String(helpIndex+1);document.getElementById("helpTotal").textContent=String(helpSteps.length);
  title.textContent=step.title;text.textContent=step.text;next.textContent=step.final?"Terminar":"Siguiente";emoji.textContent=step.emoji||"✨";
  requestAnimationFrame(()=>{const el=helpTargetElement(step);if(el){el.scrollIntoView({block:"nearest",inline:"nearest"});requestAnimationFrame(()=>positionHelpCard(el))}});
}
function startHelp(markSeen=true){
  helpIndex=0;helpIsInitial=!markSeen;document.getElementById("helpOverlay").hidden=false;document.body.classList.add("help-open");
  if(markSeen)localStorage.setItem(HELP_KEY,"1");
  renderHelpStep();
}
function closeHelp(){
  if(helpIsInitial)localStorage.setItem(HELP_KEY,"1");
  helpIsInitial=false;
  document.getElementById("helpOverlay").hidden=true;document.body.classList.remove("help-open");document.getElementById("helpArrow").hidden=true;
}
document.getElementById("helpNext").onclick=()=>{if(helpIndex>=helpSteps.length-1){closeHelp();return}helpIndex++;renderHelpStep()};
document.getElementById("helpSkip").onclick=closeHelp;
document.getElementById("helpBtn").onclick=()=>startHelp(true);
document.getElementById("expenseHelpBtn").onclick=()=>startContextHelp("expense");
document.getElementById("planHelpBtn").onclick=()=>startContextHelp("plan");
document.getElementById("categoryHelpBtn").onclick=()=>startContextHelp("categories");
document.getElementById("categoryDetailHelpBtn").onclick=()=>startContextHelp("categoryDetail");
window.addEventListener("resize",()=>{if(document.querySelector(".dialog-context-help"))positionContextHelp()});
["expenseDialog","planDialog","categoryDialog","categoryDetailDialog"].forEach(id=>document.getElementById(id).addEventListener("close",closeContextHelp));
window.addEventListener("resize",()=>{if(!document.getElementById("helpOverlay").hidden)positionHelpCard(helpTargetElement(helpSteps[helpIndex]))});
window.addEventListener("load",()=>{if(!localStorage.getItem(HELP_KEY))setTimeout(()=>startHelp(false),450)});

render();


/* V2.6 · Instalación guiada de la PWA */
const INSTALL_SEEN_KEY="control-gastos-install-v1";
let deferredInstallPrompt=null;

function isStandaloneApp(){
  return window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)")?.matches ||
    navigator.standalone === true;
}
function installPlatform(){
  const ua=navigator.userAgent||"";
  const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const android=/Android/i.test(ua);
  const mac=/Macintosh|Mac OS X/i.test(ua)&&!ios;
  const windows=/Windows/i.test(ua);
  const linux=/Linux/i.test(ua)&&!android;
  const chrome=/CriOS|Chrome/i.test(ua)&&!/Edg|OPR|SamsungBrowser/i.test(ua);
  const edge=/EdgiOS|EdgA|Edg\//i.test(ua);
  const firefox=/FxiOS|Firefox/i.test(ua);
  const samsung=/SamsungBrowser/i.test(ua);
  const safari=/Safari/i.test(ua)&&!chrome&&!edge&&!firefox&&!samsung&&!/CriOS/i.test(ua);
  if(ios)return "ios";
  if(android && samsung)return "android-samsung";
  if(android && chrome)return "android-chrome";
  if(android && edge)return "android-edge";
  if(android && firefox)return "android-firefox";
  if(android)return "android";
  if(windows && (chrome||edge))return "desktop-chromium";
  if(windows && firefox)return "desktop-firefox";
  if(mac && safari)return "mac-safari";
  if(mac && (chrome||edge))return "desktop-chromium";
  if(linux && (chrome||edge))return "desktop-chromium";
  if(linux && firefox)return "desktop-firefox";
  return "desktop-other";
}
function installInstructions(kind){
  const common={intro:"Añádela a la pantalla de inicio o instálala para abrirla como una aplicación, sin la interfaz normal del navegador.",steps:[]};
  switch(kind){
    case "ios":
      common.intro="En tu iPhone o iPad puedes convertir esta web en una app desde el menú Compartir.";
      common.steps=[
        ["1","Pulsa","el botón Compartir de Safari."],
        ["2","Añade a Inicio","Busca «Añadir a Inicio» en las acciones."],
        ["3","Activa","«Abrir como app web» y pulsa «Añadir»."]
      ]; break;
    case "android-chrome":
      common.intro="Chrome puede instalar esta aplicación directamente cuando la PWA es instalable.";
      common.steps=[
        ["1","Abre el menú","Pulsa ⋮ en Chrome."],
        ["2","Instala","Elige «Instalar aplicación» o «Añadir a pantalla de inicio»."],
        ["3","Confirma","Acepta la instalación y aparecerá su icono."]
      ]; break;
    case "android-samsung":
      common.intro="Samsung Internet puede añadir esta aplicación al inicio del teléfono.";
      common.steps=[
        ["1","Abre el menú","Pulsa ☰ en Samsung Internet."],
        ["2","Añade","Elige «Añadir página a» y después «Pantalla de inicio»."],
        ["3","Confirma","Acepta el nombre y añade el icono."]
      ]; break;
    case "android-edge":
      common.intro="Microsoft Edge puede ofrecer la instalación desde su menú.";
      common.steps=[
        ["1","Abre el menú","Pulsa ⋯ en Edge."],
        ["2","Instala","Busca «Instalar aplicación» o «Añadir a teléfono»."],
        ["3","Confirma","Acepta la instalación."]
      ]; break;
    case "android-firefox":
      common.intro="Firefox puede crear un acceso directo al sitio en Android.";
      common.steps=[
        ["1","Abre el menú","Pulsa ⋮ en Firefox."],
        ["2","Añade","Busca «Añadir a la pantalla de inicio»."],
        ["3","Confirma","Añade el acceso directo."]
      ]; break;
    case "desktop-chromium":
      common.intro="Este navegador puede instalar la aplicación como ventana independiente.";
      common.steps=[
        ["1","Busca el icono","Mira el icono de instalación en la barra de direcciones o abre el menú del navegador."],
        ["2","Instala","Elige «Instalar Control de Gastos»."],
        ["3","Confirma","La aplicación quedará disponible como acceso independiente."]
      ]; break;
    case "mac-safari":
      common.intro="Safari en macOS permite convertir una web en una app desde el menú Archivo.";
      common.steps=[
        ["1","Abre Archivo","En Safari, pulsa «Archivo»."],
        ["2","Añade al Dock","Elige «Añadir al Dock…»."],
        ["3","Confirma","Acepta el nombre y guarda la aplicación."]
      ]; break;
    case "desktop-firefox":
      common.intro="Firefox de escritorio no ofrece la instalación PWA de la misma forma que Chromium.";
      common.steps=[
        ["1","Guarda el acceso","Añade Control de Gastos a marcadores o accesos directos."],
        ["2","Acceso rápido","Colócalo donde te resulte más cómodo."],
        ["3","Consejo","Para una instalación como app, usa Chrome o Edge en este equipo."]
      ]; break;
    default:
      common.intro="Tu navegador puede guardar esta web como acceso directo o instalarla si ofrece esa función.";
      common.steps=[
        ["1","Abre el menú","Busca opciones como «Instalar», «Añadir a inicio» o «Añadir al Dock»."],
        ["2","Añade","Confirma la creación del acceso."],
        ["3","Listo","Usa el icono creado para abrir Control de Gastos."]
      ];
  }
  return common;
}
function renderInstallDialog(){
  const kind=installPlatform(), data=installInstructions(kind);
  document.getElementById("installIntro").textContent=data.intro;
  const box=document.getElementById("installSteps");box.innerHTML="";
  data.steps.forEach(([n,title,text])=>{
    const row=document.createElement("div");row.className="install-step";
    row.innerHTML=`<span class="num">${n}</span><div><strong>${title}</strong>${escapeHtml(text)}</div>`;
    box.appendChild(row);
  });
  const nativeBtn=document.getElementById("installNativeBtn");
  nativeBtn.hidden=!deferredInstallPrompt;
  nativeBtn.textContent="Instalar aplicación";
}
function openInstallDialog(force=false){
  if(isStandaloneApp())return;
  renderInstallDialog();
  const d=document.getElementById("installDialog");
  if(d.open)return;
  d.showModal();
  if(!force)localStorage.setItem(INSTALL_SEEN_KEY,"1");
}
async function triggerNativeInstall(){
  if(!deferredInstallPrompt){renderInstallDialog();return}
  const prompt=deferredInstallPrompt;
  deferredInstallPrompt=null;
  const result=await prompt.prompt();
  localStorage.setItem(INSTALL_SEEN_KEY,"1");
  if(result?.outcome==="accepted")document.getElementById("installDialog").close();
  document.getElementById("installNativeBtn").hidden=true;
}
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  if(!isStandaloneApp() && !localStorage.getItem(INSTALL_SEEN_KEY)){
    setTimeout(()=>openInstallDialog(false),700);
  }
});
window.addEventListener("appinstalled",()=>{
  deferredInstallPrompt=null;
  localStorage.setItem(INSTALL_SEEN_KEY,"1");
});
document.getElementById("installNativeBtn").onclick=triggerNativeInstall;
document.getElementById("installCloseBtn").onclick=()=>document.getElementById("installDialog").close();
window.addEventListener("load",()=>{
  if(isStandaloneApp()){document.getElementById("installBtn").hidden=true;return;}
  if(!localStorage.getItem(INSTALL_SEEN_KEY))setTimeout(()=>openInstallDialog(false),850);
});

