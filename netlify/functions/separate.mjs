export default async (req) => {
  if (req.method !== "POST") return Response.json({error:"Use POST."},{status:405});
  const key = Netlify.env.get("ELEVENLABS_API_KEY");
  if (!key) return Response.json({error:"Add ELEVENLABS_API_KEY in Netlify site environment variables."},{status:503});
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) return Response.json({error:"Choose an audio file first."},{status:400});
    if (file.size > 25*1024*1024) return Response.json({error:"Please choose a file under 25 MB."},{status:413});
    const upstreamForm = new FormData();
    upstreamForm.append("file", file, file.name);
    upstreamForm.append("stem_variation_id", "six_stems_v1");
    upstreamForm.append("sign_with_c2pa", "false");
    const r = await fetch("https://api.elevenlabs.io/v1/music/stem-separation", {
      method:"POST", headers:{"xi-api-key":key,"Accept":"application/zip"},
      body:upstreamForm, signal:AbortSignal.timeout(55000)
    });
    if (!r.ok) return Response.json({error:`AI service returned ${r.status}. Check your API account, credits and file format.`},{status:502});
    const zip = await r.arrayBuffer();
    if (zip.byteLength > 5*1024*1024) return Response.json({error:"The result is too large for this simple server setup. A larger backend is needed for this song."},{status:413});
    return new Response(zip,{headers:{"Content-Type":"application/zip","Content-Disposition":"attachment; filename=stemlab-stems.zip","Cache-Control":"no-store"}});
  } catch(e) {
    return Response.json({error:(e?.name==="TimeoutError"||e?.name==="AbortError")?"This song took too long for the simple server setup. Try a shorter track.":"Separation failed. Check the API key and try again."},{status:500});
  }
};
