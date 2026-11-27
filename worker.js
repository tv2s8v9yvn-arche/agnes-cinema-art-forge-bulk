// Cloudflare Worker: secure Wan 2.7 relay for ArtForge
// Secrets: FAL_KEY, ARTForge_ACCESS_TOKEN. Variable: FAL_VIDEO_ENDPOINT.
// Recommended endpoint: fal-ai/wan/v2.7/text-to-video
const SITE_ORIGIN = "https://tv2s8v9yvn-arche.github.io";
const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin === SITE_ORIGIN ? SITE_ORIGIN : "null",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Vary": "Origin",
  "Content-Type": "application/json"
});
const json = (body,status=200,headers={}) => new Response(JSON.stringify(body),{status,headers});
const endpointOk = (s) => typeof s==="string" && /^[a-zA-Z0-9._/-]+$/.test(s) && !s.includes("..");
// Normalize provider responses to JSON so the browser can handle failures predictably.
const relayResponse = async (upstream, headers) => {
  const raw=await upstream.text();
  let data; try { data=JSON.parse(raw); } catch { data={error:upstream.ok?"Unexpected provider response":"Provider returned a non-JSON error",detail:raw.slice(0,500)}; }
  return json(data,upstream.status,headers);
};
export default {
 async fetch(request, env) {
  const origin=request.headers.get("Origin")||"";
  const headers=cors(origin);
  if (request.method==="OPTIONS") return new Response(null,{status:204,headers});
  if (origin!==SITE_ORIGIN) return json({error:"Origin not allowed"},403,headers);
  const url=new URL(request.url);
  if (url.pathname==="/health" && request.method==="GET") return json({ok:true,configured:!!(env.FAL_KEY&&env.ARTFORGE_ACCESS_TOKEN&&endpointOk(env.FAL_VIDEO_ENDPOINT))},200,headers);
  if (!env.FAL_KEY || !env.ARTFORGE_ACCESS_TOKEN || !endpointOk(env.FAL_VIDEO_ENDPOINT)) return json({error:"Relay not configured"},503,headers);
  if ((request.headers.get("Authorization")||"")!=="Bearer "+env.ARTFORGE_ACCESS_TOKEN) return json({error:"Unauthorized"},401,headers);
  const base="https://queue.fal.run/"+env.FAL_VIDEO_ENDPOINT;
  if (url.pathname==="/submit" && request.method==="POST") {
   let data; try { data=await request.json(); } catch { return json({error:"Invalid JSON"},400,headers); }
   const prompt=typeof data.prompt==="string"?data.prompt.trim():"";
   const seconds=Number(data.duration);
   const ratio=String(data.aspect_ratio||"9:16");
   const resolution=String(data.resolution||"720p");
   if (!prompt||prompt.length>5000) return json({error:"Prompt required (maximum 5000 characters)"},400,headers);
   if (![5,8,10].includes(seconds)) return json({error:"Duration must be 5, 8 or 10 seconds"},400,headers);
   if (!["9:16","16:9","1:1"].includes(ratio)) return json({error:"Unsupported aspect ratio"},400,headers);
   if (resolution!=="720p") return json({error:"Only 720p enabled for initial cost-controlled tests"},400,headers);
   try {
    const upstream=await fetch(base,{method:"POST",headers:{"Authorization":"Key "+env.FAL_KEY,"Content-Type":"application/json"},body:JSON.stringify({prompt,duration:seconds,aspect_ratio:ratio,resolution})});
    return await relayResponse(upstream,headers);
   } catch { return json({error:"Provider request failed"},502,headers); }
  }
  const id=url.searchParams.get("request_id");
  if (!id || !/^[a-f0-9-]{20,64}$/i.test(id)) return json({error:"Invalid request id"},400,headers);
  if (url.pathname==="/status" && request.method==="GET") {
   try { const upstream=await fetch(base+"/requests/"+id+"/status",{headers:{"Authorization":"Key "+env.FAL_KEY}}); return await relayResponse(upstream,headers); } catch { return json({error:"Provider status failed"},502,headers); }
  }
  if (url.pathname==="/result" && request.method==="GET") {
   try { const upstream=await fetch(base+"/requests/"+id,{headers:{"Authorization":"Key "+env.FAL_KEY}}); return await relayResponse(upstream,headers); } catch { return json({error:"Provider result failed"},502,headers); }
  }
  return json({error:"Not found"},404,headers);
 }
};
