'use strict';
const D=window.PECS_DATA,$=id=>document.getElementById(id);
const FITZ={'Люди и семья':'people','Профессии':'people','Действия':'action','Эмоции':'desc','Цвета':'desc','Формы':'desc','Размер и количество':'desc','Пространство':'desc','Признаки и качества':'desc','Время':'desc','Коммуникация':'social','Социальное взаимодействие':'social','Места и здания':'place','Улица':'place','Дом':'place'};
const DEF={pin:'1234',phase:4,hidden:{},order:{},cap:{},fitz:true,speakTap:true,lang:'ru',rate:0.9,voice:'',size:'m',fav:[],recent:[],choice:[],starter:'Я хочу',useStarter:true,core:null,log:[]};
let S=Object.assign({},DEF,JSON.parse(localStorage.getItem('pecs_s')||'{}'));
const save=()=>localStorage.setItem('pecs_s',JSON.stringify(S));
let custom=[],spec=false,cur=null,strip=[],hist=[];
// IndexedDB
let db;function idb(){return new Promise(r=>{try{const q=indexedDB.open('pecs',1);q.onupgradeneeded=()=>q.result.createObjectStore('cards',{keyPath:'id'});q.onsuccess=()=>{db=q.result;r()};q.onerror=()=>r()}catch(e){r()}})}
function idbAll(){return new Promise(r=>{if(!db)return r([]);const q=db.transaction('cards').objectStore('cards').getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>r([])})}
function idbPut(c){return new Promise(r=>{if(!db)return r();const t=db.transaction('cards','readwrite');t.objectStore('cards').put(c);t.oncomplete=r})}
function idbDel(id){return new Promise(r=>{if(!db)return r();const t=db.transaction('cards','readwrite');t.objectStore('cards').delete(id);t.oncomplete=r})}
const allCards=()=>D.cards.concat(custom);
const card=id=>allCards().find(c=>c.id===id);
const word=c=>{const k=S.cap[c.id]||{};return (S.lang==='kk'&&k.kz)?k.kz:(k.ru||c.word)};
const catName=c=>(S.cap[c.id]||{}).ru||c.name;
const catOf=id=>D.cats.find(c=>c.id===id);
const fz=c=>{if(!S.fitz)return '';const cat=catOf(c.cat);return 'fz-'+(FITZ[cat&&cat.name]||'noun')};
// speech
let voices=[];function loadV(){try{voices=speechSynthesis.getVoices()}catch(e){}}if('speechSynthesis'in window){loadV();speechSynthesis.onvoiceschanged=loadV}
function pickVoice(){if(S.voice){const v=voices.find(v=>v.voiceURI===S.voice);if(v)return v}
 if(S.lang==='kk'){const v=voices.find(v=>/^kk/i.test(v.lang));if(v)return v}return voices.find(v=>/^ru/i.test(v.lang))}
function say(t){if(!('speechSynthesis'in window)||!t)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);const v=pickVoice();if(v){u.voice=v;u.lang=v.lang}else u.lang='ru-RU';u.rate=S.rate;speechSynthesis.speak(u)}
function logPhrase(t){S.log.push({t:new Date().toISOString(),p:t,ph:S.phase});if(S.log.length>5000)S.log.shift();save()}
// ordering/visibility
function cardsIn(cat){let l=allCards().filter(c=>c.cat===cat);const o=S.order[cat]||[];l.sort((a,b)=>{const ia=o.indexOf(a.id),ib=o.indexOf(b.id);return (ia<0?1e4:ia)-(ib<0?1e4:ib)});return spec?l:l.filter(c=>!S.hidden[c.id])}
function cats(){let l=D.cats.slice();const o=S.order._cats||[];l.sort((a,b)=>{const ia=o.indexOf(a.id),ib=o.indexOf(b.id);return (ia<0?1e4+a.num:ia)-(ib<0?1e4+b.num:ib)});return spec?l:l.filter(c=>!S.hidden[c.id])}
function move(list,key,id,d){const ids=list.map(x=>x.id);const i=ids.indexOf(id),j=i+d;if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];S.order[key]=ids;save();render()}
// element builders
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function cardEl(c,onTap,cls){const e=el('div','card '+(cls||'')+' '+fz(c)+(S.hidden[c.id]?' hidden':''));e.innerHTML='<img loading="lazy" alt="" src="'+c.img+'"><div class="lbl">'+esc(word(c))+'</div>';e.onclick=()=>onTap(c);return e}
// main tap handler
function tapCard(c){S.recent=[c.id].concat(S.recent.filter(x=>x!==c.id)).slice(0,24);save();
 if(S.phase<=2||S.phase===3){showBig(c);say(word(c));logPhrase(word(c));return}
 strip.push(c.id);drawStrip();if(S.speakTap)say(word(c))}
