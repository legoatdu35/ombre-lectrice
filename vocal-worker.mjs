// Relais de ressources vocales publiques uniquement. Aucun texte de livre n'est envoyé ici.
const HF=["https://huggingface.co/Supertone/supertonic-3/resolve/main/","https://huggingface.co/supertone-oss-archive/supertonic-3/resolve/main/"];
const CDN="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
const allowedModel=/^onnx\/(?:tts\.json|unicode_indexer\.json|duration_predictor\.onnx|text_encoder\.onnx|vector_estimator\.onnx|vocoder\.onnx)$|^voice_styles\/[MF][1-5]\.json$/;
const allowedRuntime=/^(?:ort(?:\.(?:wasm|all|webgpu))?\.min\.mjs|ort-wasm-simd-threaded(?:\.jsep)?\.(?:wasm|mjs))$/;
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  const installAssets={"/manifest.webmanifest":{"type":"application/manifest+json","body":"{\n  \"id\": \"/\",\n  \"name\": \"Ombre Lectrice\",\n  \"short_name\": \"Ombre\",\n  \"lang\": \"fr\",\n  \"description\": \"Bibliothèque et lecteur audio IA local\",\n  \"start_url\": \"/\",\n  \"scope\": \"/\",\n  \"display\": \"standalone\",\n  \"background_color\": \"#181427\",\n  \"theme_color\": \"#181427\",\n  \"icons\": [\n    {\n      \"src\": \"/app-icon.svg\",\n      \"sizes\": \"any\",\n      \"type\": \"image/svg+xml\",\n      \"purpose\": \"any\"\n    }\n  ]\n}"},"/app-icon.svg":{"type":"image/svg+xml","body":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><rect width=\"512\" height=\"512\" rx=\"100\" fill=\"#181427\"/><path d=\"M256 155 Q177 105 93 141V331Q177 298 256 354Q335 298 419 331V141Q335 105 256 155Z\" fill=\"#c5b5ff\"/><path d=\"M256 155V354\" stroke=\"#181427\" stroke-width=\"12\"/><g stroke=\"#c5b5ff\" stroke-width=\"11\" stroke-linecap=\"round\"><path d=\"M192 390v20M224 380v40M256 369v62M288 380v40M320 390v20\"/></g></svg>"},"/sw.js":{"type":"application/javascript","body":"// Cache de l'interface uniquement. Les livres et les passages audio restent dans IndexedDB.\nconst CACHE='ombre-shell-v31';\nconst SHELL=['/','/manifest.webmanifest','/app-icon.svg','/speech-worker.mjs'];\nconst JSZIP='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';\nself.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.all(SHELL.map(async path=>{try{const r=await fetch(path,{cache:'reload'});if(r.ok)await cache.put(path,r)}catch{}}));try{const r=await fetch(JSZIP,{mode:'cors'});if(r.ok)await cache.put(JSZIP,r)}catch{}await self.skipWaiting()})()));\nself.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('ombre-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));\nself.addEventListener('fetch',event=>{const r=event.request,u=new URL(r.url);if(r.method!=='GET')return;const nav=r.mode==='navigate'&&u.origin===self.location.origin&&(u.pathname==='/'||u.pathname==='/index.html');const asset=u.origin===self.location.origin&&SHELL.includes(u.pathname);const lib=u.href===JSZIP;if(!nav&&!asset&&!lib)return;event.respondWith((async()=>{const cache=await caches.open(CACHE),key=nav?'/':lib?JSZIP:u.pathname;try{const response=await fetch(r);if(response.ok)await cache.put(key,response.clone());return response}catch{const saved=await cache.match(key);return saved||new Response('Ressource hors connexion',{status:503})}})())});"}};
  if(Object.hasOwn(installAssets,u.pathname)&&["GET","HEAD"].includes(request.method)){const file=installAssets[u.pathname];return new Response(request.method==="HEAD"?null:file.body,{headers:{"Content-Type":file.type,"Cache-Control":"no-cache","X-Content-Type-Options":"nosniff"}})}
  if(!u.pathname.startsWith("/vocal/")){
   const r=await env.ASSETS.fetch(request);
   if(!["/","/index.html","/speech-worker.mjs"].includes(u.pathname))return r;
   const headers=new Headers(r.headers);headers.set("Cross-Origin-Opener-Policy","same-origin");headers.set("Cross-Origin-Embedder-Policy","require-corp");headers.set("Cross-Origin-Resource-Policy","same-origin");return new Response(r.body,{status:r.status,statusText:r.statusText,headers});
  }
  if(!["GET","HEAD"].includes(request.method))return new Response("Method not allowed",{status:405});
  const p=u.pathname.slice(7);if(p==="health")return Response.json({version:"1.9",relay:true});let source,kind;
  if(p==="helper.mjs"||p==="helper-v19.mjs"){source="https://raw.githubusercontent.com/supertone-oss-archive/supertonic/main/web/helper.js";kind="application/javascript";}
  else if(p.startsWith("runtime/")&&allowedRuntime.test(p.slice(8))){source=CDN+p.slice(8);kind=p.endsWith(".wasm")?"application/wasm":"application/javascript";}
  else if(p.startsWith("models/")&&allowedModel.test(p.slice(7))){source=HF.map(base=>base+p.slice(7));kind=p.endsWith(".json")?"application/json":"application/octet-stream";}
  else return new Response("Not found",{status:404});
  try{
   let r, failures=[];for(const url of Array.isArray(source)?source:[source]){try{const candidate=await fetch(url,{method:request.method,redirect:"follow",headers:{Accept:"*/*"},cf:{cacheEverything:true,cacheTtl:604800}});if(candidate.ok){r=candidate;break}failures.push("HTTP "+candidate.status);if(candidate.body)await candidate.body.cancel()}catch(e){failures.push(String(e.message||e))}}
   if(!r)return new Response("Ressource vocale inaccessible : "+failures.join(" / "),{status:502,headers:{"Cache-Control":"no-store"}});
   const headers=new Headers({"Content-Type":kind,"Cache-Control":"public, max-age=604800","X-Content-Type-Options":"nosniff","Cross-Origin-Embedder-Policy":"require-corp","Cross-Origin-Resource-Policy":"same-origin"});
   if((p==="helper.mjs"||p==="helper-v19.mjs")&&request.method==="GET"){
    // Un module Worker ne bénéficie pas de l'importmap de la page.
    const raw=await r.text();const js=raw.replace(/from\s*['"]onnxruntime-web['"]/g,'from "/vocal/runtime/ort.wasm.min.mjs"');if(/from\s*['"]onnxruntime-web['"]/.test(js)||!js.includes('/vocal/runtime/ort.wasm.min.mjs'))return new Response('Import ONNX non corrigé',{status:502,headers:{"Cache-Control":"no-store"}});headers.set("Cache-Control","no-store");
    return new Response(js,{headers});
   }
   // Flux direct : ne pas charger les modèles volumineux dans la mémoire du Worker.
   return new Response(request.method==="HEAD"?null:r.body,{status:200,headers});
  }catch(e){return new Response("Source vocale inaccessible",{status:502,headers:{"Cache-Control":"no-store"}});}
 }
};