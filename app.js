const $=id=>document.getElementById(id);
let chart, candleSeries, ema20Series, ema50Series, markers=[];
let timer=null, lastSignal="WAIT";

function fmt(n){return Number.isFinite(n)?n.toFixed(2):"—"}
function setStatus(t){$("status").textContent=t}
function getKey(){return localStorage.getItem("td_api_key")||""}
function saveKey(){localStorage.setItem("td_api_key",$("apiKey").value.trim()); setStatus("API key saved in this browser."); loadData()}

function initChart(){
  chart=LightweightCharts.createChart($("chart"),{
    layout:{background:{type:"solid",color:"#0f1728"},textColor:"#9aa7be"},
    grid:{vertLines:{color:"#182338"},horzLines:{color:"#182338"}},
    rightPriceScale:{borderColor:"#26344e"},timeScale:{borderColor:"#26344e",timeVisible:true,secondsVisible:false},
    crosshair:{mode:1}
  });
  candleSeries=chart.addCandlestickSeries({upColor:"#36c78a",downColor:"#ef6675",borderVisible:false,wickUpColor:"#36c78a",wickDownColor:"#ef6675"});
  ema20Series=chart.addLineSeries({color:"#d8a83e",lineWidth:2});
  ema50Series=chart.addLineSeries({color:"#7aa7ff",lineWidth:2});
  window.addEventListener("resize",()=>chart.applyOptions({width:$("chart").clientWidth}));
}

function ema(values,p){
  const out=[]; const k=2/(p+1); let prev=null;
  values.forEach((v,i)=>{prev=i===p-1?values.slice(0,p).reduce((a,b)=>a+b,0)/p:(prev===null?null:v*k+prev*(1-k)); out.push(i>=p-1?prev:null)});
  return out;
}
function rsi(closes,p=14){
  if(closes.length<=p)return null;
  let gain=0,loss=0; for(let i=1;i<=p;i++){let d=closes[i]-closes[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}
  gain/=p;loss/=p; for(let i=p+1;i<closes.length;i++){let d=closes[i]-closes[i-1];gain=(gain*(p-1)+Math.max(d,0))/p;loss=(loss*(p-1)+Math.max(-d,0))/p}
  return loss===0?100:100-100/(1+gain/loss)
}
function atr(data,p=14){
  if(data.length<=p)return null; let tr=[];
  for(let i=0;i<data.length;i++){let prev=i?data[i-1].close:data[i].close;tr.push(Math.max(data[i].high-data[i].low,Math.abs(data[i].high-prev),Math.abs(data[i].low-prev)))}
  let a=tr.slice(1,p+1).reduce((x,y)=>x+y,0)/p;
  for(let i=p+1;i<tr.length;i++)a=(a*(p-1)+tr[i])/p; return a;
}
function macd(closes){
  let e12=ema(closes,12),e26=ema(closes,26), arr=closes.map((_,i)=>e12[i]!=null&&e26[i]!=null?e12[i]-e26[i]:null).filter(x=>x!=null);
  let sig=ema(arr,9); return arr.length?{m:arr[arr.length-1],s:sig[sig.length-1]}:null;
}
function analyze(data){
  const c=data.map(x=>x.close), e20=ema(c,20),e50=ema(c,50),e200=ema(c,200), R=rsi(c), A=atr(data), M=macd(c);
  const i=c.length-1, price=c[i], trend=e20[i]>e50[i]&&e50[i]>e200[i]?"BULLISH":e20[i]<e50[i]&&e50[i]<e200[i]?"BEARISH":"SIDEWAYS";
  let sig="WAIT";
  if(trend==="BULLISH" && R!=null && R<70 && (M?.m>M?.s))sig="BUY";
  if(trend==="BEARISH" && R!=null && R>30 && (M?.m<M?.s))sig="SELL";
  $("price").textContent=fmt(price); $("trend").textContent=trend; $("trend").className=trend==="BULLISH"?"buy":trend==="BEARISH"?"sell":"wait";
  $("rsi").textContent=R==null?"—":R.toFixed(1); $("ema20").textContent=fmt(e20[i]);$("ema50").textContent=fmt(e50[i]);$("ema200").textContent=fmt(e200[i]);$("atr").textContent=fmt(A);$("macd").textContent=M?`${fmt(M.m)} / ${fmt(M.s)}`:"—";
  $("signal").textContent=sig; $("signal").className=sig==="BUY"?"buy":sig==="SELL"?"sell":"wait";
  let entry=price, sl=null,tp1=null,tp2=null;
  if(A){if(sig==="BUY"){sl=price-1.5*A;tp1=price+1.5*A;tp2=price+3*A}else if(sig==="SELL"){sl=price+1.5*A;tp1=price-1.5*A;tp2=price-3*A}}
  $("entry").textContent=fmt(entry);$("sl").textContent=fmt(sl);$("tp1").textContent=fmt(tp1);$("tp2").textContent=fmt(tp2);
  const markerTime=data[i].time;
  if(sig!=="WAIT" && sig!==lastSignal){markers.push({time:markerTime,position:sig==="BUY"?"belowBar":"aboveBar",color:sig==="BUY"?"#36c78a":"#ef6675",shape:sig==="BUY"?"arrowUp":"arrowDown",text:sig});candleSeries.setMarkers(markers.slice(-30));if($("sound").checked)beep();lastSignal=sig}
  ema20Series.setData(data.map((x,j)=>({time:x.time,value:e20[j]})).filter(x=>x.value!=null));
  ema50Series.setData(data.map((x,j)=>({time:x.time,value:e50[j]})).filter(x=>x.value!=null));
}
function beep(){
  try{const C=window.AudioContext||window.webkitAudioContext,ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=740;o.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.18,ctx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.45);o.start();o.stop(ctx.currentTime+.5)}catch(e){}
}
async function loadData(){
  const key=getKey(); if(!key){setStatus("Open ⚙️ Settings and enter your Twelve Data API key.");return}
  const interval=$("interval").value;
  setStatus("Loading XAU/USD market data…");
  try{
    const url=`https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=${encodeURIComponent(interval)}&outputsize=300&apikey=${encodeURIComponent(key)}`;
    const r=await fetch(url); const j=await r.json();
    if(j.status==="error"||!j.values)throw new Error(j.message||"No data returned");
    const data=j.values.reverse().map(x=>({time:Math.floor(new Date(x.datetime.replace(" ","T")+"Z").getTime()/1000),open:+x.open,high:+x.high,low:+x.low,close:+x.close}));
    candleSeries.setData(data); chart.timeScale().fitContent(); analyze(data);
    $("lastUpdate").textContent=new Date().toLocaleTimeString();
    setStatus(`Loaded ${data.length} candles • ${interval}`);
  }catch(e){setStatus("Data error: "+e.message+" — check API key, plan, symbol support, or network.")}
}
$("settingsBtn").onclick=()=>{$("apiKey").value=getKey();$("settings").showModal()};
$("saveKey").onclick=saveKey;
$("refresh").onclick=loadData;
$("interval").onchange=loadData;
$("auto").onchange=()=>{clearInterval(timer);if($("auto").checked)timer=setInterval(loadData,60000)};
initChart();$("auto").dispatchEvent(new Event("change"));if(getKey())loadData();
