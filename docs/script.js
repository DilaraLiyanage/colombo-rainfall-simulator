'use strict';
/* Scientific core: no DOM, network or third-party runtime dependencies. */
(() => {
  const exported = window.RAINFALL_EXPORT;
  if (!exported) {
    const fatal = document.getElementById('fatal');
    fatal.hidden = false;
    fatal.textContent = 'Missing model-parameters.js. Regenerate it using generate_web_parameters.py.';
    document.querySelectorAll('button, input, select').forEach(el => { el.disabled = true; });
    return;
  }
  const M = exported.model;
  const DAY = 86400000;
  const WET = M.wet_threshold_mm;
  const P95 = M.extreme_threshold_mm;
  const P99 = M.secondary_threshold_mm;
  const METRICS = ['stationary_wet_probability', 'mean_wet_mm', 'expected_daily_mm', 'mean_wet_spell_days', 'mean_dry_spell_days', 'daily_P95_exceedance', 'daily_P99_exceedance'];

  /** A 32-bit mixing bijection used to initialise distinct PRNG states. */
  function mix32(x) {
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
    return (x ^ (x >>> 15)) >>> 0;
  }

  /** xoshiro128** with an open-interval uniform; seed and stream are uint32. */
  function randomStream(seed, stream = 0) {
    let x = mix32((seed + Math.imul(stream, 0x9e3779b9)) >>> 0);
    const s = Array.from({length: 4}, () => { x = (x + 0x9e3779b9) >>> 0; return mix32(x); });
    if (s.every(v => v === 0)) s[0] = 1;
    const rotl = (v, k) => ((v << k) | (v >>> (32 - k))) >>> 0;
    return () => {
      const out = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
      const t = s[1] << 9;
      s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= t; s[3] = rotl(s[3], 11);
      return (out + 0.5) / 4294967296;
    };
  }

  /** Marsaglia–Tsang Gamma sampler; shape boosting handles alpha < 1. */
  function gamma(shape, scale, rng) {
    if (!(shape > 0 && scale > 0)) throw new Error('Gamma shape and scale must be positive.');
    if (shape < 1) return gamma(shape + 1, scale, rng) * Math.pow(rng(), 1 / shape);
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      const z = Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng());
      let v = 1 + c * z;
      if (v <= 0) continue;
      v = v * v * v;
      const u = rng();
      if (u < 1 - 0.0331 * z ** 4 || Math.log(u) < 0.5 * z * z + d * (1 - v + Math.log(v))) return scale * d * v;
    }
  }

  /** Rejection samples the conditional density exactly (no clipping). */
  function wetAmount(shape, scale, lower, rng) {
    for (let tries = 0; tries < 100000; tries++) {
      const value = gamma(shape, scale, rng);
      if (value >= lower && Number.isFinite(value)) return value;
    }
    throw new Error('Truncated Gamma sampling did not accept an amount.');
  }

  function odds(p, k) { return k * p / (1 - p + k * p); }
  function season(date) { return M.season_by_month[new Date(date).getUTCMonth() + 1]; }
  function iso(date) { return new Date(date).toISOString().slice(0, 10); }
  function parseDate(value) {
    const time = Date.parse(value + 'T00:00:00Z');
    if (!Number.isFinite(time) || iso(time) !== value) throw new Error('Choose a valid calendar date.');
    return time;
  }
  function nextState(previous, P, uniform) { return Number(uniform < P[previous][1]); }
  function isExtreme(amount, threshold) { return amount > threshold; }
  function validate(block) {
    const P = block.transition_matrix;
    const g = block.amount_distribution;
    if (!Array.isArray(P) || P.length !== 2 || P.some(row => row.length !== 2 || row.some(v => !Number.isFinite(v) || v < 0 || v > 1) || Math.abs(row[0] + row[1] - 1) > 1e-12)) throw new Error('Invalid transition matrix.');
    if (!(Number.isFinite(g.shape) && g.shape > 0 && Number.isFinite(g.scale_mm) && g.scale_mm > 0 && g.lower_mm === WET && g.parent_location_mm === 0 && g.name === 'lower_truncated_gamma')) throw new Error('Invalid Gamma parameters.');
    return block;
  }
  function perturb(block, config) {
    const p01 = odds(block.transition_matrix[0][1], config.k01);
    const p11 = odds(block.transition_matrix[1][1], config.k11);
    return validate({transition_matrix: [[1 - p01, p01], [1 - p11, p11]], amount_distribution: {...block.amount_distribution, scale_mm: block.amount_distribution.scale_mm * config.kb}});
  }
  function blocksFor(config) {
    return config.model === 'homogeneous' ? {constant: perturb(M.homogeneous, config)} : Object.fromEntries(Object.entries(M.seasonal).map(([s,b]) => [s, perturb(b, config)]));
  }
  function blockAt(blocks, date) { return blocks.constant || blocks[season(date)]; }
  function stationary(P) {
    const denominator = P[0][1] + P[1][0];
    if (denominator === 0) throw new Error('No unique stationary distribution.');
    return P[0][1] / denominator;
  }
  function emptyStats() { return {n:0, wet:0, total:0, max:0, p95:0, p99:0, longestWet:0, longestDry:0, run:0, last:null}; }
  function updateStats(s, state, amount) {
    s.n++; s.wet += state; s.total += amount; s.max = Math.max(s.max, amount);
    s.p95 += Number(isExtreme(amount,P95)); s.p99 += Number(isExtreme(amount,P99));
    s.run = state === s.last ? s.run + 1 : 1; s.last = state;
    if (state) s.longestWet = Math.max(s.longestWet,s.run); else s.longestDry = Math.max(s.longestDry,s.run);
  }
  /** A trajectory retains the preceding state and two independent stream seeds. */
  function makeTrajectory(config, stream = 0, stationaryOrigin = false) {
    const blocks = blocksFor(config);
    const occurrence = randomStream(config.seed, 3 * stream);
    const intensity = randomStream(config.seed, 3 * stream + 1);
    const initial = randomStream(config.seed, 3 * stream + 2);
    const origin = stationaryOrigin ? Number(initial() < stationary(blocks.constant.transition_matrix)) : config.origin;
    return {config, blocks, occurrence, intensity, previous: origin, stats: emptyStats(), dates: [], rainfall: [], states: [], cumulative: []};
  }
  function step(t, keepHistory = true) {
    const date = t.config.start + t.stats.n * DAY;
    const b = blockAt(t.blocks,date);
    const state = nextState(t.previous,b.transition_matrix,t.occurrence());
    const g = b.amount_distribution;
    const amount = state ? wetAmount(g.shape,g.scale_mm,g.lower_mm,t.intensity) : 0;
    t.previous = state;
    updateStats(t.stats,state,amount);
    if (keepHistory) { t.dates.push(date); t.rainfall.push(amount); t.states.push(state); t.cumulative.push(t.stats.total); }
    return {date,state,amount};
  }
  function completeSpellMeans(states) {
    const runs = [];
    let start = 0;
    for (let i = 1; i <= states.length; i++) {
      if (i === states.length || states[i] !== states[start]) { runs.push([states[start],i-start]); start = i; }
    }
    const interior = runs.slice(1,-1);
    return [1,0].map(state => { const a = interior.filter(r=>r[0]===state); return a.length ? a.reduce((sum,r)=>sum+r[1],0)/a.length : NaN; });
  }

  // Lanczos log-Gamma, followed by series / continued fraction for regularised Q.
  // Used only for analytical risk; independent of the rejection sampler.
  function logGamma(z) {
    const p = [676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-0.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
    z -= 1; let a = 0.99999999999980993;
    for (let i=0;i<p.length;i++) a += p[i]/(z+i+1);
    const t=z+7.5;
    return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(a);
  }
  function gammaQ(a,x) {
    if (x===0) return 1;
    const pref=Math.exp(a*Math.log(x)-x-logGamma(a));
    if (x<a+1) {
      let term=1/a, sum=term;
      for(let n=1;n<=10000;n++){term*=x/(a+n);sum+=term;if(Math.abs(term)<Math.abs(sum)*1e-14)return 1-pref*sum;}
    } else {
      const tiny=1e-300;
      let b=x+1-a, c=1/tiny, d=1/b, h=d;
      for(let i=1;i<=10000;i++){
        const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<tiny)d=tiny;c=b+an/c;if(Math.abs(c)<tiny)c=tiny;d=1/d;
        const delta=d*c;h*=delta;if(Math.abs(delta-1)<1e-14)return pref*h;
      }
    }
    throw new Error('Gamma survival evaluation did not converge.');
  }
  function conditional(g) {
    const q = gammaQ(g.shape,g.lower_mm/g.scale_mm);
    return {mean:g.shape*g.scale_mm*gammaQ(g.shape+1,g.lower_mm/g.scale_mm)/q, p95:gammaQ(g.shape,P95/g.scale_mm)/q, p99:gammaQ(g.shape,P99/g.scale_mm)/q};
  }
  /** Propagate probabilities chronologically, conditional on explicit origin or stationarity. */
  function analytical(config, stationaryOrigin = false) {
    const blocks=blocksFor(config);
    const moments=Object.fromEntries(Object.entries(blocks).map(([key,b])=>[key,conditional(b.amount_distribution)]));
    let wet=stationaryOrigin?stationary(blocks.constant.transition_matrix):config.origin;
    let wetSum=0, total=0, p95=0, p99=0;
    for(let i=0;i<config.days;i++){
      const key=blocks.constant?'constant':season(config.start+i*DAY);
      const P=blocks[key].transition_matrix;
      wet=(1-wet)*P[0][1]+wet*P[1][1];
      wetSum+=wet;total+=wet*moments[key].mean;p95+=wet*moments[key].p95;p99+=wet*moments[key].p99;
    }
    return {stationary_wet_probability:wetSum/config.days,mean_wet_mm:total/wetSum,expected_daily_mm:total/config.days,daily_P95_exceedance:p95/config.days,daily_P99_exceedance:p99/config.days,...(blocks.constant?{mean_wet_spell_days:1/blocks.constant.transition_matrix[1][0],mean_dry_spell_days:1/blocks.constant.transition_matrix[0][1]}:{})};
  }
  const baseline={model:'homogeneous',start:parseDate('2021-01-01'),days:365,origin:M.holdout_initial_state,seed:M.seed,k01:1,k11:1,kb:1};
  function deterministicChecks() {
    const checks=[];
    const check=(name,fn)=>{try{if(!fn())throw new Error('Assertion false');checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.message});}};
    check('All exported and perturbed matrices and Gamma parameters',()=>[M.homogeneous,...Object.values(M.seasonal)].every(b=>{validate(b);for(const k of [0.8,1,1.2])perturb(b,{k01:k,k11:k,kb:k});return true;}));
    check('Absorbing dry',()=>[0.01,0.99].every(u=>nextState(0,[[1,0],[0,1]],u)===0));
    check('Absorbing wet',()=>[0.01,0.99].every(u=>nextState(1,[[1,0],[0,1]],u)===1));
    check('Deterministic alternating',()=>{let s=0;for(let i=0;i<12;i++){s=nextState(s,[[0,1],[1,0]],0.5);if(s!==(i+1)%2)return false;}return true;});
    check('All twelve months',()=>['NEM','NEM','FIM','FIM','SWM','SWM','SWM','SWM','SWM','SIM','SIM','NEM'].every((s,i)=>season(Date.UTC(2024,i,15))===s));
    check('Leap day and year boundary',()=>iso(parseDate('2024-02-28')+DAY)==='2024-02-29'&&season(parseDate('2024-02-29'))==='NEM'&&iso(parseDate('2024-12-31')+DAY)==='2025-01-01');
    check('Seasonal boundary uses actual preceding state',()=>{const t=makeTrajectory({...baseline,model:'seasonal',start:parseDate('2024-02-29'),origin:0});t.occurrence=()=>0.5;t.blocks.NEM={...t.blocks.NEM,transition_matrix:[[0,1],[0,1]]};t.blocks.FIM={...t.blocks.FIM,transition_matrix:[[0,1],[1,0]]};return step(t).state===1&&step(t).state===0&&t.rainfall[1]===0;});
    check('Year boundary preserves state',()=>{const t=makeTrajectory({...baseline,model:'seasonal',start:parseDate('2024-12-31'),origin:0});t.occurrence=()=>0.5;t.blocks.NEM={...t.blocks.NEM,transition_matrix:[[0,1],[1,0]]};return step(t).state===1&&step(t).state===0&&iso(t.dates[1])==='2025-01-01';});
    check('Dry zero and valid wet amounts',()=>{const t=makeTrajectory({...baseline,model:'seasonal'});for(let i=0;i<1000;i++){const r=step(t,false);if(r.state?!(r.amount>=WET&&Number.isFinite(r.amount)):r.amount!==0)return false;}return true;});
    check('Strict P95/P99 threshold classification',()=>[P95,P99].every(x=>!isExtreme(x,x)&&isExtreme(x+1e-9,x)&&!isExtreme(x-1e-9,x)));
    check('Identical seed and scenario; different seed',()=>{const run=seed=>{const t=makeTrajectory({...baseline,seed});for(let i=0;i<100;i++)step(t);return JSON.stringify(t.rainfall);};return run(42)===run(42)&&run(42)!==run(43);});
    check('Odds perturbation and complement',()=>Math.abs(odds(0.5,1.2)-6/11)<1e-14&&odds(0,1.2)===0&&odds(1,0.8)===1&&Math.abs(odds(0.3,1)-0.3)<1e-14);
    check('Scale perturbation leaves shape and thresholds fixed',()=>{const b=perturb(M.homogeneous,{k01:1,k11:1,kb:1.2});return b.amount_distribution.shape===M.homogeneous.amount_distribution.shape&&b.amount_distribution.scale_mm===1.2*M.homogeneous.amount_distribution.scale_mm&&b.amount_distribution.lower_mm===WET;});
    check('Seasonal model reduces to homogeneous when blocks match',()=>{const a=makeTrajectory(baseline),b=makeTrajectory({...baseline,model:'seasonal'});for(const key of Object.keys(b.blocks))b.blocks[key]=a.blocks.constant;for(let i=0;i<400;i++){const x=step(a,false),y=step(b,false);if(x.state!==y.state||x.amount!==y.amount)return false;}return true;});
    check('Frozen Python sensitivity fixtures (odds, scale, analytical risks)',()=>exported.sensitivity_fixtures.every(f=>{
      const config={...baseline,k01:f.k01,k11:f.k11,kb:f.kb};
      const b=blocksFor(config).constant, a=analytical(config,true);
      const close=(x,y)=>Math.abs(x-y)<=1e-9+1e-8*Math.abs(y);
      return close(b.transition_matrix[0][1],f.p01)&&close(b.transition_matrix[1][1],f.p11)&&close(b.amount_distribution.scale_mm,f.beta_mm)&&Object.entries(f.targets).every(([key,value])=>close(a[key],value));
    }));
    check('Known spell lengths',()=>{const s=emptyStats();for(const x of [0,1,1,0,0,0,1,1,1,1,0])updateStats(s,x,x?1:0);const [w,d]=completeSpellMeans([0,1,1,0,0,0,1,1,1,1,0]);return s.longestWet===4&&s.longestDry===3&&w===3&&d===3;});
    return checks;
  }
  /** Replication-level MCSE; four-MCSE tolerance follows notebook verification. */
  function verifyModels() {
    const startTime=performance.now(); const deterministic=deterministicChecks(); const comparisons=[];
    for(const model of ['homogeneous','seasonal']){
      const isHom=model==='homogeneous';
      const config={...baseline,model,days:isHom?3650:1826,seed:42};
      const reps=isHom?600:1000;
      const targets=exported.python_benchmarks[model];
      const computed=analytical(config,isHom);
      const metrics=isHom?METRICS:METRICS.filter(m=>['stationary_wet_probability','expected_daily_mm','daily_P95_exceedance','daily_P99_exceedance'].includes(m));
      const all=Object.fromEntries(metrics.map(m=>[m,[]]));
      for(let r=0;r<reps;r++){
        const t=makeTrajectory(config, r+(isHom?10000:20000),isHom);
        const states=[];
        for(let i=0;i<config.days;i++){const x=step(t,false);if(isHom)states.push(x.state);}
        const s=t.stats; const spells=isHom?completeSpellMeans(states):[NaN,NaN];
        const values={stationary_wet_probability:s.wet/s.n,mean_wet_mm:s.total/s.wet,expected_daily_mm:s.total/s.n,mean_wet_spell_days:spells[0],mean_dry_spell_days:spells[1],daily_P95_exceedance:s.p95/s.n,daily_P99_exceedance:s.p99/s.n};
        for(const m of metrics)all[m].push(values[m]);
      }
      for(const m of metrics){
        const values=all[m];const mean=values.reduce((a,b)=>a+b,0)/reps;
        const mcse=Math.sqrt(values.reduce((sum,v)=>sum+(v-mean)**2,0)/(reps-1)/reps);
        const target=targets[m], error=Math.abs(mean-target), tolerance=4*mcse+1e-9;
        const analyticalError=Math.abs(computed[m]-target);
        const analyticalTolerance=1e-9+1e-8*Math.abs(target);
        comparisons.push({model,metric:m,replications:reps,days:config.days,python:target,js_analytical:computed[m],analytical_error:analyticalError,analytical_tolerance:analyticalTolerance,estimate:mean,mcse,absolute_error:error,tolerance,passed:error<=tolerance&&analyticalError<=analyticalTolerance});
      }
    }
    return {deterministic,comparisons,elapsed_seconds:(performance.now()-startTime)/1000,passed:deterministic.every(t=>t.passed)&&comparisons.every(t=>t.passed)};
  }
  window.RainfallModel=Object.freeze({randomStream,wetAmount,odds,season,iso,parseDate,makeTrajectory,step,analytical,deterministicChecks,verifyModels});

  // Allows the same scientific core to be tested in a standalone JS engine.
  if (typeof document === 'undefined') return;

  /* UI and charts: all simulation state lives in one trajectory, one animation loop. */
  const $=id=>document.getElementById(id);
  const fmt=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const pct=v=>Number.isFinite(v)?fmt(100*v,2)+'%':'—';
  const configs={baseline:[1,1,1],intense:[1,1,1.2],persistent:[1,1.2,1],mild:[1,1,0.8],combined:[1,1.2,1.2]};
  let trajectory=null, mode='ready', frameId=null, lastFrame=0, carry=0, lastPaint=0;
  function readConfig(){
    const start=parseDate($('start-date').value), days=Number($('duration').value), seed=Number($('seed').value);
    const k01=Number($('k01').value),k11=Number($('k11').value),kb=Number($('kb').value);
    if(!$('start-date').checkValidity()||!$('duration').checkValidity()||!$('seed').checkValidity()||!Number.isInteger(days)||days<1||days>3650||!Number.isInteger(seed)||seed<0||seed>4294967295||[k01,k11,kb].some(k=>!Number.isFinite(k)||k<0.8||k>1.2))throw new Error('Enter a valid start date, duration (1–3650), seed (0–4294967295) and multipliers (0.8–1.2).');
    return {model:$('model').value,start,days,seed,origin:Number($('origin').value),k01,k11,kb};
  }
  function error(message){$('fatal').hidden=!message;$('fatal').textContent=message||'';}
  function updateParameters(config,date){
    const blocks=blocksFor(config), b=blockAt(blocks,date), P=b.transition_matrix,g=b.amount_distribution;
    $('season-tag').textContent=blocks.constant?'Homogeneous':season(date);
    $('parameter-date').textContent=`Parameters for ${iso(date)} · destination date`;
    $('matrix').innerHTML=['','Next dry','Next wet','Previous dry',pct(P[0][0]),pct(P[0][1]),'Previous wet',pct(P[1][0]),pct(P[1][1])].map((v,i)=>`<span class="${[0,1,2,3,6].includes(i)?'matrix-head':''}">${v}</span>`).join('');
    $('gamma-info').textContent=`Gamma shape α = ${fmt(g.shape,4)} · scale β = ${fmt(g.scale_mm,4)} mm · lower bound ${WET} mm`;
  }
  function updateRisk(config){
    const a=analytical({...config,k01:1,k11:1,kb:1}), b=analytical(config);
    $('risk-body').innerHTML=[['P95',P95,'daily_P95_exceedance'],['P99',P99,'daily_P99_exceedance']].map(([name,threshold,key])=>`<tr><td>${name} · ${threshold} mm</td><td>${pct(a[key])}</td><td>${pct(b[key])}</td><td>${b[key]-a[key]>=0?'+':''}${fmt(100*(b[key]-a[key]),2)} pp</td></tr>`).join('');
    $('risk-summary').textContent=`Expected wet days: ${pct(b.stationary_wet_probability)} · expected daily rainfall: ${fmt(b.expected_daily_mm)} mm/day. Conditional on the selected model, calendar and origin.`;
  }
  function updateButtons(){
    $('scenario-fields').disabled=mode!=='ready';$('start').disabled=mode!=='ready';$('pause').disabled=mode!=='running';$('resume').disabled=mode!=='paused';$('instant').disabled=mode==='complete';
    $('status').textContent={ready:'Ready',running:'Running',paused:'Paused',complete:'Complete'}[mode];
  }
  function drawMetrics(s){
    const n=s.n, wet=s.wet;
    const metrics=[['Cumulative rainfall',n?fmt(s.total,1):'—','mm'],['Wet-day frequency',n?pct(wet/n):'—',`${wet} wet days`],['Mean daily rainfall',n?fmt(s.total/n):'—','mm/day'],['Mean wet-day intensity',wet?fmt(s.total/wet):'—','mm/wet day'],['Maximum daily rainfall',n?fmt(s.max):'—','mm'],['P95 events',n?fmt(s.p95,0):'—',n?pct(s.p95/n)+' of days':'strict exceedance',true],['P99 events',n?fmt(s.p99,0):'—',n?pct(s.p99/n)+' of days':'strict exceedance',true],['Longest wet / dry spell',n?`${s.longestWet} / ${s.longestDry}`:'—','days · within trajectory']];
    $('metrics').innerHTML=metrics.map(([label,value,unit,extreme])=>`<div class="metric${extreme?' extreme':''}"><div class="metric-label">${label}</div><strong>${value}</strong><small>${unit}</small></div>`).join('');
  }
  function canvasContext(id){
    const c=$(id), box=c.getBoundingClientRect(), ratio=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(1,box.width),h=Math.max(1,box.height);
    const pw=Math.round(w*ratio),ph=Math.round(h*ratio);
    if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
    const ctx=c.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);ctx.font='11px system-ui';ctx.fillStyle='#9fb3c8';return {ctx,w,h};
  }
  function drawChart(id,kind,config,t){
    const {ctx,w,h}=canvasContext(id), left=54,right=14,top=10,bottom=h-28, width=Math.max(1,w-left-right), n=t?.stats.n||0, count=config.days;
    const x=i=>left+(i+0.5)*width/count;
    // Preserve maxima and extreme-event visibility when several days occupy a pixel.
    const bucketSize=Math.max(1,Math.ceil(count/width));
    if(kind==='state'){
      ctx.fillStyle='#0b1828';ctx.fillRect(left,6,width,24);
      for(let i=0;i<n;i+=bucketSize){
        const end=Math.min(n,i+bucketSize);let max=0,wet=0;
        for(let j=i;j<end;j++){max=Math.max(max,t.rainfall[j]);wet+=t.states[j];}
        ctx.fillStyle=max>P99?'#ff8b73':max>P95?'#ffc36b':wet===end-i?'#65b9fa':wet===0?'#51647b':'#8b9eb1';
        ctx.fillRect(left+i*width/count,6,Math.max(1,(end-i)*width/count),24);
      }
      ctx.fillStyle='#9fb3c8';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('State',3,18);dateTicks(ctx,config,left,width,h-10);return;
    }
    const rain=kind==='rain';
    const max=rain?Math.max(P99*1.14,(t?.stats.max||0)*1.07):Math.max(10,(t?.stats.total||0)*1.06);
    const scale=niceMax(max), y=v=>bottom-v/scale*(bottom-top);
    ctx.textAlign='right';ctx.textBaseline='middle';
    for(let i=0;i<=4;i++){const v=i*scale/4, yy=y(v);ctx.strokeStyle='#263b51';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(w-right,yy);ctx.stroke();ctx.fillStyle='#9fb3c8';ctx.fillText(fmt(v,scale<20?1:0),left-7,yy);}
    if(rain){
      for(let i=0;i<n;i+=bucketSize){const end=Math.min(n,i+bucketSize);let v=0;for(let j=i;j<end;j++)v=Math.max(v,t.rainfall[j]);ctx.fillStyle=v>P99?'#ff8b73':v>P95?'#ffc36b':'#65b9fa';const bw=Math.max(1,(end-i)*width/count*0.86);ctx.fillRect(left+i*width/count,y(v),bw,bottom-y(v));}
      for(const [threshold,color,label] of [[P95,'#ffc36b','P95'],[P99,'#ff8b73','P99']]){ctx.strokeStyle=color;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(left,y(threshold));ctx.lineTo(w-right,y(threshold));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=color;ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText(`${label} ${threshold} mm`,w-right-3,y(threshold)-3);}
    }else if(n){
      ctx.beginPath();ctx.moveTo(left,bottom);for(let i=0;i<n;i++)ctx.lineTo(x(i),y(t.cumulative[i]));ctx.lineTo(x(n-1),bottom);ctx.closePath();ctx.fillStyle='rgba(101,185,250,.12)';ctx.fill();ctx.beginPath();ctx.moveTo(left,bottom);for(let i=0;i<n;i++)ctx.lineTo(x(i),y(t.cumulative[i]));ctx.strokeStyle='#65b9fa';ctx.lineWidth=2;ctx.stroke();
    }
    dateTicks(ctx,config,left,width,h-10);
  }
  function niceMax(value){const power=10**Math.floor(Math.log10(value));return Math.ceil(value/power*2)/2*power;}
  function dateTicks(ctx,config,left,width,y){
    ctx.fillStyle='#9fb3c8';ctx.textBaseline='middle';const ticks=Math.min(config.days-1,width<350?2:4);
    if(ticks===0){ctx.textAlign='left';ctx.fillText(iso(config.start),left,y);return;}
    for(let i=0;i<=ticks;i++){const fraction=i/ticks;ctx.textAlign=i===0?'left':i===ticks?'right':'center';ctx.fillText(iso(config.start+Math.round((config.days-1)*fraction)*DAY),left+width*fraction,y);}
  }
  function render(){
    let config;
    try{config=trajectory?.config||readConfig();error('');}catch(e){error(e.message);return;}
    const s=trajectory?.stats||emptyStats();const n=s.n;const date=config.start+Math.max(0,n-1)*DAY;
    $('current-date').textContent=n?iso(date):'—';$('current-rain').textContent=n?fmt(trajectory.rainfall[n-1])+' mm':'—';
    $('current-state').textContent=n?(s.last?'Wet':'Dry'):'Not started';
    $('progress-text').textContent=`${n.toLocaleString('en-US')} / ${config.days.toLocaleString('en-US')} days`;
    $('progress').max=config.days;$('progress').value=n;
    const coarse=config.days>Math.max(1,$('rain-chart').getBoundingClientRect().width-68);
    $('rain-caption').textContent=n?`${n} days simulated · fixed P95 ${P95} mm, P99 ${P99} mm · amber and coral mark strict exceedances.${coarse?' Dense view: maximum daily rainfall per display bin; mixed wet/dry bins in grey-blue.':''}`:'Start a simulation to populate the chart.';
    drawMetrics(s);updateParameters(config,date);
    drawChart('rain-chart','rain',config,trajectory);drawChart('state-chart','state',config,trajectory);drawChart('total-chart','total',config,trajectory);updateButtons();
  }
  function stopLoop(){if(frameId!==null)cancelAnimationFrame(frameId);frameId=null;}
  function tick(now){
    frameId=null;if(mode!=='running')return;
    const elapsed=Math.min(0.25,(now-lastFrame)/1000);lastFrame=now;
    carry+=elapsed*Number($('speed').value);
    try{
      const count=Math.min(Math.floor(carry),trajectory.config.days-trajectory.stats.n);carry-=count;
      for(let i=0;i<count;i++)step(trajectory);
      if(trajectory.stats.n===trajectory.config.days){mode='complete';render();return;}
      if(now-lastPaint>65&&count){render();lastPaint=now;}
      frameId=requestAnimationFrame(tick);
    }catch(e){mode='paused';updateButtons();error(e.message);}
  }
  function initialise(){const config=readConfig();trajectory=makeTrajectory(config);updateRisk(config);carry=0;}
  function startLoop(){stopLoop();mode='running';lastFrame=performance.now();lastPaint=0;render();frameId=requestAnimationFrame(tick);}
  function preview(){if(mode!=='ready')return;try{const config=readConfig();updateRisk(config);render();}catch(e){error(e.message);}}
  function syncSliders(){for(const id of ['k01','k11','kb'])$(id+'-value').textContent=Number($(id).value).toFixed(2)+'×';}
  $('preset').addEventListener('change',()=>{const p=configs[$('preset').value];if(p){['k01','k11','kb'].forEach((id,i)=>{$(id).value=p[i];});syncSliders();preview();}});
  for(const id of ['k01','k11','kb'])$(id).addEventListener('input',()=>{$('preset').value='custom';syncSliders();preview();});
  for(const id of ['model','start-date','duration','seed','origin'])$(id).addEventListener('change',preview);
  $('start').addEventListener('click',()=>{if(mode!=='ready')return;try{initialise();startLoop();}catch(e){error(e.message);}});
  $('pause').addEventListener('click',()=>{if(mode==='running'){stopLoop();mode='paused';render();}});
  $('resume').addEventListener('click',()=>{if(mode==='paused')startLoop();});
  $('reset').addEventListener('click',()=>{stopLoop();trajectory=null;mode='ready';carry=0;preview();updateButtons();});
  $('instant').addEventListener('click',()=>{if(mode==='complete')return;stopLoop();try{if(!trajectory)initialise();while(trajectory.stats.n<trajectory.config.days)step(trajectory);mode='complete';render();}catch(e){mode=trajectory?'paused':'ready';updateButtons();error(e.message);}});
  $('verify').addEventListener('click',()=>{
    if(mode==='running'){stopLoop();mode='paused';render();}
    $('verify').disabled=true;$('verification-status').textContent='Running independent Monte Carlo ensembles…';
    setTimeout(()=>{try{const result=verifyModels();window.lastRainfallVerification=result;const n=result.deterministic.filter(x=>x.passed).length,m=result.comparisons.filter(x=>x.passed).length;$('verification-status').textContent=`${result.passed?'PASS':'FAIL'} · ${n}/${result.deterministic.length} deterministic checks · ${m}/${result.comparisons.length} analytical/Monte Carlo comparisons · ${fmt(result.elapsed_seconds,2)} s`;
      $('verification-output').hidden=false;$('verification-output').innerHTML='<p>Absolute error must be ≤ 4 MCSE + 10⁻⁹. Independent replication units; separate JavaScript analytical targets must also match the Python exports.</p><table class="verify-table"><thead><tr><th>Model / metric</th><th>Python target</th><th>JS estimate</th><th>MCSE</th><th>Outcome</th></tr></thead><tbody>'+result.comparisons.map(r=>`<tr><td>${r.model} / ${r.metric}</td><td>${r.python.toPrecision(6)}</td><td>${r.estimate.toPrecision(6)}</td><td>${r.mcse.toPrecision(3)}</td><td class="${r.passed?'pass':'fail'}">${r.passed?'PASS':'FAIL'}</td></tr>`).join('')+'</tbody></table><p>'+result.deterministic.map(r=>`${r.passed?'PASS':'FAIL'}: ${r.name}`).join('<br>')+'</p>'; }catch(e){$('verification-status').textContent='Verification failed: '+e.message;}finally{$('verify').disabled=false;}},30);
  });
  new ResizeObserver(()=>render()).observe($('rain-chart'));
  $('cal-period').textContent=`${M.calibration_start.slice(0,4)}–${M.calibration_end.slice(0,4)} · Open-Meteo`;
  $('origin').value=String(M.holdout_initial_state);$('seed').value=String(M.seed);
  try{if(M.schema_version!==2||M.transition_season!=='destination_date'||M.initial_state_semantics!=='day_before_first_date'||M.state_order.join(',')!=='dry,wet'||!(P99>P95&&P95>=WET&&WET>0))throw new Error('Unsupported model export.');validate(M.homogeneous);Object.values(M.seasonal).forEach(validate);preview();}catch(e){error(e.message);document.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);}
})();
