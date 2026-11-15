/* Paper Planet: a geographic reading interface. No build step. */
(async function () {
'use strict';
const root=document.getElementById('atlas-app'), $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data;
try {const r=await fetch('data/events.json');if(!r.ok)throw Error();data=await r.json();}catch(e){$('#edition-date').textContent='Edition unavailable';$('#story-list').innerHTML='<p class="empty">The news edition could not be loaded. Please reload to try again.</p>';$('#map-loading').textContent='News unavailable';return;}
const events=data.events, tones={urgent:'Urgent',neutral:'Neutral',good:'Good news'},colors={urgent:'#f28d74',neutral:'#d9c5a0',good:'#91c8a3'};
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let orbitSpeed=2;
let orbitEnabled=!motionPreference.matches, orbitTime=0, resumeAt=0, preview=null, previewRemaining=0, previewHover=false, mapVisible=true, lastOrbitFrame=0, nextPreviewAt=2500, nextTwinkleAt=1200;
const previewHistory=new Map();
let seen=new Set(),active=null,filter='all',query='',view='globe',rotation=[-16,-15,0],zoom=1,projection,world,animation;
const storageKey='pp-seen-'+(data.day.edition||data.day.iso);
try{seen=new Set(JSON.parse(localStorage.getItem(storageKey)||'[]').filter(id=>events.some(e=>e.id===id)));}catch(e){}
$('#edition-date').textContent=new Date(data.day.iso+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
$('#edition-note').textContent=/seed/i.test(data.day.label)?'Sample edition · Stories bundled with the project.':'Updated '+(data.day.updated||'with this edition')+' · Refreshes every 3 hours';
const filtered=()=>events.filter(e=>(filter==='all'||e.tone===filter)&&(!query||[e.title,e.place,e.country,e.source].join(' ').toLowerCase().includes(query)));
function progress(){$('#read-count').textContent=seen.size+' of '+events.length+' stories explored';}
function renderList(){hidePreview();const list=filtered();$('#result-count').textContent=list.length+' STORIES';$('#story-list').innerHTML=list.length?list.map(e=>'<button class="story-row '+(seen.has(e.id)?'seen':'')+'" data-id="'+esc(e.id)+'"><span class="story-meta"><i class="tone-dot '+esc(e.tone)+'"></i>'+esc(e.country)+'<span class="row-arrow" aria-hidden="true"><svg class=\"arrow-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M5 19 19 5M5 5h14v14\"/></svg></span></span><h2>'+esc(e.title)+'</h2></button>').join(''):'<p class="empty">No stories match. Try another place or clear your search.</p>';$$('.story-row').forEach(b=>b.onclick=()=>openStory(b.dataset.id));drawPins();}
function openStory(id,focus=true){const e=events.find(e=>e.id===id);if(!e)return;hidePreview();active=e;seen.add(id);try{localStorage.setItem(storageKey,JSON.stringify([...seen]));}catch(err){}progress();$('#edition-view').hidden=true;$('#story-view').hidden=false;
const url=/^https?:\/\//i.test(e.url||'')?e.url:null;
$('#story-view').innerHTML='<button class="back-button">← Back to the edition</button><div class="article-tone">'+esc(tones[e.tone])+'</div><div class="article-place">'+esc(e.place)+' · '+esc(e.country)+'</div><h2 class="article-title">'+esc(e.title)+'</h2><hr class="article-rule">'+[['What happened',e.what],['Why it matters',e.why]].filter(x=>x[1]).map(([h,p])=>'<section class="article-section"><h3>'+h+'</h3><p>'+esc(p)+'</p></section>').join('')+(e.stats?.length?'<div class="article-stats">'+e.stats.map(s=>'<div><strong>'+esc(s.v)+'</strong><span>'+esc(s.l)+'</span></div>').join('')+'</div>':'')+(e.jargon?'<section class="article-section"><h3>'+esc(e.jargon.term)+'</h3><p>'+esc(e.jargon.def)+'</p></section>':'')+(url?'<a class="source-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Read at '+esc(e.source||new URL(url).hostname)+'<span aria-hidden="true"><svg class=\"arrow-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M5 19 19 5M5 5h14v14\"/></svg></span></a>':'')+'<nav class="article-navigation" aria-label="Story navigation"><button class="text-button" id="prev-story">← Previous</button><button class="text-button" id="next-story">Next story →</button></nav>';
$('.back-button').onclick=closeStory;$('#prev-story').onclick=()=>step(-1);$('#next-story').onclick=()=>step(1);$('#story-view').scrollTop=0;
$('#selected-location').hidden=false;$('#selected-location').innerHTML='<strong>'+esc(e.place)+'</strong><span>'+Math.abs(e.lat).toFixed(2)+'° '+(e.lat>=0?'N':'S')+' &nbsp; / &nbsp; '+Math.abs(e.lon).toFixed(2)+'° '+(e.lon>=0?'E':'W')+'</span>';
$('#map-subtitle').textContent=e.country+' · '+tones[e.tone];flyTo(e);if(focus){$('.back-button').focus({preventScroll:true});if(root.clientWidth<701)$('#story-view').scrollIntoView({behavior:'instant',block:'start'});}}
function closeStory(){active=null;resumeAt=performance.now()+2500;$('#edition-view').hidden=false;$('#story-view').hidden=true;$('#selected-location').hidden=true;$('#map-subtitle').textContent='Explore the world at your pace.';renderList();$('#search').focus({preventScroll:true});}
function step(n){const list=filtered(),pool=list.some(e=>e.id===active?.id)?list:events;openStory(pool[(pool.findIndex(e=>e.id===active?.id)+n+pool.length)%pool.length].id);}
$$('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderList();});
$('#search').oninput=e=>{query=e.target.value.trim().toLowerCase();renderList();};$('#random-button').onclick=()=>{const list=filtered();if(!list.length)return;const unread=list.filter(e=>!seen.has(e.id));const pool=unread.length?unread:list;openStory(pool[Math.floor(Math.random()*pool.length)].id);};
$('#about-button').onclick=()=>$('#about-dialog').showModal();$('#close-about').onclick=()=>$('#about-dialog').close();$('#about-dialog').onclick=e=>{if(e.target===$('#about-dialog')){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.target.close();}};
root.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(e.key==='Escape'&&active)closeStory();if(e.key==='/'&&!$('#edition-view').hidden){e.preventDefault();$('#search').focus();}if(active&&e.key==='ArrowRight')step(1);if(active&&e.key==='ArrowLeft')step(-1);});
const svg=$('#world-map'),stage=$('#map-stage'),pins=$('#map-pins');
function makeSvg(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;}
// Textured, lit sphere; the vector atlas remains the fallback and flat-map view.
let earthRenderer=null;
function drawEarth(){
  if(!earthRenderer)return;
  const {gl,program,uniforms,canvas}=earthRenderer;
  canvas.hidden=view!=='globe';svg.classList.toggle('textured-earth',view==='globe');
  if(view!=='globe')return;
  const ratio=Math.min(devicePixelRatio||1,1.5),w=stage.clientWidth,h=stage.clientHeight;
  if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
  gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);
  gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
  gl.uniform2f(uniforms.center,projection.translate()[0]*ratio,projection.translate()[1]*ratio);
  gl.uniform1f(uniforms.radius,projection.scale()*ratio);
  gl.uniform2f(uniforms.orientation,-rotation[0]*Math.PI/180,-rotation[1]*Math.PI/180);
  gl.drawArrays(gl.TRIANGLES,0,6);
}
async function initEarth(){
  const canvas=$('#earth-surface'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl)return;
  const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment=`precision mediump float;
  uniform vec2 resolution,center,orientation;uniform float radius;uniform sampler2D earth;
  void main(){
    vec2 p=(vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y)-center)/radius;p.y=-p.y;
    float rr=dot(p,p);if(rr>1.055){gl_FragColor=vec4(0.);return;}
    if(rr>1.){float a=(1.-smoothstep(1.,1.055,rr))*.18;gl_FragColor=vec4(.48,.7,.78,a);return;}
    vec3 n=vec3(p,sqrt(1.-rr));float lon=orientation.x,lat=orientation.y;
    vec3 c=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));
    vec3 east=vec3(-sin(lon),0.,cos(lon));vec3 north=vec3(-sin(lat)*cos(lon),cos(lat),-sin(lat)*sin(lon));
    vec3 world=east*n.x+north*n.y+c*n.z;
    vec2 uv=vec2(.5+atan(world.z,world.x)/6.2831853,.5-asin(clamp(world.y,-1.,1.))/3.14159265);
    vec3 color=texture2D(earth,uv).rgb;
    float light=max(dot(n,normalize(vec3(-.6,.5,1.))),0.);
    color*=.25+.82*light;
    float rim=pow(1.-n.z,3.5);color=mix(color,vec3(.3,.55,.66),rim*.6);
    float spec=pow(max(dot(reflect(-normalize(vec3(-.6,.5,1.)),n),vec3(0.,0.,1.)),0.),38.);
    color+=vec3(.85,.9,.82)*spec*.12;
    gl_FragColor=vec4(color,1.);
  }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  try{
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Earth shader link failed');gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    const image=new Image();image.src='assets/earth.jpg';await image.decode();
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const uniforms={};['resolution','center','radius','orientation'].forEach(k=>uniforms[k]=gl.getUniformLocation(program,k));earthRenderer={gl,program,uniforms,canvas};draw();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();earthRenderer=null;canvas.hidden=true;svg.classList.remove('textured-earth');});
  }catch(error){canvas.hidden=true;}
}
const sphere=makeSvg('path',{fill:'#1c3830',stroke:'#79917d','stroke-width':'.7'}),grid=makeSvg('path',{fill:'none',stroke:'#76927a','stroke-opacity':'.19','stroke-width':'.6'}),land=makeSvg('g',{}),equator=makeSvg('path',{fill:'none',stroke:'#a9b799','stroke-opacity':'.25','stroke-width':'.7','stroke-dasharray':'3 5'});svg.append(sphere,grid,land,equator);
const pinNodes=new Map();events.forEach(e=>{const b=document.createElement('button');b.className='map-pin';b.dataset.tone=e.tone;b.style.setProperty('--pin-color',colors[e.tone]);b.setAttribute('aria-label',e.title+' — '+e.place);b.setAttribute('aria-pressed','false');b.innerHTML='<span class="pin-light" aria-hidden="true"><span class="pin-beam"></span><span class="pin-bloom"></span></span><span class="pin-tip">'+esc(e.place)+' · '+esc(tones[e.tone])+'</span>';b.onclick=ev=>{ev.stopPropagation();openStory(e.id);};pins.appendChild(b);pinNodes.set(e.id,b);});
const graticule=d3.geoGraticule10(),equatorShape={type:'LineString',coordinates:d3.range(-180,181,2).map(l=>[l,0])};
function draw(){if(!world)return;const w=stage.clientWidth,h=stage.clientHeight;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);const size=Math.min(w*(root.clientWidth<=700?.39:.33),h*.34)*zoom;projection=view==='globe'?d3.geoOrthographic().rotate(rotation).translate([w/2,h*.53]).scale(size).clipAngle(90):d3.geoNaturalEarth1().fitExtent([[25,100],[w-25,h-85]],world);const path=d3.geoPath(projection);sphere.setAttribute('d',path({type:'Sphere'}));grid.setAttribute('d',path(graticule));equator.setAttribute('d',path(equatorShape));[...land.children].forEach((p,i)=>p.setAttribute('d',path(world.features[i])||''));drawPins();positionPreview();drawEarth();}
function drawPins(){if(!projection)return;const visible=new Set(filtered().map(e=>e.id));events.forEach(e=>{const b=pinNodes.get(e.id),point=projection([e.lon,e.lat]),front=view==='map'||d3.geoDistance([e.lon,e.lat],[-rotation[0],-rotation[1]])<Math.PI/2;const on=(visible.has(e.id)||e.id===active?.id)&&front;b.hidden=!on;if(on){b.style.left=point[0]+'px';b.style.top=point[1]+'px';b.querySelector('.pin-light').style.transform='none';}b.setAttribute('aria-pressed',String(e.id===active?.id));});}
function flyTo(e){if(view==='map'){draw();return;}cancelAnimationFrame(animation);const from=[...rotation],target=[-e.lon,-e.lat,0];while(target[0]-from[0]>180)target[0]-=360;while(target[0]-from[0]<-180)target[0]+=360;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const start=performance.now();function frame(now){const t=reduced?1:Math.min(1,(now-start)/650),ease=1-Math.pow(1-t,3);rotation=from.map((v,i)=>v+(target[i]-v)*ease);draw();if(t<1)animation=requestAnimationFrame(frame);}animation=requestAnimationFrame(frame);}
$$('[data-view]').forEach(b=>b.onclick=()=>{hidePreview();view=b.dataset.view;root.classList.toggle('world-map-mode',view==='map');resumeAt=performance.now()+1500;cancelAnimationFrame(animation);$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#map-instruction').textContent=view==='globe'?'Drag to rotate · Scroll to zoom':'Full world · Static view · Select a location';$('#zoom-in').disabled=view==='map';$('#zoom-out').disabled=view==='map';draw();});
$('#zoom-in').onclick=()=>{resumeAt=performance.now()+2500;zoom=Math.min(1.7,zoom+.15);draw();};$('#zoom-out').onclick=()=>{resumeAt=performance.now()+2500;zoom=Math.max(.7,zoom-.15);draw();};$('#reset-map').onclick=()=>{cancelAnimationFrame(animation);hidePreview();resumeAt=performance.now()+2000;rotation=[-16,-15,0];zoom=1;draw();};
let drag=null;stage.addEventListener('pointerdown',e=>{if(view!=='globe'||e.target.closest('button')||drag)return;hidePreview();cancelAnimationFrame(animation);drag={id:e.pointerId,x:e.clientX,y:e.clientY,r:[...rotation]};stage.setPointerCapture(e.pointerId);});stage.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;rotation=[drag.r[0]+(e.clientX-drag.x)*.28,Math.max(-80,Math.min(80,drag.r[1]-(e.clientY-drag.y)*.28)),0];draw();});const end=e=>{if(drag?.id===e.pointerId){drag=null;resumeAt=performance.now()+3000;}};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('wheel',e=>{if(view!=='globe'||root.clientWidth<701)return;e.preventDefault();resumeAt=performance.now()+2500;zoom=Math.max(.7,Math.min(1.7,zoom-e.deltaY*.001));draw();},{passive:false});
renderList();progress();new ResizeObserver(draw).observe(stage);
try{const r=await fetch('data/world.json');if(!r.ok)throw Error();world=await r.json();world.features=world.features.filter(f=>f.id!=='010');world.features.forEach(()=>land.appendChild(makeSvg('path',{fill:'#355349',stroke:'#8fa88d','stroke-width':'.5','stroke-opacity':'.6'})));$('#map-loading').hidden=true;draw();}catch(e){$('#map-loading').textContent='The map could not load. You can still read every story on the left.';}

/* A single timestamp-driven loop owns ambient motion. Reading and direct
   manipulation always take priority. Previews never count as read stories. */
function hidePreview(){
  if(preview) pinNodes.get(preview.id)?.classList.remove('is-preview');
  preview=null;previewHover=false;nextPreviewAt=orbitTime+4500;
  $('#globe-preview').hidden=true;
}
function showPreview(event){
  preview=event;previewRemaining=2200;previewHistory.set(event.id,orbitTime);
  $('#preview-place').textContent=event.place+' · '+tones[event.tone];
  $('#preview-title').textContent=event.title;
  $('#globe-preview').hidden=false;
  positionPreview();
  pinNodes.get(event.id)?.classList.add('is-preview');
}
function positionPreview(){
  const card=$('#globe-preview');
  if(!preview||!projection)return;
  if(root.clientWidth<=700){card.style.left='';card.style.top='';card.style.bottom='';card.style.transform='';return;}
  if(previewHover||card.contains(document.activeElement))return;
  const [x,y]=projection([preview.lon,preview.lat]),w=card.offsetWidth,h=card.offsetHeight;
  card.style.left=Math.max(20,Math.min(stage.clientWidth-w-75,x-w/2))+'px';
  card.style.top=Math.max(150,Math.min(stage.clientHeight-h-65,y+25))+'px';
  card.style.bottom='auto';card.style.transform='none';
}
function motionState(label){
  const toggle=$('#orbit-toggle');
  toggle.textContent=orbitEnabled?'Pause orbit':'Start orbit';
  toggle.setAttribute('aria-pressed',String(orbitEnabled));
  toggle.disabled=motionPreference.matches||view==='map';
  const message=motionPreference.matches?'Reduced motion':view==='map'?'Static world map':label;
  if($('#orbit-state').textContent!==message)$('#orbit-state').textContent=message;
}
$('#orbit-speed').oninput=e=>{orbitSpeed=Number(e.target.value);$('#speed-value').textContent=orbitSpeed.toFixed(1)+'° / s';};
$('#orbit-toggle').onclick=()=>{orbitEnabled=!orbitEnabled;hidePreview();resumeAt=performance.now()+1000;motionState(orbitEnabled?'Slow exploration':'Orbit paused');};
$('#dismiss-preview').onclick=()=>{hidePreview();};
$('#open-preview').onclick=()=>{if(preview)openStory(preview.id);};
$('#globe-preview').addEventListener('pointerenter',()=>{previewHover=true;});
$('#globe-preview').addEventListener('pointerleave',()=>{previewHover=false;});
motionPreference.addEventListener('change',()=>{orbitEnabled=!motionPreference.matches;hidePreview();pins.getAnimations({subtree:true}).forEach(a=>a.cancel());motionState(orbitEnabled?'Slow exploration':'Reduced motion');});
new IntersectionObserver(entries=>{mapVisible=entries[0].isIntersecting;},{threshold:.1}).observe(stage);
let ambientFrame;
function orbitFrame(now){
  if(!root.isConnected){cancelAnimationFrame(ambientFrame);return;}
  ambientFrame=requestAnimationFrame(orbitFrame);
  if(now-lastOrbitFrame<33)return; // Bound geographic path work to 30fps.
  const dt=Math.min(100,now-(lastOrbitFrame||now));lastOrbitFrame=now;
  const held=previewHover||$('#globe-preview').contains(document.activeElement);
  const pinHeld=pins.contains(document.activeElement)||!!pins.querySelector('.map-pin:hover');
  const paused=!world||!orbitEnabled||motionPreference.matches||document.hidden||!mapVisible||view!=='globe'||active||drag||now<resumeAt||$('#about-dialog').open||document.activeElement===$('#search')||pinHeld;
  motionState(active?'Reading a story':drag?'Exploring by hand':!orbitEnabled?'Orbit paused':preview?'In focus':paused?'Exploration paused':'Slow exploration');
  if(paused)return;
  orbitTime+=dt;
  // Geographic motion is independent of preview visibility and pointer hover.
  rotation[0]=(rotation[0]+dt*orbitSpeed/1000)%360;
  draw();
  if(preview){
    // Holding a readable preview preserves its text, never stops the earth.
    if(!held)previewRemaining-=dt;
    if(previewRemaining<=0)hidePreview();
  }else if(orbitTime>=nextPreviewAt){
    const candidate=filtered().map(e=>({e,d:d3.geoDistance([e.lon,e.lat],[-rotation[0],-rotation[1]])}))
      .filter(({e,d})=>d<.62&&orbitTime-(previewHistory.get(e.id)??-Infinity)>90000)
      .sort((a,b)=>a.d-b.d)[0];
    if(candidate)showPreview(candidate.e);
  }
  if(orbitTime>=nextTwinkleAt){
    nextTwinkleAt=orbitTime+1800+Math.random()*2400;
    const available=[...pinNodes.values()].filter(p=>!p.hidden);
    const pin=available[Math.floor(Math.random()*available.length)];
    if(pin){
      const duration=1900+Math.random()*900;
      pin.querySelector('.pin-beam').animate([
        {opacity:0,transform:'scaleY(.3) scaleX(.7)'},
        {opacity:.7,transform:'scaleY(1) scaleX(1)',offset:.32},
        {opacity:.28,transform:'scaleY(1.08) scaleX(.85)',offset:.65},
        {opacity:0,transform:'scaleY(.9) scaleX(.6)'}
      ],{duration,easing:'cubic-bezier(.23,1,.32,1)'});
      pin.querySelector('.pin-bloom').animate([
        {opacity:0,transform:'scale(.65)'},
        {opacity:.6,transform:'scale(1)',offset:.3},
        {opacity:0,transform:'scale(1.5)'}
      ],{duration,easing:'ease-out'});
    }
  }
}
motionState(orbitEnabled?'Slow exploration':'Reduced motion');
ambientFrame=requestAnimationFrame(orbitFrame);
initEarth();
})();
