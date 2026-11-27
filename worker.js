// Cloudflare Worker: secure fal.ai queue relay for ArtForge
// Configure secrets: FAL_KEY and ARTForge_ACCESS_TOKEN
// Configure variable: FAL_VIDEO_ENDPOINT (e.g. vendor/model endpoint path)
// Never expose provider credentials in the frontend.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};
const json = (body, status=200) => new Response(JSON.stringify(body), {status,headers:corsHeaders});
export default {
 async fetch(request, env) {
  if (request.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders});
  const url=new URL(request.url);
  if (url.pathname==="/health" && request.method==="GET") return json({ok:true,configured:!!(env.FAL_KEY&&env.FAL_VIDEO_ENDPOINT&&env.ARTFORGE_ACCESS_TOKEN)});
  if (url.pathname!=="/submit" || request.method!=="POST") return json({error:"Not found"},404);
  if (!env.FAL_KEY || !env.FAL_VIDEO_ENDPOINT || !env.ARTFORGE_ACCESS_TOKEN) return json({error:"Relay not configured"},503);
  const auth=request.headers.get("Authorization")||"";
  if (auth!=="Bearer "+env.ARTFORGE_ACCESS_TOKEN) return json({error:"Unauthorized"},401);
  let data;
  try { data=await request.json(); } catch { return json({error:"Invalid JSON"},400); }
  const prompt=typeof data.prompt==="string"?data.prompt.trim():"";
  const seconds=Number(data.duration);
  const ratio=String(data.aspect_ratio||"9:16");
  if (!prompt || prompt.length>6000) return json({error:"Prompt required (maximum 6000 characters)"},400);
  if (![5,8,10].includes(seconds)) return json({error:"Duration must be 5, 8 or 10 seconds"},400);
  if (!["9:16","16:9","1:1"].includes(ratio)) return json({error:"Unsupported aspect ratio"},400);
  // Endpoint configured by the Worker owner; not accepted from client input.
  if (!/^[a-zA-Z0-9._/-]+$/.test(env.FAL_VIDEO_ENDPOINT) || env.FAL_VIDEO_ENDPOINT.includes("..")) return json({error:"Invalid endpoint configuration"},500);
  const payload={prompt,duration:seconds,aspect_ratio:ratio};
  const upstream=await fetch("https://queue.fal.run/"+env.FAL_VIDEO_ENDPOINT,{
    method:"POST",headers:{"Authorization":"Key "+env.FAL_KEY,"Content-Type":"application/json"},body:JSON.stringify(payload)
  });
  const result=await upstream.text();
  return new Response(result,{status:upstream.status,headers:corsHeaders});
 }
}
