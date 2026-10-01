/* XAUUSD Pro V3.2
   Data provider: Twelve Data REST API.
   Keep API keys out of source control. */
const $=id=>document.getElementById(id);
const state={candles:[],price:null,quote:null,ind:{},lastSignal:null,sound:false,alerts:JSON.parse(localStorage.getItem("xauAlerts")||"[]"),history:JSON.parse(localStorage.getItem("xauHistory")||"[]")};

let chart, candleSeries, ema20Series, ema50Series, ema200Series, timer=null;

function num(x){const n=Number(x);return Number.isFinite(n)?n:null}
function fmt(x,d=2){return num(x)==null?"—":num(x).toFixed(d)}
function setStatus(ok,msg){$("statusDot").parentElement.classList.toggle("online",ok);$("statusText").textContent=msg}
function apiKey(){return localStorage.getItem("xau_api_key")||""}
function symbol(){return $("symbol").value.trim()||"XAU/USD"}

function initChart(){
  chart=LightweightCharts.createChart($("chart"),{
    layout:{background:{color:"transparent"},textColor:"#8ea0b8"},
    grid:{vertLines:{color:"#172334"},horzLines:{color:"#172334"}},
    rightPriceScale:{borderColor:"#233249"},timeScale:{borderColor:"#233249",timeVisible:true,secondsVisible:false},
    crosshair:{mode:LightweightCharts.CrosshairMode.Normal}
  });
  candleSeries=chart.addCandlestickSeries({upColor:"#27d17f",downColor:"#ff5c6c",borderVisible:false,wickUpColor:"#27d17f",wickDownColor:"#ff5c6c"});
  ema20Series=chart.addLineSeries({color:"#f4c95d",lineWidth:1});
  ema50Series=chart.addLineSeries({color:"#58a6ff",lineWidth:1});
  ema200Series=chart.addLineSeries({color:"#d39cff",lineWidth:1});
  new ResizeObserver(()=>chart.resize($("chart").clientWidth,$("chart").clientHeight)).observe($("chart"));
}
function sma(values,p){let out=[];let sum=0;for(let i=0;i<values.length;i++){sum+=values[i];if(i>=p)sum-=values[i-p];out.push(i>=p-1?sum/p:null)}return out}
function ema(values,p){const out=Array(values.length).fill(null),k=2/(p+1);let prev=null;for(let i=0;i<values.length;i++){if(i===p-1){let s=0;for(let j=0;j<p;j++)s+=values[j];prev=s/p;out[i]=prev}else if(i>=p){prev=values[i]*k+prev*(1-k);out[i]=prev}}return out}
function rsi(values,p=14){let out=Array(values.length).fill(null),gain=0,loss=0;for(let i=1;i<values.length;i++){const d=values[i]-values[i-1],g=Math.max(d,0),l=Math.max(-d,0);if(i<=p){gain+=g;loss+=l;if(i===p){const rs=loss===0?100:gain/loss;out[i]=100-(100/(1+rs))}}else{gain=(gain*(p-1)+g)/p;loss=(loss*(p-1)+l)/p;const rs=loss===0?100:gain/loss;out[i]=100-(100/(1+rs))}}return out}
function atr(c,p=14){let tr=[];for(let i=0;i<c.length;i++){if(i===0)tr.push(c[i].high-c[i].low);else tr.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)))}return sma(tr,p)}
function macd(values){const e12=ema(values,12),e26=ema(values,26),line=values.map((_,i)=>e12[i]!=null&&e26[i]!=null?e12[i]-e26[i]:null);const clean=line.filter(v=>v!=null),sigClean=ema(clean,9),signal=Array(values.length).fill(null);let j=0;for(let i=0;i<values.length;i++)if(line[i]!=null){signal[i]=sigClean[j++]??null}return {line,signal,hist:line.map((v,i)=>v!=null&&signal[i]!=null?v-signal[i]:null)}}

