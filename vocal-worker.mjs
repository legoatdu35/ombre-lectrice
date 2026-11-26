// Relais de ressources vocales publiques uniquement. Aucun texte de livre n'est envoyé ici.
const HF=["https://huggingface.co/Supertone/supertonic-3/resolve/main/","https://huggingface.co/supertone-oss-archive/supertonic-3/resolve/main/"];
const CDN="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
const allowedModel=/^onnx\/(?:tts\.json|unicode_indexer\.json|duration_predictor\.onnx|text_encoder\.onnx|vector_estimator\.onnx|vocoder\.onnx)$|^voice_styles\/[MF][1-5]\.json$/;
const allowedRuntime=/^(?:ort(?:\.(?:wasm|all|webgpu))?\.min\.mjs|ort-wasm-simd-threaded(?:\.jsep)?\.(?:wasm|mjs))$/;
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(!u.pathname.startsWith("/vocal/"))return env.ASSETS.fetch(request);
  if(!["GET","HEAD"].includes(request.method))return new Response("Method not allowed",{status:405});
  const p=u.pathname.slice(7);if(p==="health")return Response.json({version:"1.9",relay:true});let source,kind;
  if(p==="helper.mjs"||p==="helper-v19.mjs"){source="https://raw.githubusercontent.com/supertone-oss-archive/supertonic/main/web/helper.js";kind="application/javascript";}
  else if(p.startsWith("runtime/")&&allowedRuntime.test(p.slice(8))){source=CDN+p.slice(8);kind=p.endsWith(".wasm")?"application/wasm":"application/javascript";}
  else if(p.startsWith("models/")&&allowedModel.test(p.slice(7))){source=HF.map(base=>base+p.slice(7));kind=p.endsWith(".json")?"application/json":"application/octet-stream";}
  else return new Response("Not found",{status:404});
  try{
   let r, failures=[];for(const url of Array.isArray(source)?source:[source]){try{const candidate=await fetch(url,{method:request.method,redirect:"follow",headers:{Accept:"*/*"},cf:{cacheEverything:true,cacheTtl:86400}});if(candidate.ok){r=candidate;break}failures.push("HTTP "+candidate.status);if(candidate.body)await candidate.body.cancel()}catch(e){failures.push(String(e.message||e))}}
   if(!r)return new Response("Ressource vocale inaccessible : "+failures.join(" / "),{status:502,headers:{"Cache-Control":"no-store"}});
   const headers=new Headers({"Content-Type":kind,"Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff"});
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