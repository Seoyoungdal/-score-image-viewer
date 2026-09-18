(()=>{
  'use strict';
  const VERSION='1.3.0';
  const DB_NAME='scoreImageViewer';
  const DB_VERSION=1;
  const STORE='scores';
  const IMAGE_TYPES=/\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i;
  const $=id=>document.getElementById(id);
  const els={content:$('content'),searchForm:$('searchForm'),searchInput:$('searchInput'),clearSearch:$('clearSearch'),folderInput:$('folderInput'),importModal:$('importModal'),importBar:$('importBar'),importLabel:$('importLabel'),brandTitle:$('brandTitle'),offlineStatus:$('offlineStatus'),storageSummary:$('storageSummary'),viewer:$('viewer'),viewerImage:$('viewerImage'),viewerCanvas:$('viewerCanvas'),viewerTitle:$('viewerTitle'),viewerPath:$('viewerPath'),viewerHint:$('viewerHint'),toast:$('toast')};
  let db;
  let items=[];
  let currentPage='home';
  let currentFolder='';
  let currentObjectUrl='';
  let selectedId='';
  let hintTimer;
  let zoom={scale:1,x:0,y:0,startDist:0,startScale:1,startX:0,startY:0,lastTap:0};
  const collator=new Intl.Collator('ko',{numeric:true,sensitivity:'base'});

  const icons={
    'book-open':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.8 5.2c3.3-1 6.4-.4 9.2 1.7v13c-2.8-2-5.9-2.6-9.2-1.6V5.2Z"/><path d="M21.2 5.2c-3.3-1-6.4-.4-9.2 1.7v13c2.8-2 5.9-2.6 9.2-1.6V5.2Z"/></svg>',
    library:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v16H4zM8 4v16M16 4v16"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6A8 8 0 0 0 8 7.1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A8 8 0 0 0 10.4 18l.3 2.6h4L15 18a8 8 0 0 0 1.5-1.1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    'arrow-right':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    'arrow-left':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5m6-6-6 6 6 6"/></svg>',
    moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>',
    sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></svg>',
    folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6.5h7l2 2h9v10H3z"/></svg>',
    'chevron-right':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 5 7 7-7 7"/></svg>',
    refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 6v5h-5M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 9m16 6-2 2.5A7 7 0 0 1 5.5 15"/></svg>',
    maximize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 17 5-4 3 3 3-2 5 4"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></svg>',
    download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m-5-5 5 5 5-5M5 20h14"/></svg>'
  };
  function renderIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{const name=el.dataset.icon;if(icons[name])el.innerHTML=icons[name]})}
  function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function normalize(value=''){return value.normalize('NFC').toLocaleLowerCase('ko').replace(/[^0-9a-z가-힣]/g,'')}
  function titleFromName(name=''){return name.replace(/\.[^.]+$/,'').replace(/^\s*\d+[\s._-]*/,'').replace(/[_-]+/g,' ').trim()||name.replace(/\.[^.]+$/,'')}
  function numberFromName(name=''){const m=name.normalize('NFC').match(/^\s*(\d+)/);return m?m[1]:''}
  function folderFromPath(path=''){const parts=path.split('/').filter(Boolean);return parts.length>2?parts[1]:(parts.length>1?parts[0]:'기타 악보')}
  function formatDate(ts){if(!ts)return '날짜 없음';const d=new Date(ts);const today=new Date();if(d.toDateString()===today.toDateString())return '오늘 업데이트';return `${d.getMonth()+1}월 ${d.getDate()}일 업데이트`}
  function formatBytes(bytes){if(!Number.isFinite(bytes))return '';if(bytes<1024*1024)return `${Math.round(bytes/1024)}KB`;return `${(bytes/1024/1024).toFixed(1)}MB`}
  function toast(message){const el=els.toast;el.textContent=message;el.classList.add('show');clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove('show'),2200)}

  function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE)){const store=d.createObjectStore(STORE,{keyPath:'id'});store.createIndex('folder','folder');store.createIndex('updatedAt','updatedAt')}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  function dbGetAll(){return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)})}
  function dbClear(){return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readwrite').objectStore(STORE).clear();req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}
  function completeTx(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
  async function saveImport(files){
    const usable=[...files].filter(f=>IMAGE_TYPES.test(f.name)||f.type.startsWith('image/'));
    if(!usable.length)throw new Error('선택한 폴더에 지원되는 이미지가 없습니다.');
    const root=(usable[0].webkitRelativePath||usable[0].name).split('/')[0];
    const existing=items.filter(i=>i.root===root);
    const incoming=new Set(usable.map(f=>f.webkitRelativePath||`${root}/${f.name}`));
    const removals=existing.filter(i=>!incoming.has(i.path));
    if(removals.length){const tx=db.transaction(STORE,'readwrite');const store=tx.objectStore(STORE);removals.forEach(i=>store.delete(i.id));await completeTx(tx)}
    const oldById=new Map(items.map(i=>[i.id,i]));
    const batchSize=24;
    for(let start=0;start<usable.length;start+=batchSize){
      const batch=usable.slice(start,start+batchSize);
      const tx=db.transaction(STORE,'readwrite');
      const store=tx.objectStore(STORE);
      batch.forEach(file=>{
        const path=file.webkitRelativePath||`${root}/${file.name}`;
        const old=oldById.get(path);
        if(!old||old.size!==file.size||old.lastModified!==file.lastModified){
          store.put({id:path,path,root,folder:folderFromPath(path),name:file.name,title:titleFromName(file.name),number:numberFromName(file.name),type:file.type||'image/*',size:file.size,lastModified:file.lastModified,updatedAt:Date.now(),blob:file});
        }
      });
      await completeTx(tx);
      const done=Math.min(start+batch.length,usable.length);els.importBar.style.width=`${Math.round(done/usable.length*100)}%`;els.importLabel.textContent=`${done.toLocaleString()} / ${usable.length.toLocaleString()}개 저장 중`;
      await new Promise(requestAnimationFrame);
    }
    localStorage.setItem('scoreRoot',root);localStorage.setItem('scoreUpdatedAt',String(Date.now()));
    if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
  }
  async function refreshItems(){items=await dbGetAll();items.sort((a,b)=>collator.compare(a.name,b.name));await updateStorageSummary()}
  async function updateStorageSummary(){const bytes=items.reduce((sum,i)=>sum+(i.size||0),0);els.offlineStatus.textContent=items.length?'오프라인 저장 완료':'저장된 악보 없음';els.storageSummary.textContent=items.length?`${items.length.toLocaleString()}곡 · ${formatBytes(bytes)}`:'악보집을 가져와 주세요.'}

  function setPage(page){currentPage=page;currentFolder='';selectedId='';document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));render()}
  function render(){
    if(currentPage==='settings')return renderSettings();
    if(currentPage==='recent')return renderRecent();
    if(currentPage==='search')return renderSearch();
    if(currentPage==='folder')return renderFolder();
    renderHome();
  }
  function pageHead(title,sub,action=''){return `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>${action}</div>`}
  function importButton(label=items.length?'악보집 업데이트':'악보집 가져오기'){return `<button class="secondary-btn" data-import><span data-icon="refresh"></span>${esc(label)}</button>`}
  function renderHome(){
    currentPage='home';
    if(!items.length){els.content.innerHTML=`<section class="page">${pageHead('악보집','악보를 한 번 가져오면 다음부터 폴더를 다시 지정하지 않아도 됩니다.')}<div class="empty"><div class="empty-icon" data-icon="image"></div><h2>아직 저장된 악보가 없습니다</h2><p>악보가 들어 있는 최상위 폴더를 선택해 주세요.<br>이미지는 이 기기의 앱 저장공간에 안전하게 복사됩니다.</p><button class="action-btn" data-import><span data-icon="download"></span>첫 악보집 가져오기</button></div></section>`;bindCommon();return}
    const map=new Map();items.forEach(i=>{const arr=map.get(i.folder)||[];arr.push(i);map.set(i.folder,arr)});
    const cards=[...map.entries()].sort((a,b)=>collator.compare(a[0],b[0])).map(([name,arr])=>{const latest=Math.max(...arr.map(i=>i.updatedAt||0));return `<button class="folder-card" data-folder="${esc(name)}"><div class="folder-top"><span class="folder-symbol" data-icon="folder"></span><span class="folder-arrow" data-icon="chevron-right"></span></div><div class="folder-name">${esc(name)}</div><div class="folder-meta"><span>${formatDate(latest)}</span><span class="folder-count">${arr.length.toLocaleString()}곡</span></div></button>`}).join('');
    els.content.innerHTML=`<section class="page">${pageHead('악보집',`${map.size.toLocaleString()}개 폴더 · 총 ${items.length.toLocaleString()}곡`,importButton())}<div class="folder-grid">${cards}</div></section>`;bindCommon();els.content.querySelectorAll('[data-folder]').forEach(b=>b.onclick=()=>{currentFolder=b.dataset.folder;currentPage='folder';render()})
  }
  function songRow(item){return `<button class="song-row${item.id===selectedId?' selected':''}" data-id="${esc(item.id)}"><span class="song-number">${esc(item.number||'♪')}</span><span><div class="song-title">${esc(item.title)}</div><div class="song-path">${esc(item.path)}</div></span><span data-icon="chevron-right"></span></button>`}
  function renderFolder(){const list=items.filter(i=>i.folder===currentFolder);renderListLayout(currentFolder,`${list.length.toLocaleString()}곡 · 이름순`,list)}
  function renderListLayout(title,sub,list){
    if(!selectedId&&list[0])selectedId=list[0].id;
    const selected=list.find(i=>i.id===selectedId)||list[0];
    els.content.innerHTML=`<section class="page list-layout"><div class="list-panel"><div class="list-toolbar"><div><h1 style="font-size:20px;margin:0">${esc(title)}</h1><p style="font-size:11px;color:var(--muted);margin:5px 0 0">${esc(sub)}</p></div><button class="back-btn" data-home><span data-icon="arrow-left"></span>악보집</button></div><div class="song-list">${list.map(songRow).join('')||'<div class="empty"><p>일치하는 악보가 없습니다.</p></div>'}</div></div><div class="preview"><div class="preview-head"><div class="preview-copy"><div class="preview-title" id="previewTitle">${selected?esc(selected.title):'악보 미리보기'}</div><div class="preview-sub">누르면 전체 화면으로 열립니다</div></div><button class="viewer-open" id="openViewer" aria-label="전체 화면"><span data-icon="maximize"></span></button></div><div class="preview-stage" id="previewStage">${selected?'<span class="preview-placeholder">악보 불러오는 중…</span>':'<span class="preview-placeholder">왼쪽에서 악보를 선택해 주세요.</span>'}</div></div></section>`;
    renderIcons(els.content);els.content.querySelector('[data-home]').onclick=()=>setPage('home');els.content.querySelectorAll('.song-row').forEach(row=>row.onclick=()=>selectSong(row.dataset.id,list));if(selected)showPreview(selected);const open=$('openViewer');if(open)open.onclick=()=>selected&&openViewer(selected)
  }
  async function selectSong(id,list){selectedId=id;els.content.querySelectorAll('.song-row').forEach(r=>r.classList.toggle('selected',r.dataset.id===id));const item=list.find(i=>i.id===id);if(!item)return;if(matchMedia('(max-width:700px)').matches){openViewer(item);return}await showPreview(item);$('openViewer').onclick=()=>openViewer(item)}
  async function showPreview(item){const stage=$('previewStage'),title=$('previewTitle');if(!stage)return;title.textContent=item.title;revokeObjectUrl();currentObjectUrl=URL.createObjectURL(item.blob);stage.innerHTML=`<img alt="${esc(item.title)}">`;stage.querySelector('img').src=currentObjectUrl}
  function renderSearch(){const q=els.searchInput.value.trim();const nq=normalize(q);const list=nq?items.filter(i=>normalize(`${i.name} ${i.folder} ${i.path}`).includes(nq)):[];renderListLayout(`‘${q}’ 검색 결과`,`${list.length.toLocaleString()}개의 악보를 찾았습니다.`,list)}
  function renderRecent(){const byId=new Map(items.map(i=>[i.id,i]));const viewed=getRecent().map(id=>byId.get(id)).filter(Boolean);const fallback=[...items].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));const list=(viewed.length?viewed:fallback).slice(0,50);renderListLayout('최근 악보',viewed.length?`최근 열어본 ${list.length.toLocaleString()}곡`:`최근 저장된 ${list.length.toLocaleString()}곡`,list)}
  function renderSettings(){
    const name=localStorage.getItem('scoreAppName')||'나의 악보집';const theme=localStorage.getItem('scoreTheme')||'system';const updated=Number(localStorage.getItem('scoreUpdatedAt')||0);
    els.content.innerHTML=`<section class="page">${pageHead('설정','앱 이름, 화면 색상과 저장된 악보를 관리합니다.')}<div class="settings-card"><h2>프로그램 이름</h2><p>프로그램 이름을 사용자가 변경할 수 있습니다.</p><form class="inline-form" id="nameForm"><input class="text-input" id="nameInput" value="${esc(name)}" maxlength="30"><button class="action-btn">저장</button></form></div><div class="settings-card"><h2>화면 모드</h2><p>시스템 설정을 따르거나 밝게·어둡게를 직접 선택할 수 있습니다.</p><select class="select-input" id="themeSelect"><option value="system"${theme==='system'?' selected':''}>시스템 설정</option><option value="light"${theme==='light'?' selected':''}>밝게</option><option value="dark"${theme==='dark'?' selected':''}>어둡게</option></select></div><div class="settings-card"><h2>저장된 악보</h2><p>${items.length.toLocaleString()}곡이 저장되어 있습니다.${updated?` 마지막 업데이트: ${new Date(updated).toLocaleString('ko-KR')}`:''}<br>같은 폴더를 다시 가져오면 추가·변경·삭제된 파일이 반영됩니다.</p><div class="settings-actions">${importButton()}<button class="danger-btn" id="clearLibrary"><span data-icon="trash"></span>저장된 악보 전체 삭제</button></div></div><div class="settings-card"><h2>앱 버전</h2><p>현재 설치된 버전과 온라인 최신 버전을 확인합니다.</p><div class="version-box" id="versionBox">현재 버전 <strong>v${VERSION}</strong></div><div class="settings-actions" style="margin-top:12px"><button class="secondary-btn" id="checkVersion">최신 버전 확인</button><button class="action-btn hidden" id="applyUpdate">업데이트 적용</button></div></div><div class="settings-card"><h2>아이패드 사용 안내</h2><p style="margin-bottom:0">Safari의 공유 버튼에서 <strong>홈 화면에 추가</strong>하면 전체 화면 앱처럼 사용할 수 있습니다. Safari의 웹사이트 데이터를 삭제하면 저장된 악보도 함께 삭제될 수 있습니다.</p></div></section>`;
    bindCommon();$('nameForm').onsubmit=e=>{e.preventDefault();const v=$('nameInput').value.trim()||'나의 악보집';localStorage.setItem('scoreAppName',v);applyName();toast('프로그램 이름을 저장했습니다.')};$('themeSelect').onchange=e=>applyTheme(e.target.value,true);$('clearLibrary').onclick=async()=>{if(!confirm('저장된 악보를 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.'))return;await dbClear();await refreshItems();toast('저장된 악보를 삭제했습니다.');renderSettings()};$('checkVersion').onclick=checkVersion;$('applyUpdate').onclick=applyUpdate
  }
  function bindCommon(){renderIcons(els.content);els.content.querySelectorAll('[data-import]').forEach(b=>b.onclick=()=>els.folderInput.click())}

  function applyName(){const name=localStorage.getItem('scoreAppName')||'나의 악보집';els.brandTitle.textContent=name;document.title=name}
  function applyTheme(value=localStorage.getItem('scoreTheme')||'system',save=false){if(save)localStorage.setItem('scoreTheme',value);document.documentElement.dataset.theme=value;const actual=value==='dark'||(value==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);$('quickTheme').querySelector('[data-icon]').dataset.icon=actual?'sun':'moon';renderIcons($('quickTheme'));document.querySelector('meta[name="theme-color"]').content=actual?'#20262d':'#f5f2ec'}
  function cycleTheme(){const current=localStorage.getItem('scoreTheme')||'system';const actual=current==='dark'||(current==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);applyTheme(actual?'light':'dark',true);toast(actual?'밝은 모드로 변경했습니다.':'어두운 모드로 변경했습니다.')}
  async function checkVersion(){const box=$('versionBox');box.innerHTML=`현재 버전 <strong>v${VERSION}</strong><br>최신 버전을 확인하고 있습니다…`;try{const res=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw new Error();const data=await res.json();if(compareVersions(data.version,VERSION)>0){box.innerHTML=`현재 버전 <strong>v${VERSION}</strong><br>새 버전 <strong>v${esc(data.version)}</strong>을 적용할 수 있습니다.<br>${esc(data.notes||'')}`;$('applyUpdate').classList.remove('hidden')}else{box.innerHTML=`현재 버전 <strong>v${VERSION}</strong><br>현재 최신 버전입니다.`}}catch{box.innerHTML=`현재 버전 <strong>v${VERSION}</strong><br>인터넷 연결 또는 version.json을 확인해 주세요.`}}
  function compareVersions(a,b){const aa=String(a).split('.').map(Number),bb=String(b).split('.').map(Number);for(let i=0;i<Math.max(aa.length,bb.length);i++){if((aa[i]||0)!==(bb[i]||0))return(aa[i]||0)-(bb[i]||0)}return 0}
  async function applyUpdate(){try{const regs=await navigator.serviceWorker?.getRegistrations();await Promise.all((regs||[]).map(r=>r.unregister()));const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));location.replace(`${location.pathname}?updated=${Date.now()}`)}catch{location.reload(true)}}

  function revokeObjectUrl(){if(currentObjectUrl){URL.revokeObjectURL(currentObjectUrl);currentObjectUrl=''}}
  function openViewer(item){revokeObjectUrl();currentObjectUrl=URL.createObjectURL(item.blob);els.viewerImage.src=currentObjectUrl;els.viewerTitle.textContent=item.title;els.viewerPath.textContent=item.path;els.viewer.classList.remove('hidden');document.body.style.overflow='hidden';resetZoom();els.viewerHint.classList.remove('hide');clearTimeout(hintTimer);hintTimer=setTimeout(()=>els.viewerHint.classList.add('hide'),1800);localStorage.setItem('scoreRecent',JSON.stringify([item.id,...getRecent().filter(x=>x!==item.id)].slice(0,30)))}
  function closeViewer(){els.viewer.classList.add('hidden');document.body.style.overflow='';resetZoom()}
  function resetZoom(){zoom.scale=1;zoom.x=0;zoom.y=0;applyTransform()}
  function applyTransform(){els.viewerImage.style.transform=`translate3d(${zoom.x}px,${zoom.y}px,0) scale(${zoom.scale})`}
  function getRecent(){try{return JSON.parse(localStorage.getItem('scoreRecent')||'[]')}catch{return[]}}
  function touchDistance(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)}
  function bindViewerGestures(){
    els.viewerCanvas.addEventListener('touchstart',e=>{if(e.touches.length===2){zoom.startDist=touchDistance(e.touches);zoom.startScale=zoom.scale}else if(e.touches.length===1){zoom.startX=e.touches[0].clientX-zoom.x;zoom.startY=e.touches[0].clientY-zoom.y}}, {passive:true});
    els.viewerCanvas.addEventListener('touchmove',e=>{if(e.touches.length===2){e.preventDefault();zoom.scale=Math.min(5,Math.max(1,zoom.startScale*touchDistance(e.touches)/zoom.startDist));applyTransform()}else if(e.touches.length===1&&zoom.scale>1){e.preventDefault();zoom.x=e.touches[0].clientX-zoom.startX;zoom.y=e.touches[0].clientY-zoom.startY;applyTransform()}},{passive:false});
    els.viewerCanvas.addEventListener('touchend',e=>{if(e.touches.length===0){if(zoom.scale===1){zoom.x=0;zoom.y=0;applyTransform()}const now=Date.now();if(now-zoom.lastTap<320)closeViewer();zoom.lastTap=now}},{passive:true});
    els.viewerCanvas.addEventListener('dblclick',closeViewer)
  }

  async function importSelected(){const files=[...els.folderInput.files];els.folderInput.value='';if(!files.length)return;const usable=files.filter(f=>IMAGE_TYPES.test(f.name)||f.type.startsWith('image/'));const nextRoot=usable[0]?(usable[0].webkitRelativePath||usable[0].name).split('/')[0]:'';const roots=[...new Set(items.map(i=>i.root))];if(items.length&&nextRoot&&!roots.includes(nextRoot)){if(!confirm(`현재 악보집을 '${nextRoot}' 폴더의 내용으로 교체할까요?`))return;await dbClear();items=[]}els.importModal.classList.remove('hidden');els.importBar.style.width='0';els.importLabel.textContent='파일 확인 중…';try{await saveImport(files);await refreshItems();els.importLabel.textContent=`완료 · ${items.length.toLocaleString()}곡이 저장되어 있습니다.`;await new Promise(r=>setTimeout(r,650));els.importModal.classList.add('hidden');toast('악보집 업데이트를 완료했습니다.');setPage('home')}catch(err){els.importModal.classList.add('hidden');alert(err.message||'악보를 가져오지 못했습니다.')}}
  function bindGlobal(){
    document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>setPage(b.dataset.page));$('openSettings').onclick=()=>setPage('settings');$('quickTheme').onclick=cycleTheme;els.folderInput.onchange=importSelected;
    els.searchInput.oninput=()=>els.clearSearch.classList.toggle('hidden',!els.searchInput.value);els.clearSearch.onclick=()=>{els.searchInput.value='';els.clearSearch.classList.add('hidden');els.searchInput.focus();setPage('home')};els.searchForm.onsubmit=e=>{e.preventDefault();if(!els.searchInput.value.trim()){toast('검색어를 입력해 주세요.');return}currentPage='search';document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));render()};
    $('closeViewer').onclick=closeViewer;$('resetZoom').onclick=resetZoom;bindViewerGestures();document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!els.viewer.classList.contains('hidden'))closeViewer()});
    matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',()=>{if((localStorage.getItem('scoreTheme')||'system')==='system')applyTheme('system')})
  }
  async function init(){
    renderIcons();applyName();applyTheme();bindGlobal();
    try{db=await openDb();await refreshItems();render()}catch(err){console.error(err);els.content.innerHTML='<section class="page"><div class="empty"><h2>앱 저장공간을 열 수 없습니다</h2><p>Safari의 개인정보 보호 설정 또는 브라우저 저장공간을 확인해 주세요.</p></div></section>'}
    if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  init();
})();