function calcIndicators(){
  const c=state.candles, closes=c.map(x=>x.close);
  const e20=ema(closes,20),e50=ema(closes,50),e200=ema(closes,200),r=rsi(closes),a=atr(c),m=macd(closes);
  const i=closes.length-1; state.ind={e20:e20[i],e50:e50[i],e200:e200[i],rsi:r[i],atr:a[i],macd:m.line[i],macdSignal:m.signal[i],macdHist:m.hist[i]};
  const look=c.slice(Math.max(0,c.length-30)); state.ind.support=Math.min(...look.map(x=>x.low));state.ind.resistance=Math.max(...look.map(x=>x.high));
  return {e20,e50,e200};
}
function drawChart(){
  if(!state.candles.length)return;
  const series=state.candles.map(c=>({time:c.time,open:c.open,high:c.high,low:c.low,close:c.close}));
  candleSeries.setData(series);
  const {e20,e50,e200}=calcIndicators();
  ema20Series.setData(state.candles.map((c,i)=>e20[i]!=null?{time:c.time,value:e20[i]}:null).filter(Boolean));
  ema50Series.setData(state.candles.map((c,i)=>e50[i]!=null?{time:c.time,value:e50[i]}:null).filter(Boolean));
  ema200Series.setData(state.candles.map((c,i)=>e200[i]!=null?{time:c.time,value:e200[i]}:null).filter(Boolean));
  chart.timeScale().fitContent();
  renderIndicators();
}
function renderIndicators(){
  const i=state.ind, price=state.price??state.candles.at(-1)?.close;
  const bullish=i.e20&&i.e50&&price>i.e20&&i.e20>i.e50&&(i.e200?i.e50>i.e200:true);
  const bearish=i.e20&&i.e50&&price<i.e20&&i.e20<i.e50&&(i.e200?i.e50<i.e200:true);
  const trend=bullish?"BULLISH":bearish?"BEARISH":"SIDEWAYS";
  $("trend").textContent=trend;$("trend").className=bullish?"pos":bearish?"neg":"warn";
  $("trendBadge").textContent=trend;$("trendBadge").className="badge "+(bullish?"buy":bearish?"sell":"neutral");
  $("rsi").textContent=fmt(i.rsi,1);$("macd").textContent=i.macd==null?"—":`${fmt(i.macd,2)} / ${fmt(i.macdSignal,2)}`;
  $("atr").textContent=fmt(i.atr,2);$("support").textContent=fmt(i.support,2);$("resistance").textContent=fmt(i.resistance,2);
  $("ema20v").textContent=fmt(i.e20,2);$("ema50v").textContent=fmt(i.e50,2);$("ema200v").textContent=fmt(i.e200,2);
  generateSignal(trend);
}
function generateSignal(trend){
  const i=state.ind,p=state.price??state.candles.at(-1)?.close;if(!p||!i.atr)return;
  let score=50;
  if(trend==="BULLISH")score+=18;if(trend==="BEARISH")score-=18;
  if(i.rsi>55&&i.rsi<70)score+=10;if(i.rsi<45&&i.rsi>30)score-=10;
  if(i.macdHist>0)score+=10;if(i.macdHist<0)score-=10;
  if(p>i.resistance)score+=8;if(p<i.support)score-=8;
  score=Math.max(0,Math.min(100,Math.round(score)));
  let type="WAIT";if(score>=65)type="BUY";else if(score<=35)type="SELL";
  $("signalText").textContent=type==="WAIT"?"WAIT / NO CLEAR SETUP":`${type} SIGNAL`;
  $("signalBadge").textContent=type==="WAIT"?"NO SIGNAL":type;
  $("signalBadge").className="badge "+(type==="BUY"?"buy":type==="SELL"?"sell":"neutral");
  $("strength").textContent=score+"%";$("strengthBar").style.width=score+"%";
  const entry=p, sl=type==="BUY"?p-i.atr*1.5:type==="SELL"?p+i.atr*1.5:null, tp1=type==="BUY"?p+i.atr*1.5:type==="SELL"?p-i.atr*1.5:null,tp2=type==="BUY"?p+i.atr*3:type==="SELL"?p-i.atr*3:null;
  $("entry").textContent=fmt(entry);$("sl").textContent=fmt(sl);$("tp1").textContent=fmt(tp1);$("tp2").textContent=fmt(tp2);
  const key=`${type}-${state.candles.at(-1)?.time}-${fmt(p,2)}`;
  if(type!=="WAIT"&&state.lastSignal!==key){state.lastSignal=key;addHistory(type,score,p,sl,tp1,tp2);if(state.sound)beep();checkAlerts(p)}
  checkAlerts(p);
}
function parseTime(t){const d=new Date(t.replace(" ","T")+"Z");return Math.floor(d.getTime()/1000)}
async function fetchJSON(url){const r=await fetch(url);if(!r.ok)throw new Error("HTTP "+r.status);const j=await r.json();if(j.status==="error")throw new Error(j.message||"API error");return j}
async function loadMarket(){
  const key=apiKey();if(!key){setStatus(false,"API KEY REQUIRED");return}
  try{
    setStatus(false,"LOADING…");
    const q=await fetchJSON(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol())}&apikey=${encodeURIComponent(key)}`);
    state.quote=q;state.price=num(q.close??q.price);$("price").textContent=fmt(state.price,2);$("bid").textContent=fmt(q.bid??q.close,2);$("ask").textContent=fmt(q.ask??q.close,2);
    const bid=num(q.bid),ask=num(q.ask);$("spread").textContent=bid!=null&&ask!=null?fmt(ask-bid,2):"—";
    const ch=num(q.change),pct=num(q.percent_change);$("change").textContent=`${ch!=null?(ch>=0?"+":"")+fmt(ch,2):"—"} (${pct!=null?(pct>=0?"+":"")+fmt(pct,2):"—"}%)`;$("change").className="change "+(ch>=0?"pos":"neg");$("updated").textContent=new Date().toLocaleTimeString();
    const ts=await fetchJSON(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol())}&interval=${encodeURIComponent($("interval").value)}&outputsize=250&order=ASC&apikey=${encodeURIComponent(key)}`);
    state.candles=(ts.values||[]).map(x=>({time:parseTime(x.datetime),open:+x.open,high:+x.high,low:+x.low,close:+x.close,volume:+(x.volume||0)})).filter(x=>[x.open,x.high,x.low,x.close].every(Number.isFinite));
    drawChart();setStatus(true,"LIVE");checkAlerts(state.price)
  }catch(e){console.error(e);setStatus(false,"ERROR");$("signalText").textContent="DATA ERROR: "+e.message}
}
function beep(){try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=880;g.gain.value=.06;o.start();o.stop(a.currentTime+.2)}catch{}}
function save(){localStorage.setItem("xauAlerts",JSON.stringify(state.alerts));localStorage.setItem("xauHistory",JSON.stringify(state.history))}
function renderAlerts(){const el=$("alerts");el.innerHTML=state.alerts.length?state.alerts.map((a,i)=>`<div class="item"><span>${a.direction==="above"?"≥":"≤"} ${fmt(a.price)} <small>${a.hit?"• triggered":"• active"}</small></span><button onclick="removeAlert(${i})">Delete</button></div>`).join(""):"<div class='small'>No active alerts.</div>"}
window.removeAlert=i=>{state.alerts.splice(i,1);save();renderAlerts()}
function addAlert(){const p=num($("alertPrice").value);if(p==null)return;state.alerts.push({price:p,direction:$("alertDirection").value,hit:false,created:new Date().toISOString()});save();renderAlerts();$("alertPrice").value=""}
function checkAlerts(p){if(p==null)return;let changed=false;state.alerts.forEach(a=>{if(a.hit)return;const hit=a.direction==="above"?p>=a.price:p<=a.price;if(hit){a.hit=true;changed=true;if(state.sound)beep();alert(`XAU/USD price alert: ${fmt(p,2)}`)}});if(changed){save();renderAlerts()}}
function addHistory(type,strength,entry,sl,tp1,tp2){state.history.unshift({time:new Date().toLocaleString(),type,strength,entry,sl,tp1,tp2});state.history=state.history.slice(0,50);save();renderHistory()}
function renderHistory(){const h=$("history");if(!state.history.length){h.innerHTML="<div class='small'>No signals recorded yet.</div>";return}h.innerHTML=`<table><thead><tr><th>Time</th><th>Signal</th><th>Strength</th><th>Entry</th><th>SL</th><th>TP1</th><th>TP2</th></tr></thead><tbody>${state.history.map(x=>`<tr><td>${x.time}</td><td class="${x.type==="BUY"?"pos":"neg"}">${x.type}</td><td>${x.strength}%</td><td>${fmt(x.entry)}</td><td>${fmt(x.sl)}</td><td>${fmt(x.tp1)}</td><td>${fmt(x.tp2)}</td></tr>`).join("")}</tbody></table>`}
function demoNews(){const now=new Date();const items=[["HIGH","USD","CPI / Inflation — Demo item"],["HIGH","USD","Non-Farm Payrolls — Demo item"],["HIGH","USD","FOMC Rate Decision — Demo item"],["MEDIUM","USD","Fed Chair remarks — Demo item"]];$("news").innerHTML=items.map((x,i)=>`<div class="item"><span><b class="${x[0]==="HIGH"?"neg":"warn"}">${x[0]}</b> ${x[1]} • ${x[2]}<small>${new Date(now.getTime()+i*3600000).toLocaleString()}</small></span></div>`).join("")}
function calcRisk(){const bal=num($("balance").value),rp=num($("riskPct").value),entry=num($("riskEntry").value),sl=num($("riskSL").value),contract=num($("contract").value);if([bal,rp,entry,sl,contract].some(x=>x==null)||entry===sl){$("lotSize").textContent="—";return}const risk=bal*rp/100,distance=Math.abs(entry-sl),lot=risk/(distance*contract);$("lotSize").textContent=Number.isFinite(lot)?lot.toFixed(2):"—";$("riskMoney").textContent=`Risk amount: ${fmt(risk,2)} • Stop distance: ${fmt(distance,2)}`}
function saveSettings(){const k=$("apiKey").value.trim();if(k)localStorage.setItem("xau_api_key",k);else localStorage.removeItem("xau_api_key");localStorage.setItem("xau_symbol",$("symbol").value.trim()||"XAU/USD");loadMarket()}
function loadSettings(){const k=apiKey();if(k)$("apiKey").value=k;const s=localStorage.getItem("xau_symbol");if(s)$("symbol").value=s}
function setup(){initChart();loadSettings();renderAlerts();renderHistory();demoNews();$("refreshBtn").onclick=loadMarket;$("saveSettings").onclick=saveSettings;$("clearSettings").onclick=()=>{localStorage.removeItem("xau_api_key");$("apiKey").value="";setStatus(false,"API KEY REQUIRED")};$("interval").onchange=loadMarket;$("refresh").onchange=()=>{clearInterval(timer);const ms=+$("refresh").value;if(ms>0)timer=setInterval(loadMarket,ms)};$("soundBtn").onclick=()=>{state.sound=!state.sound;$("soundBtn").textContent=`🔔 Sound: ${state.sound?"ON":"OFF"}`;if(state.sound)beep()};$("addAlert").onclick=addAlert;$("calcRisk").onclick=calcRisk;$("clearHistory").onclick=()=>{state.history=[];save();renderHistory()};$("demoNews").onclick=demoNews;window.addEventListener("resize",()=>chart.resize($("chart").clientWidth,$("chart").clientHeight));const ms=+$("refresh").value;if(ms>0)timer=setInterval(loadMarket,ms);if(apiKey())loadMarket()}
document.addEventListener("DOMContentLoaded",setup);