function showBig(c){const b=$('big');b.innerHTML='<img src="'+c.img+'"><div>'+esc(word(c))+'</div>';b.style.display='flex';b.onclick=()=>b.style.display='none';setTimeout(()=>b.style.display='none',4000)}
function phrase(){const w=strip.map(id=>card(id)).filter(Boolean).map(word);if(S.phase>=4&&S.useStarter&&strip.length)w.unshift(S.starter);return w.join(' ')}
function drawStrip(){const s=$('strip');s.innerHTML='';if(S.phase>=4&&S.useStarter&&strip.length)s.appendChild(el('div','sc starter',esc(S.starter)));
 strip.forEach(id=>{const c=card(id);if(!c)return;const e=el('div','sc '+fz(c),'<img src="'+c.img+'"><div>'+esc(word(c))+'</div>');s.appendChild(e)});s.scrollLeft=1e5}
function speakStrip(){const p=phrase();if(!p)return;say(p);logPhrase(p)}
// render
function render(){document.body.className='g-'+S.size+(S.phase<=2?' phase1':'');
 $('top').style.display=S.phase>=4?'flex':'none';
 const st=$('starters');st.style.display=S.phase>=5?'flex':'none';st.innerHTML='';
 ['Я хочу','Я вижу','Я слышу','У меня есть'].forEach(t=>{const b=el('button','btn'+(S.starter===t?' pri':''),t);b.onclick=()=>{S.starter=t;save();render()};st.appendChild(b)});
 drawQuick();drawStrip();
 $('specInfo').textContent=spec?'🔓 Специалист · фаза '+['','I','II','III','IV','V','VI'][S.phase]:'';
 $('bSpec').textContent=spec?'🔒':'⚙';
 const g=$('grid');g.innerHTML='';$('choice').style.display='none';
 if(S.phase===3&&!spec){$('choice').style.display='block';$('title').textContent='Выбор';const cg=$('choiceGrid');cg.innerHTML='';
  S.choice.map(card).filter(Boolean).forEach(c=>cg.appendChild(cardEl(c,tapCard)));if(!S.choice.length)cg.textContent='Специалист: выберите 2–5 карточек (⚙ → карточка → «В поле»).';return}
 if(!cur){$('title').textContent='Категории';
  if(S.fav.length)g.appendChild(catTile({id:'_fav',name:'★ Избранное'},card(S.fav[0])));
  if(S.recent.length)g.appendChild(catTile({id:'_rec',name:'🕘 Недавние'},card(S.recent[0])));
  const cl=cats();cl.forEach(c=>{const f=cardsIn(c.id)[0]||allCards().find(x=>x.cat===c.id);const t=catTile(c,f);if(spec)t.appendChild(tools(c,cl,'_cats'));g.appendChild(t)});
  if(spec){const a=el('div','card','<div style="font-size:60px">＋</div><div class="lbl">Своя карточка</div>');a.onclick=()=>addCustom(null);g.appendChild(a)}
  return}
 let list,title;
 if(cur==='_fav'){list=S.fav.map(card).filter(Boolean);title='Избранное'}else if(cur==='_rec'){list=S.recent.map(card).filter(Boolean);title='Недавние'}else{list=cardsIn(cur);title=catName(catOf(cur))}
 $('title').textContent=title;
 list.forEach(c=>{const e=cardEl(c,spec?editCard:tapCard);if(spec&&cur[0]!=='_')e.appendChild(tools(c,list,cur));g.appendChild(e)});
 if(spec&&cur[0]!=='_'){const a=el('div','card','<div style="font-size:60px">＋</div><div class="lbl">Фото-карточка</div>');a.onclick=()=>addCustom(cur);g.appendChild(a)}}
