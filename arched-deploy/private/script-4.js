/* V103: globe navigation, coordinated study filters, retained Leaflet fallback. */
const MAP51_RECORDS=window.MEMBER_DATA.MAP51_RECORDS,MAP53=window.MEMBER_DATA.MAP53_DATA;
let mapRecovery104=0,mapBase104="auto";
let map51Request=null,map102=null,mapLayer102=null,map53Selected=null,mapFilterTimer61,mapEngine103=null,mapReady103=false,mapMarkers103=[];
let map51Saved=new Set();try{map51Saved=new Set(JSON.parse((window.archedStorage109||localStorage).getItem('arched_map_saved_v51')||'[]'))}catch{}
const mapKinds102=new Set(['church','architecture','sculpture','archaeology','museum']);
const mapColors103={church:'#a5664a',architecture:'#4766b1',sculpture:'#886db4',archaeology:'#9c8050',museum:'#29867b'};
function map51Html(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function mapRows102(){return window.MEMBER_DATA.LEARNING_LINKS102?.places||MAP51_RECORDS}
function mapPeriodMatches106(r,era){if(!era)return true;if(!Number.isFinite(r.start106))return r.period103===era;const range={ancient:[-Infinity,499],medieval:[500,1399],renaissance:[1400,1599],baroque:[1600,1749],'1700–1900':[1750,1899],modern:[1900,1944],postwar:[1945,Infinity]}[era];return !!range&&r.start106<=range[1]&&r.end106>=range[0]}
function map51Filtered(){const q=pNorm(document.getElementById('mapSearch51')?.value||''),saved=document.getElementById('mapSaved51')?.checked,era=document.getElementById('mapEra103')?.value,style=document.getElementById('mapStyle103')?.value;return mapRows102().filter(r=>(r.kinds103||[r.kind]).some(k=>mapKinds102.has(k))&&mapPeriodMatches106(r,era)&&(!style||(r.styles103||[]).includes(style))&&(!saved||map51Saved.has(r.id)||(r.mapIds||[]).some(id=>map51Saved.has(id)))&&(!q||pNorm([r.title,r.city,r.country,r.style,r.creator,...(r.aliases||[])].join(' ')).includes(q)))}
function syncMapKinds107(){document.querySelectorAll('[data-map-kind102]').forEach(b=>{const k=b.dataset.mapKind102,on=mapKinds102.has(k),color=mapColors103[k];b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',b.textContent+' — '+(on?'shown':'hidden'));b.style.setProperty('--map-color',color);b.style.setProperty('--map-ink',{"church": "#fff", "architecture": "#fff", "sculpture": "#000", "archaeology": "#000", "museum": "#000"}[k]);})}
function toggleMapKind102(kind){mapKinds102.has(kind)?mapKinds102.delete(kind):mapKinds102.add(kind);syncMapKinds107();renderMap51()}
function resetMapFilters107(){for(const id of ['mapSearch51','mapEra103','mapStyle103'])document.getElementById(id).value='';document.getElementById('mapSaved51').checked=false;Object.keys(mapColors103).forEach(k=>mapKinds102.add(k));syncMapKinds107();closeMapDetail61();renderMap51()}

function filterMap61(){clearTimeout(mapFilterTimer61);mapFilterTimer61=setTimeout(()=>{renderMap51();if(document.getElementById('mapSearch51').value.trim())fitMap102(map51Filtered());},180)}
function mapPadding103(){return document.getElementById('mapDetail51').hidden?{top:50,bottom:50,left:50,right:50}:innerWidth<760?{top:40,bottom:Math.min(330,document.getElementById('worldMap102').clientHeight*.5),left:40,right:40}:{top:45,bottom:45,left:45,right:390}}
function fitMap102(rows=map51Filtered()){
 if(!map102||!rows.length)return;
 if(mapEngine103==='canvas'){map102.fitPlaces(rows);return}
 if(mapEngine103==='leaflet'){map102.fitBounds(rows.map(r=>[r.lat,r.lon]),{padding:[45,45],maxZoom:15,animate:false});return}
 const bounds=new maplibregl.LngLatBounds();rows.forEach(r=>bounds.extend([r.lon,r.lat]));map102.fitBounds(bounds,{padding:mapPadding103(),maxZoom:15,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:550});
}
function map53City(){fitMap102()}
function map53Zoom(factor){if(map102)map102.setZoom(map102.getZoom()+Math.log2(factor))}
function resetWorld102(){closeMapDetail61();if(mapEngine103!=='leaflet')map102?.easeTo({center:[12,26],zoom:2,bearing:0,pitch:0,duration:450});else map102?.setView([24,10],2)}
function setMapProjection103(type){if(!map102||mapEngine103==='leaflet')return;map102.setProjection({type});map102.easeTo({pitch:0,bearing:0,duration:350});document.querySelectorAll('[data-projection103]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.projection103===type)));}
function mapHeight103(){const el=document.querySelector('.map-stage102');if(!el)return;const top=el.getBoundingClientRect().top,foot=innerWidth<760?135:53;el.style.height=Math.max(innerWidth<760?340:440,innerHeight-top-foot)+'px';}
function initializeCanvas104(camera){
 clearTimeout(mapRecovery104);mapReady103=false;
 if(map102){try{map102.remove()}catch{}}map102=null;mapMarkers103=[];
 document.getElementById('worldMap102').replaceChildren();
 mapEngine103='canvas';map102=new EarthCanvas104('worldMap102',camera||{center:[12,26],zoom:2});window.ARCHED_MAP102=map102;
 mapReady103=true;mapBaseMode104('earth');document.querySelectorAll('[data-basemap104]').forEach(b=>{b.disabled=b.dataset.basemap104!=='earth'});document.querySelectorAll('[data-projection103]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.projection103==='globe')));map102.on('render',renderMap53Markers);map102.on('moveend',renderMap53Markers);
 document.getElementById('mapNetwork102').textContent='Embedded globe · regional overview · open Google Earth from a place for finer detail';renderMap51();
}
function mapBaseMode104(mode){
 if(mapEngine103==='canvas'&&mode!=='earth'){document.getElementById('mapNetwork102').textContent='Embedded Earth view · open a place in Google Earth for street detail';return}
 mapBase104=mode;document.querySelectorAll('[data-basemap104]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.basemap104===mode)));
 if(mapEngine103!=='globe')return;
 const remote=location.protocol!=='file:'&&!window.ARCHED_MAP_NO_TILES102;
 if(map102.getLayer('streets'))map102.setPaintProperty('streets','raster-opacity',mode==='earth'?0:mode==='street'?1:['interpolate',['linear'],['zoom'],4,0,6,1]);
 if(mode==='street'&&!remote)document.getElementById('mapNetwork102').textContent='Street detail: open the preview launcher or the published website';
 else document.getElementById('mapNetwork102').textContent=location.protocol==='file:'?'Embedded Earth · regional satellite detail loads online':'';
}
function initializeMap51(){
 syncMapKinds107();
 const styleSelect=document.getElementById('mapStyle103');for(const name of [...new Set(mapRows102().flatMap(r=>r.styles103||[]))].sort()){if(![...styleSelect.options].some(o=>o.value===name)){const option=document.createElement('option');option.value=name;option.textContent=name;styleSelect.appendChild(option);}}
 mapHeight103();
 if(map102){if(mapEngine103==='leaflet')map102.invalidateSize();else map102.resize();renderMap51();return}
 if(!window.maplibregl||window.ARCHED_FORCE_CANVAS104||(typeof maplibregl.supported==='function'&&!maplibregl.supported())){initializeCanvas104();return}
 try{
 mapEngine103='globe';const world=window.MEMBER_DATA.WORLD_MAP102,earth=window.ARCHED_EARTH104;
 if(!window.archedEarthProtocol104){maplibregl.addProtocol('arched-earth',async params=>{
  const key=params.url.replace('arched-earth://',''),raw=atob(earth.tiles[key]);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return{data:bytes.buffer};
 });window.archedEarthProtocol104=true}
 const style={version:8,projection:{type:'globe'},sky:{'sky-color':'#071322','horizon-color':'#729cb7','fog-color':'#293f50','atmosphere-blend':.7,'fog-ground-blend':0},sources:{world:{type:'geojson',data:world},earth:{type:'raster',tiles:['arched-earth://{z}/{x}/{y}'],tileSize:256,maxzoom:3,attribution:'NASA Earth Observatory · Blue Marble'}},layers:[
 {id:'ocean',type:'background',paint:{'background-color':'#183c5a'}},
 {id:'land',type:'fill',source:'world',paint:{'fill-color':'#b3b891','fill-opacity':1}},
 {id:'earth',type:'raster',source:'earth',paint:{'raster-fade-duration':0}},
 {id:'borders',type:'line',source:'world',paint:{'line-color':'#e0e5d5','line-opacity':.25,'line-width':.6}}]};
 const online=!window.ARCHED_MAP_NO_TILES102;
 if(online){style.sources.satellite={type:'raster',tiles:['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],tileSize:256,minzoom:3,maxzoom:8,attribution:'NASA GIBS'};style.layers.splice(3,0,{id:'satellite',source:'satellite',type:'raster',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],3,0,4,1],'raster-fade-duration':150}})}
 if(location.protocol!=='file:'&&online){style.sources.streets={type:'raster',tiles:[window.ARCHED_MAP_CONFIG?.tileUrl||'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,minzoom:4,maxzoom:19,attribution:window.ARCHED_MAP_CONFIG?.attribution||'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'};style.layers.push({id:'streets',source:'streets',type:'raster',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],4,0,6,1]}})}
 map102=new maplibregl.Map({container:'worldMap102',style,center:[12,26],zoom:2,minZoom:0,maxZoom:location.protocol!=='file:'&&online?20:8,maxPitch:75,renderWorldCopies:true,dragRotate:true,touchPitch:true,attributionControl:{compact:true,customAttribution:'Natural Earth · MapLibre'},fadeDuration:150,pixelRatio:window.ARCHED_PERFORMANCE109?.pixelRatio||1});window.ARCHED_MAP102=map102;
 map102.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-left');map102.addControl(new maplibregl.ScaleControl({maxWidth:100,unit:'metric'}),'bottom-left');
 map102.on('style.load',()=>{mapReady103=true;mapBaseMode104(mapBase104);renderMap51()});
 map102.on('moveend',renderMap53Markers);
 map102.on('sourcedata',e=>{if(e.sourceId==='world'&&e.isSourceLoaded)clearTimeout(mapRecovery104);if(e.sourceId==='streets'&&e.isSourceLoaded)document.getElementById('mapNetwork102').textContent=''});
 map102.on('error',e=>{if(e.sourceId==='streets')document.getElementById('mapNetwork102').textContent='Street detail unavailable · embedded Earth remains visible';});
 map102.on('webglcontextlost',()=>{const camera={center:[map102.getCenter().lng,map102.getCenter().lat],zoom:map102.getZoom()};initializeCanvas104(camera)});
 mapRecovery104=setTimeout(()=>{if(mapEngine103==='globe'&&(!mapReady103||!map102.isSourceLoaded('world')))initializeCanvas104()},10000);
 new ResizeObserver(()=>map102?.resize?.()).observe(document.getElementById('worldMap102'));renderMap51();
 }catch(e){initializeCanvas104()}
}
// V106: readable overview and a cluster directory before camera movement.
let mapClusterRows106=[],mapReturn108=null;
function mapCamera108(){if(!map102)return null;const c=map102.getCenter?.();return c?{center:[c.lng,c.lat],zoom:map102.getZoom(),bearing:map102.getBearing?.()||0,pitch:map102.getPitch?.()||0}:null;}
function backMapArea108(){const previous=mapReturn108;if(!previous)return;openMapCluster106(previous.rows,true);document.getElementById("mapDetail51").scrollTop=previous.scrollTop;const c=previous.camera;if(c&&map102){if(mapEngine103==='leaflet')map102.setView([c.center[1],c.center[0]],c.zoom,{animate:false});else map102.easeTo({...c,duration:0});}document.querySelector(".map-area-zoom106")?.focus();}

function mapRowCard106(r){return `<button class="map-list-item51 map-place106" onclick="selectMapPlace51('${r.id}',this.closest('.map-area-list106')?'cluster':'list')">${mapPhotoCard108(r)}<span><strong>${map51Html(r.title)}</strong><small>${map51Html([r.city,r.country].filter(Boolean).join(' · '))}</small>${r.built?'<small>'+map51Html(r.built)+'</small>':''}</span></button>`}
function openMapCluster106(group,returning=false){if(!returning)mapReturn108={rows:[...group],camera:mapCamera108(),scrollTop:0};mapClusterRows106=group;map53Selected=null;const detail=document.getElementById('mapDetail51');detail.innerHTML=`<button class="map-close51" aria-label="Close area" onclick="closeMapDetail61()">×</button><span class="map-kicker51">Explore this area</span><h2>${group.length} places to know</h2><p>Choose a place to see its story, timeline and practice questions.</p><button class="map-area-zoom106" onclick="fitMap102(mapClusterRows106)">Zoom to this area ↗</button><div class="map-area-list106">${group.map(mapRowCard106).join('')}</div>`;detail.hidden=false;renderMap53Markers();observeMapPhotos108()}
function renderMap51(){const rows=map51Filtered();document.getElementById('mapCount51').textContent=rows.length+' / '+mapRows102().length+' places';document.getElementById('mapList51').innerHTML=rows.map(mapRowCard106).join('');if(map53Selected&&!rows.some(r=>r.id===map53Selected))closeMapDetail61();renderMap53Markers();observeMapPhotos108()}
function renderMap53Markers(){
 if(mapEngine103==='leaflet'){renderLeafletMarkers103();return}if(!map102||!mapReady103)return;
 for(const m of mapMarkers103)m.remove();mapMarkers103=[];const rows=map51Filtered(),zoom=map102.getZoom(),size=map102.getCanvas().getBoundingClientRect(),groups=new Map(),center=map102.getCenter(),rad=Math.PI/180;
 for(const r of rows){const p=map102.project([r.lon,r.lat]);if(p.x<-30||p.x>size.width+30||p.y<-30||p.y>size.height+30)continue;
  if(map102.getProjection().type==='globe'&&Math.sin(r.lat*rad)*Math.sin(center.lat*rad)+Math.cos(r.lat*rad)*Math.cos(center.lat*rad)*Math.cos((r.lon-center.lng)*rad)<.02)continue;
  const key=zoom<9&&r.id!==map53Selected?Math.floor(p.x/54)+','+Math.floor(p.y/54):r.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);
 }
 for(const group of groups.values()){
  const r=group[0],cluster=group.length>1,selected=r.id===map53Selected,element=document.createElement('button');element.type='button';element.className=cluster?'map-globe-cluster103':'map-globe-pin103 '+r.kind+(selected?' selected':'');element.style.setProperty('--pin',mapColors103[r.kind]||'#4766b1');element.textContent=cluster?group.length:'';element.title=cluster?group.length+' study places':r.title;element.setAttribute('aria-label',element.title);
  const point=[r.lon,r.lat]; // Representative member avoids averaging across the antimeridian.
  if(!cluster&&(zoom>=5||selected)){const label=document.createElement('span');label.className='map-pin-label103';label.textContent=r.title;element.appendChild(label)}
  else if(cluster){const cities=[...new Set(group.map(r=>r.city).filter(Boolean))];if(cities.length===1){const label=document.createElement('span');label.className='map-pin-label103';label.textContent=cities[0];element.appendChild(label)}}
  element.onclick=event=>{event.stopPropagation();if(cluster)openMapCluster106(group);else selectMapPlace51(r.id)};
  if(mapEngine103==='canvas'){const pos=map102.project(point);element.style.position='absolute';element.style.left=pos.x+'px';element.style.top=pos.y+'px';element.style.transform='translate(-50%,-50%)';map102.markerLayer.appendChild(element);mapMarkers103.push({remove:()=>element.remove()})}
  else mapMarkers103.push(new maplibregl.Marker({element,anchor:'center',opacityWhenCovered:0}).setLngLat(point).addTo(map102));
 }
 document.getElementById('mapStatus51').textContent=rows.length?'Tap a numbered cluster to browse places · drag to travel · scroll / pinch to zoom':'No matching places. Adjust the search or filters.';
}
function map53Find(id){return mapRows102().find(r=>r.id===id||r.mapIds?.includes(id))}
function closeMapDetail61(){mapReturn108=null;mapClusterRows106=[];document.getElementById('mapDetail51').hidden=true;map53Selected=null;renderMap53Markers()}
function churchPhoto62(r){const p=r.photo;if(!p?.src)return mapPhotoPlaceholder108(r);return `<figure class="church-photo62" data-map-photo108="${r.id}"><button class="church-photo-open62" onclick="openChurchPhoto62('${r.id}')" aria-label="Enlarge photograph"><img src="${map51Html(window.MAP_IMAGES104?.[p.src]||window.PRACTICE_BUILDING_IMAGES103?.[p.src]||p.src)}" alt="${map51Html(r.title)}" loading="lazy" decoding="async" onerror="this.hidden=true;this.closest('figure').querySelector('.photo-error62').hidden=false;requestMapPhoto108('${r.id}')"></button><p class="photo-error62" hidden>Photograph unavailable. Open the reference below.</p><figcaption><a href="${map51Html(p.sourceUrl||r.reference)}" target="_blank" rel="noopener">${map51Html(p.credit||'Photo source')}</a> · ${p.licenseUrl?'<a href="'+map51Html(p.licenseUrl)+'" target="_blank" rel="noopener">'+map51Html(p.license||'License')+'</a>':map51Html(p.license||'See source')}${p.online108?' · Online photograph':''}${r.photoScope108?'<br>'+map51Html(r.photoScope108):''}</figcaption></figure>`}
function openChurchPhoto62(id){const r=map53Find(id);if(!r?.photo?.src)return;document.getElementById('churchPhotoFull62').src=window.MAP_IMAGES104?.[r.photo.src]||window.PRACTICE_BUILDING_IMAGES103?.[r.photo.src]||r.photo.src;document.getElementById('churchPhotoFull62').alt=r.title;document.getElementById('churchPhotoTitle62').textContent=r.title;document.getElementById('churchPhotoDialog62').showModal()}
function mapMuseum103(r){const works=(r.museumAssets103||[]).map(id=>VISUAL44_MAP.get(id)).filter(Boolean);if(!works.length)return '';return `<section class="map-museum103"><h3>In the collection · ${works.length}</h3><div>${works.slice(0,12).map(a=>`<button title="${map51Html(a.title+' · '+a.artist)}" onclick="openMuseumImage61('${a.assetId}')"><img alt="${map51Html(a.title)}" loading="lazy" src="${map51Html(MUSEUM56_THUMBNAILS[a.assetId]||VISUAL44_IMAGES[a.assetId])}"><span>${map51Html(a.title)}</span></button>`).join('')}</div><button onclick="mapOpenMuseum103('${r.id}')">Browse collection ↗</button></section>`}
function mapOpenMuseum103(id){const r=map53Find(id);if(!r)return;goView('museumView');initializeMuseum46();document.getElementById('museumSearch45').value='';for(const key of ['museumArtist50','museumPriority45']){const e=document.getElementById(key);if(e)e.value=''}const select=document.getElementById('museumSelect45'),option=[...select.options].find(o=>pNorm(o.textContent)===pNorm(r.museumName103||r.title));if(option)select.value=option.value;else{select.value='';document.getElementById('museumSearch45').value=r.museumName103||r.title}renderMuseum45()}
function selectMapPlace51(id,origin){const r=map53Find(id);if(!r)return;if(origin==='cluster'&&mapReturn108){mapReturn108.scrollTop=document.getElementById('mapDetail51').scrollTop||0;mapReturn108.camera=mapCamera108();}else mapReturn108=null;initializeMap51();if(!map102)return;if(!map51Filtered().some(p=>p.id===r.id)){mapKinds102.add(r.kind);for(const key of ['mapSearch51','mapEra103','mapStyle103'])document.getElementById(key).value='';document.getElementById('mapSaved51').checked=false;}syncMapKinds107();map53Selected=r.id;
 const detail=document.getElementById('mapDetail51');detail.innerHTML=`<button class="map-close51" aria-label="Close place" onclick="closeMapDetail61()">×</button>${mapReturn108?'<button class="map-back108" onclick="backMapArea108()">← Back to area list</button>':''}<span class="map-kicker51">${map51Html([r.city,r.country].filter(Boolean).join(' · '))}</span><h2>${map51Html(r.title)}</h2>${churchPhoto62(r)}<dl class="church-facts54">${[['Style',r.style],['Built',r.built],['Architect / artist',r.creator]].filter(x=>x[1]).map(([k,v])=>'<dt>'+k+'</dt><dd>'+map51Html(v)+'</dd>').join('')}</dl>${r.note?'<p>'+map51Html(r.note)+'</p>':''}${r.coordinatePrecision106?'<p class="map-coordinate-note106">'+map51Html(r.coordinatePrecision106)+'</p>':''}${window.learningLinks102?.('map',r.id)||''}${mapMuseum103(r)}<div class="map-detail-actions51"><a href="${map51Html(r.reference)}" target="_blank" rel="noopener">Reference ↗</a><a href="https://earth.google.com/web/search/${r.lat},${r.lon}" target="_blank" rel="noopener">Google Earth ↗</a><button onclick="toggleMapSaved51('${r.id}')">${map51Saved.has(r.id)?'Unsave':'Save'}</button></div>`;detail.hidden=false;
 if(mapEngine103!=='leaflet'){const mobile=innerWidth<760;map102.easeTo({center:[r.lon,r.lat],zoom:Math.max(Math.min(map102.getZoom(),mapEngine103==='canvas'?7:12),mapEngine103==='canvas'?5:7),bearing:0,pitch:0,offset:mobile?[0,-Math.min(160,map102.getCanvas().clientHeight*.22)]:[-175,0],duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:650});}
 else{map102.setView([r.lat,r.lon],Math.max(7,Math.min(12,map102.getZoom())),{animate:false});map102.panInside([r.lat,r.lon],{paddingTopLeft:[40,40],paddingBottomRight:innerWidth<760?[40,300]:[375,60],animate:false})}renderMap51();if(!r.photo?.src)requestMapPhoto108(r.id);
}
function toggleMapSaved51(id){map51Saved.has(id)?map51Saved.delete(id):map51Saved.add(id);try{(window.archedStorage109||localStorage).setItem('arched_map_saved_v51',JSON.stringify([...map51Saved]))}catch{}const b=document.querySelector('.map-detail-actions51 button');if(b)b.textContent=map51Saved.has(id)?'Unsave':'Save';renderMap51()}
function openMap52(){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='mapView'));document.querySelectorAll('.navitem').forEach(b=>b.classList.toggle('active',b.dataset.view==='mapView'));initializeMap51()}
document.querySelector('.navitem[data-view="mapView"]')?.addEventListener('click',openMap52);
window.addEventListener('resize',()=>{if(document.getElementById('mapView').classList.contains('active'))mapHeight103()});

function initializeLeaflet103(){
 if(map102){map102.invalidateSize();renderMap51();return}
 if(!window.L){document.getElementById('mapStatus51').textContent='Map files could not load. Extract the full ZIP, including the vendor folder.';return}
 const L=window.L;map102=L.map('worldMap102',{center:[24,10],zoom:2,minZoom:2,maxZoom:20,worldCopyJump:true,zoomSnap:.25,zoomDelta:.75,scrollWheelZoom:true,inertia:!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches});window.ARCHED_MAP102=map102;
 const outlinePane=map102.createPane('worldOutline102');outlinePane.style.zIndex='190';outlinePane.style.pointerEvents='none';
 if(window.MEMBER_DATA.WORLD_MAP102)L.geoJSON(window.MEMBER_DATA.WORLD_MAP102,{pane:'worldOutline102',style:{color:'#a3b6b3',weight:.7,fillColor:'#ecefe5',fillOpacity:1},interactive:false}).addTo(map102);
 map102.attributionControl.addAttribution('Natural Earth');
 if(location.protocol==='http:'||location.protocol==='https:'){
  const config=window.ARCHED_MAP_CONFIG||{};
  if(!window.ARCHED_MAP_NO_TILES102){const tiles=L.tileLayer(config.tileUrl||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxNativeZoom:19,maxZoom:20,keepBuffer:1,updateWhenIdle:true,referrerPolicy:'strict-origin-when-cross-origin',attribution:config.attribution||'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map102);tiles.on('tileerror',()=>document.getElementById('mapNetwork102').textContent='Street tiles unavailable · saved world outline remains visible');tiles.on('load',()=>document.getElementById('mapNetwork102').textContent='');}
 }else document.getElementById('mapNetwork102').textContent='Saved world outline · street detail requires the hosted website';
 mapLayer102=L.layerGroup().addTo(map102);L.control.scale({imperial:false}).addTo(map102);map102.on('moveend zoomend',renderMap53Markers);
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map102?.invalidateSize()).observe(document.getElementById('worldMap102'));
 renderMap51();
}
function renderLeafletMarkers103(){if(!map102||!mapLayer102)return;const L=window.L;mapLayer102.clearLayers();const rows=map51Filtered(),bounds=map102.getBounds().pad(.12),zoom=map102.getZoom(),groups=new Map();
 for(const r of rows){if(!bounds.contains([r.lat,r.lon]))continue;const p=map102.latLngToContainerPoint([r.lat,r.lon]),key=zoom<8?Math.floor(p.x/64)+','+Math.floor(p.y/64):r.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
 for(const group of groups.values()){
  if(group.length>1){const lat=group.reduce((s,r)=>s+r.lat,0)/group.length,lon=group.reduce((s,r)=>s+r.lon,0)/group.length;const marker=L.marker([lat,lon],{icon:L.divIcon({className:'map-cluster102',html:'<span>'+group.length+'</span>',iconSize:[32,32]}),title:group.length+' study places'}).addTo(mapLayer102);marker.on('click',()=>openMapCluster106(group));const cities=[...new Set(group.map(r=>r.city).filter(Boolean))];if(cities.length===1)marker.bindTooltip(map51Html(cities[0]),{permanent:true,direction:'right',className:'map-city-label102'});continue}
  const r=group[0],selected=r.id===map53Selected;const marker=L.marker([r.lat,r.lon],{icon:L.divIcon({className:'map-pin102 '+r.kind+(selected?' selected':''),html:'<span></span>',iconSize:[24,24],iconAnchor:[12,12]}),title:r.title,keyboard:true,zIndexOffset:selected?1000:0}).addTo(mapLayer102);marker.bindTooltip(map51Html(zoom<6?r.city||r.title:r.title),{permanent:zoom>=5||selected,direction:'right'});marker.on('click',()=>selectMapPlace51(r.id));
 }
 document.getElementById('mapStatus51').textContent=rows.length?'Drag to explore · scroll or pinch to zoom · tap a place':'No matching places. Adjust the search or filters.';
}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('mapView')?.classList.contains('active')&&!document.getElementById('mapDetail51').hidden)closeMapDetail61();});
syncMapKinds107();

/* Resolve missing photographs on demand from Commons; never substitute a random search result. */
const mapPhotoJobs108=new Map(),mapPhotoBusy108=new Set(),mapPhotoQueue108=[];let mapPhotoRunning108=0,mapPhotoObserver108=null;
const mapPhotoCache108=(()=>{try{return JSON.parse((window.archedStorage109||localStorage).getItem('arched_map_photos_v108')||'{}')}catch{return{}}})();
function mapPhotoText108(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function mapPhotoURL108(s){try{const u=new URL(s);return u.protocol==='https:'&&/(^|\.)wikimedia\.org$/.test(u.hostname)?u.href:null}catch{return null}}
async function mapPhotoAPI108(host,parameters){const url='https://'+host+'/w/api.php?'+new URLSearchParams({format:'json',origin:'*',...parameters});const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(url,{credentials:'omit',signal:controller.signal});if(!response.ok)throw Error('Photo service unavailable');const data=await response.json();if(data.error)throw Error('Photo service unavailable');return data}finally{clearTimeout(timer)}}
function mapPhotoPlaceholder108(r){return `<div class="map-photo-placeholder108" data-map-photo108="${r.id}"><span>Photograph loads online</span><button type="button" onclick="requestMapPhoto108('${r.id}',true)">Load photograph</button><a href="${map51Html(r.reference)}" target="_blank" rel="noopener">View source ↗</a></div>`;}
function mapPhotoCard108(r){const p=r.photo,src=p?.src&&(window.MAP_IMAGES104?.[p.src]||window.PRACTICE_BUILDING_IMAGES103?.[p.src]||p.src);return src?`<img data-map-image108="${r.id}" src="${map51Html(src)}" alt="" loading="lazy" onerror="this.hidden=true;requestMapPhoto108('${r.id}')">`:`<span class="map-no-photo106" data-map-photo108="${r.id}" aria-label="Photograph loads online">Photo</span>`;}
function applyMapPhoto108(r,p){r.photo=p;document.querySelectorAll('[data-map-photo108="'+r.id+'"]').forEach(el=>{if(el.classList.contains('map-no-photo106')){el.outerHTML=mapPhotoCard108(r)}else el.outerHTML=churchPhoto62(r)});document.querySelectorAll('[data-map-image108="'+r.id+'"]').forEach(el=>{el.src=p.src;el.hidden=false});}
async function resolveMapPhoto108(r){
 const plan=r.photoLookup108;if(!plan)throw Error('Photo source not registered');let filename;
 if(plan.qid){const d=await mapPhotoAPI108('www.wikidata.org',{action:'wbgetentities',ids:plan.qid,props:'claims'});filename=d.entities?.[plan.qid]?.claims?.P18?.find(x=>x.rank!=='deprecated')?.mainsnak?.datavalue?.value;}
 if(!filename&&plan.title){const d=await mapPhotoAPI108('en.wikipedia.org',{action:'query',titles:plan.title,redirects:'1',prop:'pageimages',piprop:'name'});filename=Object.values(d.query?.pages||{})[0]?.pageimage;}
 if(!filename)throw Error('No verified photograph is available from this source');
 const d=await mapPhotoAPI108('commons.wikimedia.org',{action:'query',titles:'File:'+filename,prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'960'}),im=Object.values(d.query?.pages||{})[0]?.imageinfo?.[0],m=im?.extmetadata||{},license=mapPhotoText108(m.LicenseShortName?.value),credit=mapPhotoText108(m.Artist?.value),src=mapPhotoURL108(im?.thumburl||im?.url),sourceUrl=mapPhotoURL108(im?.descriptionurl);
 if(!src||!sourceUrl||!credit||!/^(CC BY(?:-SA)?(?: |$)|CC0|Public domain)/i.test(license)||/\b(NC|ND)\b/i.test(license)||!/^image\/(jpeg|png|webp)$/.test(im?.mime||''))throw Error('A reusable photograph could not be confirmed');
 return {src,sourceUrl,file:filename,credit,license,licenseUrl:/^https?:\/\/creativecommons\.org\//.test(m.LicenseUrl?.value||'')?m.LicenseUrl.value:'',photoSource108:'Commons via exact place record',retrievedAt108:new Date().toISOString(),online108:true};
}
function requestMapPhoto108(id,retry=false){const r=map53Find(id);if(!r)return Promise.resolve(null);if(mapPhotoJobs108.has(id)&&(!retry||mapPhotoBusy108.has(id)))return mapPhotoJobs108.get(id);if(mapPhotoCache108[id]&&!retry){const p=mapPhotoCache108[id];if(mapPhotoURL108(p.src)&&p.credit&&p.license){applyMapPhoto108(r,p);return Promise.resolve(p)}}
 mapPhotoBusy108.add(id);const job=new Promise(resolve=>{mapPhotoQueue108.push({r,resolve});pumpMapPhotos108()});mapPhotoJobs108.set(id,job);return job;}
function pumpMapPhotos108(){while(mapPhotoRunning108<3&&mapPhotoQueue108.length){const {r,resolve}=mapPhotoQueue108.shift();mapPhotoRunning108++;resolveMapPhoto108(r).then(p=>{mapPhotoCache108[r.id]=p;try{(window.archedStorage109||localStorage).setItem('arched_map_photos_v108',JSON.stringify(mapPhotoCache108))}catch{}applyMapPhoto108(r,p);resolve(p)}).catch(()=>{document.querySelectorAll('.map-photo-placeholder108[data-map-photo108="'+r.id+'"]').forEach(el=>{const label=el.querySelector('span');if(label)label.textContent='Photograph could not load. Retry online or open the source.'});resolve(null)}).finally(()=>{mapPhotoBusy108.delete(r.id);mapPhotoRunning108--;pumpMapPhotos108()})}}
function observeMapPhotos108(){if(typeof IntersectionObserver!=='function')return;if(!mapPhotoObserver108)mapPhotoObserver108=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){mapPhotoObserver108.unobserve(e.target);requestMapPhoto108(e.target.dataset.mapPhoto108)}},{rootMargin:'150px'});document.querySelectorAll('.map-photo-placeholder108, .map-no-photo106[data-map-photo108]').forEach(el=>mapPhotoObserver108.observe(el));}
