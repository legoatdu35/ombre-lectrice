// Synthèse locale dans un thread dédié. Le texte reste dans le navigateur.
let engine=null,helper=null,base=null,initPromise=null,queue=Promise.resolve();
const styles=new Map();
const report=message=>self.postMessage({type:"status",message});
async function initialize(){
 if(engine)return;
 if(initPromise)return initPromise;
 initPromise=(async()=>{
  report("Chargement de la bibliothèque IA…");
  const ort=await import("/vocal/runtime/ort.wasm.min.mjs");
  const forceSingle=new URL(self.location.href).searchParams.get("single")==="1";
  const mobile=/iPhone|iPad|Android|Mobile/i.test(self.navigator.userAgent||"");
  const cores=Number(self.navigator.hardwareConcurrency)||2;
  const threads=self.crossOriginIsolated&&!forceSingle?Math.max(1,Math.min(mobile?2:4,Math.floor(cores/2))):1;
  ort.env.wasm.numThreads=threads;
  report("Chargement IA · "+threads+" cœur(s) de calcul");
  ort.env.wasm.wasmPaths=self.location.origin+"/vocal/runtime/";
  helper=await import("/vocal/helper-v19.mjs");
  base=self.location.origin+"/vocal/models";
  report("Vérification des modèles…");
  const response=await fetch(base+"/onnx/tts.json");
  if(!response.ok)throw Error("Configuration des modèles : HTTP "+response.status);
  await response.json();
  let stage="configuration";
  const loaded=await helper.loadTextToSpeech(base+"/onnx",{executionProviders:["wasm"],graphOptimizationLevel:"all"},(name,i,total)=>{stage=name;report("Chargement modèle "+i+"/"+total+" : "+name)}).catch(e=>{throw Error("Modèle "+stage+" : "+e.message)});
  engine=loaded.textToSpeech;
  report("Moteur prêt · "+threads+" cœur(s) · calcul en arrière-plan");
 })().catch(e=>{initPromise=null;throw e});
 return initPromise;
}
self.onmessage=({data:m})=>{
 if(!m||typeof m.id!=="number")return;
 queue=queue.catch(()=>{}).then(async()=>{
  try{
   await initialize();
   if(m.type==="init"){self.postMessage({id:m.id,ok:true});return}
   if(m.type!=="generate"||!/^([MF][1-5])$/.test(m.voice))throw Error("Requête audio invalide");
   if(!styles.has(m.voice))styles.set(m.voice,await helper.loadVoiceStyle([base+"/voice_styles/"+m.voice+".json"]));
   const r=await engine.call(String(m.text).slice(0,320),"fr",styles.get(m.voice),Math.max(5,Math.min(12,+m.steps||12)),Math.max(.6,Math.min(1.8,+m.rate||.9)),.08);
   const length=Math.min(r.wav.length,Math.floor(engine.sampleRate*r.duration[0]));
   if(!Number.isFinite(length)||length<=0)throw Error("Audio vide");
   const pcm=new Float32Array(length);
   for(let i=0;i<length;i++)pcm[i]=r.wav[i];
   self.postMessage({id:m.id,ok:true,pcm:pcm.buffer,sampleRate:engine.sampleRate},[pcm.buffer]);
  }catch(e){self.postMessage({id:m.id,ok:false,error:String(e.message||e)})}
 });
};