function catTile(c,f){const e=el('div','card cat'+(S.hidden[c.id]?' hidden':''),(f?'<img loading="lazy" src="'+f.img+'">':'')+'<div class="lbl">'+esc(c.name[0]==='★'||c.name[0]==='🕘'?c.name:catName(c))+'</div>');e.onclick=()=>{hist.push(cur);cur=c.id;render();scrollTo(0,0)};return e}
function tools(o,list,key){const t=el('div','edit');const mk=(l,f)=>{const b=el('button','',l);b.onclick=e=>{e.stopPropagation();f()};t.appendChild(b)};
 mk(S.hidden[o.id]?'🙈':'👁',()=>{S.hidden[o.id]=!S.hidden[o.id];save();render()});mk('◀',()=>move(list,key,o.id,-1));mk('▶',()=>move(list,key,o.id,1));
 if(key==='_cats')mk('✎',()=>{const n=prompt('Название категории',catName(o));if(n!=null){S.cap[o.id]={ru:n};save();render()}});return t}
function drawQuick(){const q=$('quick');q.innerHTML='';if(S.phase<4){q.style.display='none';return}q.style.display='flex';
 let ids=S.core;if(!ids){const want=['да','нет','ещё','еще','стоп','помоги','помогите','всё','дай','хочу','пить','есть','туалет','не хочу'];ids=[];want.forEach(w=>{const c=D.cards.find(c=>c.word.toLowerCase()===w);if(c&&!ids.includes(c.id))ids.push(c.id)});S.core=ids;save()}
 ids.map(card).filter(Boolean).forEach(c=>{const e=el('div','card q '+fz(c),'<img src="'+c.img+'"><div>'+esc(word(c))+'</div>');e.onclick=()=>tapCard(c);q.appendChild(e)})}
// modals
function modal(html){$('mbox').innerHTML=html;$('modal').classList.add('on')}
function closeM(){$('modal').classList.remove('on')}
$('modal').onclick=e=>{if(e.target.id==='modal')closeM()};
function editCard(c){const k=S.cap[c.id]||{};const isC=c.id.startsWith('u_');
 modal('<h3>Карточка: '+esc(c.word)+'</h3><img src="'+c.img+'" style="height:120px"><label>Подпись RU<input id="eRu" value="'+esc(k.ru||'')+'" placeholder="'+esc(c.word)+'"></label><label>Подпись KZ<input id="eKz" value="'+esc(k.kz||'')+'"></label><div class="row"><button class="btn pri" id="eOk">Сохранить</button><button class="btn" id="eFav">'+(S.fav.includes(c.id)?'★ Убрать из избранного':'☆ В избранное')+'</button><button class="btn" id="eCore">'+(S.core.includes(c.id)?'Убрать из быстрой панели':'В быструю панель')+'</button><button class="btn" id="eCh">'+(S.choice.includes(c.id)?'Убрать из поля (фаза III)':'В поле выбора (фаза III)')+'</button>'+(isC?'<button class="btn no" id="eDel">Удалить</button>':'')+'<button class="btn" onclick="closeM()">Отмена</button></div>');
 $('eOk').onclick=()=>{S.cap[c.id]={ru:$('eRu').value.trim(),kz:$('eKz').value.trim()};save();closeM();render()};
 const tg=(a,lim)=>{const i=S[a].indexOf(c.id);if(i>=0)S[a].splice(i,1);else{if(lim&&S[a].length>=lim)return alert('Не больше '+lim);S[a].push(c.id)}save();closeM();render()};
 $('eFav').onclick=()=>tg('fav');$('eCore').onclick=()=>tg('core');$('eCh').onclick=()=>tg('choice',5);
 if(isC)$('eDel').onclick=async()=>{if(!confirm('Удалить карточку?'))return;await idbDel(c.id);custom=custom.filter(x=>x.id!==c.id);closeM();render()}}
function addCustom(cat){modal('<h3>Своя карточка</h3><label>Слово<input id="nW"></label><label>Категория<select id="nC">'+D.cats.map(c=>'<option value="'+c.id+'"'+(c.id===cat?' selected':'')+'>'+esc(catName(c))+'</option>').join('')+'</select></label><div class="row"><button class="btn pri" id="nPh">📷 Фото / файл</button><button class="btn" onclick="closeM()">Отмена</button></div>');
 $('nPh').onclick=()=>{const w=$('nW').value.trim();if(!w)return alert('Введите слово');const ct=$('nC').value;const f=$('file');f.value='';f.onchange=()=>{const file=f.files[0];if(!file)return;const img=new Image();const r=new FileReader();r.onload=()=>{img.onload=async()=>{const s=Math.min(1,400/Math.max(img.width,img.height));const cv=document.createElement('canvas');cv.width=img.width*s;cv.height=img.height*s;cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);const c={id:'u_'+Date.now(),cat:ct,word:w,img:cv.toDataURL('image/jpeg',0.85)};await idbPut(c);custom.push(c);closeM();cur=ct;render()};img.src=r.result};r.readAsDataURL(file)};f.click()}}
function download(name,text,type){const b=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function csv(){const q=s=>'"'+String(s).replace(/"/g,'""')+'"';return '\ufeffДата;Время;Фаза;Фраза\r\n'+S.log.map(l=>{const d=new Date(l.t);return [d.toLocaleDateString('ru-RU'),d.toLocaleTimeString('ru-RU'),l.ph||'',q(l.p)].join(';')}).join('\r\n')}
function settings(){const vs=voices.filter(v=>/^(ru|kk)/i.test(v.lang));
 modal('<h3>Режим специалиста</h3><label>Фаза PECS<select id="sPh">'+[[1,'I — обмен одной карточкой'],[2,'II — дистанция/настойчивость'],[3,'III — выбор из 2–5'],[4,'IV — фраза «Я хочу…»'],[5,'V — ответ на «Что ты хочешь?»'],[6,'VI — комментарии (вижу/слышу/есть)']].map(p=>'<option value="'+p[0]+'"'+(S.phase==p[0]?' selected':'')+'>'+p[1]+'</option>').join('')+'</select></label>'+
 '<label>Размер сетки<select id="sSz"><option value="s">Мелкие</option><option value="m">Средние</option><option value="l">Крупные</option></select></label>'+
 '<label>Язык озвучки<select id="sLg"><option value="ru">Русский</option><option value="kk">Қазақша (если есть голос, иначе рус.)</option></select></label>'+
 '<label>Голос<select id="sV"><option value="">Авто</option>'+vs.map(v=>'<option value="'+esc(v.voiceURI)+'"'+(S.voice===v.voiceURI?' selected':'')+'>'+esc(v.name+' ('+v.lang+')')+'</option>').join('')+'</select></label>'+
 '<label>Скорость речи: <span id="rv">'+S.rate+'</span><input type="range" id="sR" min="0.5" max="1.5" step="0.1" value="'+S.rate+'"></label>'+
 '<label><input type="checkbox" id="sSt" style="width:auto"'+(S.useStarter?' checked':'')+'> Начало «Я хочу» в полосе</label><br>'+
 '<label><input type="checkbox" id="sT" style="width:auto"'+(S.speakTap?' checked':'')+'> Озвучивать карточку при нажатии</label><br>'+
 '<label><input type="checkbox" id="sF" style="width:auto"'+(S.fitz?' checked':'')+'> Цветные рамки Фицджеральда</label>'+
 '<label>Новый PIN<input id="sPin" inputmode="numeric" placeholder="оставьте пустым"></label>'+
 '<div class="row"><button class="btn pri" id="sOk">Сохранить</button><button class="btn" onclick="say(\'Проверка голоса\')">▶ Тест</button></div><hr>'+
 '<h4>Журнал фраз ('+S.log.length+')</h4><div class="row"><button class="btn" id="sCsv">⬇ Экспорт CSV</button><button class="btn" id="sLogC">Очистить журнал</button></div>'+
 '<table>'+S.log.slice(-30).reverse().map(l=>'<tr><td>'+new Date(l.t).toLocaleString('ru-RU')+'</td><td>'+esc(l.p)+'</td></tr>').join('')+'</table><hr>'+
 '<h4>Резервная копия</h4><div class="row"><button class="btn" id="sExp">⬇ Экспорт (JSON)</button><button class="btn" id="sImp">⬆ Импорт</button><button class="btn" id="sRst">Сброс настроек</button></div>'+
 '<p style="font-size:14px;color:#64748b">В режиме специалиста: 👁 скрыть/показать, ◀▶ порядок, нажатие на карточку — подписи, избранное, быстрая панель, поле выбора.</p><button class="btn" onclick="closeM()">Закрыть</button>');
 $('sSz').value=S.size;$('sLg').value=S.lang;$('sR').oninput=e=>$('rv').textContent=e.target.value;
 $('sOk').onclick=()=>{S.phase=+$('sPh').value;S.size=$('sSz').value;S.lang=$('sLg').value;S.voice=$('sV').value;S.rate=+$('sR').value;S.useStarter=$('sSt').checked;S.speakTap=$('sT').checked;S.fitz=$('sF').checked;const p=$('sPin').value.trim();if(p){if(!/^\d{4,8}$/.test(p))return alert('PIN: 4–8 цифр');S.pin=p}save();closeM();render()};
 $('sCsv').onclick=()=>download('pecs_log_'+new Date().toISOString().slice(0,10)+'.csv',csv(),'text/csv;charset=utf-8');
 $('sLogC').onclick=()=>{if(confirm('Очистить журнал?')){S.log=[];save();settings()}};
 $('sExp').onclick=()=>download('pecs_backup_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({settings:S,custom}),'application/json');
 $('sImp').onclick=()=>{const f=document.createElement('input');f.type='file';f.accept='.json,application/json';f.onchange=()=>{const r=new FileReader();r.onload=async()=>{try{const o=JSON.parse(r.result);S=Object.assign({},DEF,o.settings);save();for(const c of o.custom||[])await idbPut(c);custom=o.custom||[];closeM();render();alert('Импортировано')}catch(e){alert('Ошибка файла')}};r.readAsText(f.files[0])};f.click()};
 $('sRst').onclick=()=>{if(confirm('Сбросить все настройки (журнал и свои карточки сохранятся)?')){S=Object.assign({},DEF,{log:S.log});save();closeM();render()}}}
// buttons
$('strip').onclick=speakStrip;$('bSpeak').onclick=speakStrip;
$('bDel').onclick=()=>{strip.pop();drawStrip()};$('bClr').onclick=()=>{strip=[];drawStrip()};
$('bHome').onclick=()=>{cur=null;hist=[];render()};$('bBack').onclick=()=>{cur=hist.length?hist.pop():null;render()};
$('bYes').onclick=()=>{say('Да');logPhrase('Да')};$('bNo').onclick=()=>{say('Нет');logPhrase('Нет')};
$('bSpec').onclick=()=>{if(spec){spec=false;render();return}const p=prompt('PIN специалиста');if(p===S.pin){spec=true;render();settings()}else if(p!=null)alert('Неверный PIN')};
$('specInfo').onclick=()=>spec&&settings();
window.closeM=closeM;window.say=say;window.__pecs={csv,get S(){return S},strip:()=>phrase()};
(async()=>{await idb();custom=await idbAll();render()})();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
