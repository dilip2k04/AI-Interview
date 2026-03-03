import { useState, useEffect, useRef } from "react";

function Counter({ target, suffix = "", duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      ob.disconnect();
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setVal(Math.floor(p * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.3 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

function FCard({ icon, title, desc, accent = "#00e5ff", delay = 0 }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); ob.disconnect(); }}, { threshold: 0.15 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      padding:"28px 24px", background:"rgba(13,18,35,0.9)",
      border:`1px solid ${vis ? accent+"28" : "rgba(255,255,255,0.04)"}`,
      borderRadius:16, transition:`all 0.55s ease ${delay}ms`,
      opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(22px)",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${accent},transparent)` }} />
      <div style={{ fontSize:30, marginBottom:14 }}>{icon}</div>
      <h3 style={{ fontSize:16, fontWeight:800, color:"#f0f4ff", marginBottom:9, fontFamily:"'Syne',sans-serif" }}>{title}</h3>
      <p style={{ fontSize:13, color:"#5a6a8a", lineHeight:1.75, fontFamily:"'Space Mono',monospace" }}>{desc}</p>
    </div>
  );
}

function SCard({ num, title, desc, delay = 0 }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); ob.disconnect(); }}, { threshold: 0.15 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ display:"flex", gap:18, alignItems:"flex-start", opacity:vis?1:0, transform:vis?"translateX(0)":"translateX(-18px)", transition:`all 0.48s ease ${delay}ms` }}>
      <div style={{ width:42, height:42, borderRadius:"50%", flexShrink:0, background:"rgba(0,229,255,0.07)", border:"1px solid rgba(0,229,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:13, color:"#00e5ff" }}>{String(num).padStart(2,"0")}</div>
      <div>
        <div style={{ fontWeight:700, fontSize:15, color:"#f0f4ff", marginBottom:5, fontFamily:"'Syne',sans-serif" }}>{title}</div>
        <div style={{ fontSize:12, color:"#5a6a8a", lineHeight:1.65, fontFamily:"'Space Mono',monospace" }}>{desc}</div>
      </div>
    </div>
  );
}

export default function LandingPage({ navigate }) {
  const [hVis, setHVis] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setTimeout(() => setHVis(true), 80);
    const onS = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onS, { passive:true });
    return () => window.removeEventListener("scroll", onS);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

  return (
    <div style={{ background:"#050810", minHeight:"100vh", fontFamily:"'Syne',sans-serif", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#050810}
        ::-webkit-scrollbar-thumb{background:rgba(0,229,255,0.2);border-radius:99px}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes gridP{0%,100%{opacity:.03}50%{opacity:.06}}
        @keyframes scan{from{transform:translateX(-100%)}to{transform:translateX(200%)}}
        @keyframes glowP{0%,100%{box-shadow:0 0 32px rgba(0,229,255,.12)}50%{box-shadow:0 0 64px rgba(0,229,255,.3)}}
        .ctaBtn{background:#00e5ff;color:#050810;border:none;padding:15px 38px;font-family:'Syne',sans-serif;font-size:15px;font-weight:800;border-radius:8px;cursor:pointer;letter-spacing:.04em;transition:all .22s;position:relative;overflow:hidden}
        .ctaBtn::after{content:'';position:absolute;top:0;left:-200%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:scan 2.4s linear infinite}
        .ctaBtn:hover{background:#33eaff;transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,229,255,.38)}
        .ctaOut{background:transparent;color:#00e5ff;border:1px solid rgba(0,229,255,.32);padding:13px 30px;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;border-radius:8px;cursor:pointer;transition:all .22s}
        .ctaOut:hover{background:rgba(0,229,255,.07);border-color:#00e5ff;transform:translateY(-2px)}
        .nLink{color:#5a6a8a;font-family:'Space Mono',monospace;font-size:11px;text-decoration:none;cursor:pointer;transition:color .18s;background:none;border:none;letter-spacing:.05em;text-transform:uppercase}
        .nLink:hover{color:#f0f4ff}
      `}</style>

      {/* BG grid */}
      <div style={{ position:"fixed", inset:0, zIndex:0, backgroundImage:"linear-gradient(rgba(0,229,255,.032) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.032) 1px,transparent 1px)", backgroundSize:"56px 56px", animation:"gridP 4s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"fixed", top:-200, left:-150, width:700, height:700, borderRadius:"50%", filter:"blur(120px)", background:"radial-gradient(circle,rgba(0,229,255,.065) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:-200, right:-100, width:500, height:500, borderRadius:"50%", filter:"blur(100px)", background:"radial-gradient(circle,rgba(181,123,255,.065) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }} />

      {/* NAV */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 48px", height:66, background:scrollY>40?"rgba(5,8,16,.94)":"transparent", backdropFilter:scrollY>40?"blur(20px)":"none", borderBottom:scrollY>40?"1px solid rgba(0,229,255,.07)":"1px solid transparent", transition:"all .28s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#00e5ff", boxShadow:"0 0 9px #00e5ff" }} />
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:12, fontWeight:700, color:"#00e5ff", letterSpacing:".1em" }}>AI INTERVIEWER</span>
        </div>
        <div style={{ display:"flex", gap:34 }}>
          <button className="nLink" onClick={() => scrollTo("features")}>Features</button>
          <button className="nLink" onClick={() => scrollTo("how")}>How It Works</button>
          <button className="nLink" onClick={() => scrollTo("roles")}>For Teams</button>
        </div>
        <button className="ctaOut" style={{ padding:"8px 18px", fontSize:12 }} onClick={() => navigate("login")}>Login</button>
      </nav>

      {/* HERO */}
      <section style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"120px 32px 80px" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 17px", borderRadius:99, background:"rgba(0,229,255,.055)", border:"1px solid rgba(0,229,255,.18)", marginBottom:34, opacity:hVis?1:0, transform:hVis?"translateY(0)":"translateY(-10px)", transition:"all .55s ease" }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#00e5ff", boxShadow:"0 0 5px #00e5ff" }} />
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#00e5ff", letterSpacing:".12em", textTransform:"uppercase" }}>Enterprise Hiring Intelligence</span>
        </div>

        <h1 style={{ fontSize:"clamp(40px, 7vw, 86px)", fontWeight:900, lineHeight:1.0, letterSpacing:"-0.04em", color:"#f0f4ff", maxWidth:900, margin:"0 auto 22px", opacity:hVis?1:0, transform:hVis?"translateY(0)":"translateY(18px)", transition:"all .65s ease .1s" }}>
          Hire Smarter.<br />
          <span style={{ color:"#00e5ff" }}>Evaluate Faster.</span>
        </h1>

        <p style={{ fontSize:"clamp(14px, 1.8vw, 18px)", color:"#5a6a8a", lineHeight:1.78, maxWidth:600, margin:"0 auto 44px", fontFamily:"'Space Mono',monospace", opacity:hVis?1:0, transform:hVis?"translateY(0)":"translateY(14px)", transition:"all .65s ease .2s" }}>
          AI-powered interview platform built for organisations — create projects, assign assessments to multiple candidates at once, and get instant Gemini-scored results with live proctoring.
        </p>

        <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", opacity:hVis?1:0, transition:"all .65s ease .32s" }}>
          <button className="ctaBtn" onClick={() => navigate("login")}>Get Started →</button>
          <button className="ctaOut" onClick={() => scrollTo("how")}>See How It Works</button>
        </div>

        <div style={{ marginTop:64, display:"flex", gap:36, flexWrap:"wrap", justifyContent:"center", opacity:hVis?1:0, transition:"all .65s ease .48s" }}>
          {[["🤖","AI-evaluated results"],["📷","Real-time proctoring"],["👥","Bulk assignment"],["📊","Instant reports"]].map(([ic,lb]) => (
            <div key={lb} style={{ display:"flex", alignItems:"center", gap:6, color:"#5a6a8a", fontFamily:"'Space Mono',monospace", fontSize:11 }}>
              <span style={{ fontSize:14 }}>{ic}</span>{lb}
            </div>
          ))}
        </div>

        {/* Mockup */}
        <div style={{ marginTop:72, position:"relative", width:"100%", maxWidth:840, animation:"floatY 5s ease-in-out infinite", opacity:hVis?1:0, transition:"opacity .7s ease .6s" }}>
          <div style={{ background:"rgba(9,13,26,.95)", border:"1px solid rgba(0,229,255,.1)", borderRadius:14, boxShadow:"0 40px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(0,229,255,.05)", overflow:"hidden" }}>
            <div style={{ padding:"11px 18px", background:"rgba(13,18,35,.9)", borderBottom:"1px solid rgba(0,229,255,.07)", display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ display:"flex", gap:5 }}>
                {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width:9, height:9, borderRadius:"50%", background:c, opacity:.65 }} />)}
              </div>
              <div style={{ flex:1, background:"rgba(255,255,255,.03)", borderRadius:5, padding:"3px 10px", fontSize:10, fontFamily:"'Space Mono',monospace", color:"#5a6a8a" }}>
                app.aiinterviewer.com/projects
              </div>
            </div>
            <div style={{ padding:22, background:"#050810" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <div style={{ height:7, background:"rgba(0,229,255,.13)", borderRadius:4, width:150, marginBottom:5 }} />
                  <div style={{ height:4, background:"rgba(255,255,255,.04)", borderRadius:4, width:100 }} />
                </div>
                <div style={{ height:30, width:130, background:"rgba(0,229,255,.13)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ height:4, background:"#00e5ff", borderRadius:4, width:70 }} />
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                {[["#00e5ff","Q3 Engineering",12,74],["#00ffb2","Frontend Round 2",8,41],["#b57bff","Campus Drive",24,19]].map(([c,lb,n,pct]) => (
                  <div key={lb} style={{ padding:14, background:"rgba(13,18,35,.9)", border:`1px solid ${c}18`, borderRadius:10, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${c},transparent)` }} />
                    <div style={{ height:5, background:`${c}18`, borderRadius:4, width:"68%", marginBottom:7 }} />
                    <div style={{ height:3, background:"rgba(255,255,255,.03)", borderRadius:4, width:"45%", marginBottom:12 }} />
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:9, fontFamily:"'Space Mono',monospace", color:"#5a6a8a" }}>
                      <span>Progress</span><span style={{ color:c }}>{n} candidates</span>
                    </div>
                    <div style={{ height:3, background:"rgba(255,255,255,.04)", borderRadius:99 }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${c}55,${c})`, borderRadius:99, boxShadow:`0 0 5px ${c}` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ position:"absolute", bottom:-36, left:"50%", transform:"translateX(-50%)", width:"55%", height:50, borderRadius:"50%", filter:"blur(28px)", background:"rgba(0,229,255,.1)" }} />
        </div>
      </section>

      {/* STATS */}
      <section style={{ position:"relative", zIndex:1, padding:"72px 32px", borderTop:"1px solid rgba(0,229,255,.05)" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:0 }}>
          {[[10,"x","Faster screening"],[100,"%","AI-evaluated"],[3," mode","MCQ · Virtual · Proctored"]].map(([n,s,lb]) => (
            <div key={lb} style={{ padding:"32px 24px", textAlign:"center", borderRight:"1px solid rgba(0,229,255,.05)" }}>
              <div style={{ fontSize:42, fontWeight:900, color:"#00e5ff", marginBottom:6, letterSpacing:"-0.03em" }}><Counter target={n} suffix={s} /></div>
              <div style={{ fontSize:11, color:"#5a6a8a", fontFamily:"'Space Mono',monospace", textTransform:"uppercase", letterSpacing:".08em" }}>{lb}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ position:"relative", zIndex:1, padding:"96px 32px" }}>
        <div style={{ maxWidth:1080, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#00e5ff", letterSpacing:".15em", textTransform:"uppercase", marginBottom:14 }}>Platform Capabilities</div>
            <h2 style={{ fontSize:"clamp(26px, 4.5vw, 46px)", fontWeight:900, color:"#f0f4ff", letterSpacing:"-0.03em" }}>Everything your HR team needs</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:18 }}>
            <FCard delay={0}   icon="🤖" accent="#00e5ff" title="Gemini AI Evaluation"  desc="Every response instantly scored — no human bias, no waiting. MCQ auto-graded, virtual responses evaluated on depth and technical accuracy." />
            <FCard delay={70}  icon="📂" accent="#00ffb2" title="Project-Based Hiring"  desc="Organise interviews into projects per hiring round or department. One question bank, dozens of candidates — assigned in seconds." />
            <FCard delay={140} icon="👥" accent="#b57bff" title="Bulk Assignment"        desc="Select multiple candidates at once. Gemini generates one shared question set and creates individual sessions for every candidate." />
            <FCard delay={210} icon="👁️" accent="#ffb830" title="Active Proctoring"      desc="MediaPipe face detection monitors presence in real time. 5-second look-away threshold. 3 tab-switch allowance before auto-termination." />
            <FCard delay={280} icon="🎙️" accent="#00e5ff" title="Voice-to-Text Input"   desc="Candidates speak their answers — real-time transcription streams into the input field. Works alongside manual typing seamlessly." />
            <FCard delay={350} icon="📊" accent="#00ffb2" title="Detailed HR Reports"    desc="Hiring recommendation, integrity score, partial-score flags, termination notes, and per-question AI feedback per candidate." />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ position:"relative", zIndex:1, padding:"96px 32px" }}>
        <div style={{ maxWidth:980, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:72, alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#00e5ff", letterSpacing:".15em", textTransform:"uppercase", marginBottom:14 }}>Workflow</div>
            <h2 style={{ fontSize:"clamp(24px, 3.8vw, 40px)", fontWeight:900, color:"#f0f4ff", letterSpacing:"-0.03em", marginBottom:44, lineHeight:1.1 }}>From job description<br />to hire decision</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
              <SCard delay={0}   num={1} title="Create a Project"        desc="Define a hiring round — name, colour, deadline. Projects group all interviews for one event or department." />
              <SCard delay={90}  num={2} title="Paste Your JD"           desc="Drop in the job description. Gemini AI extracts role, tech stack, and auto-suggests interview configuration." />
              <SCard delay={180} num={3} title="Assign to Candidates"    desc="Multi-select from your candidate roster. One click creates individual sessions for all selected, same question bank." />
              <SCard delay={270} num={4} title="Candidates Test Live"    desc="Proctored, timed, AI-evaluated. MCQ or adaptive virtual conversation. Results ready the moment they finish." />
              <SCard delay={360} num={5} title="Review & Decide"         desc="AI hiring recommendation, integrity score, partial-score flags, and per-answer feedback in one clean report." />
            </div>
          </div>
          {/* Timeline visual */}
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", left:20, top:0, bottom:0, width:1, background:"linear-gradient(to bottom,transparent,rgba(0,229,255,.28) 20%,rgba(0,229,255,.28) 80%,transparent)" }} />
            {[["📂","Project Created","Q3 Engineering Hire"],["🤖","JD Analyzed","Gemini extracted 6 skills"],["👥","12 Assigned","Shared question bank generated"],["✅","8 Completed","Avg score 72%"],["📊","Reports Ready","3 Hire recommendations"]].map(([ic,lb,sb],i) => (
              <div key={i} style={{ display:"flex", gap:18, alignItems:"center", marginBottom:24 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(9,13,26,.95)", border:"1px solid rgba(0,229,255,.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, zIndex:1, boxShadow:"0 0 12px rgba(0,229,255,.07)" }}>{ic}</div>
                <div style={{ padding:"12px 16px", flex:1, background:"rgba(9,13,26,.55)", border:"1px solid rgba(0,229,255,.07)", borderRadius:9 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#f0f4ff", marginBottom:3 }}>{lb}</div>
                  <div style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"#5a6a8a" }}>{sb}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR HR vs CANDIDATES */}
      <section id="roles" style={{ position:"relative", zIndex:1, padding:"96px 32px" }}>
        <div style={{ maxWidth:980, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <h2 style={{ fontSize:"clamp(24px, 3.8vw, 40px)", fontWeight:900, color:"#f0f4ff", letterSpacing:"-0.03em" }}>Built for both sides of hiring</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {/* HR */}
            <div style={{ padding:"38px 34px", background:"rgba(9,13,26,.9)", border:"1px solid rgba(0,229,255,.13)", borderRadius:18, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg,transparent,#00e5ff,transparent)" }} />
              <div style={{ fontSize:38, marginBottom:18 }}>🧑‍💼</div>
              <h3 style={{ fontSize:21, fontWeight:800, color:"#f0f4ff", marginBottom:18 }}>For HR Teams</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                {["Create projects per hiring event or department","Paste a JD and get AI-generated questions instantly","Assign the same interview to 50+ candidates at once","View live proctoring flags and integrity scores","Get AI hiring recommendations per candidate","Generate rejection / offer feedback emails"].map(t => (
                  <div key={t} style={{ display:"flex", gap:9, alignItems:"flex-start", fontSize:13, color:"#a8b4d0", fontFamily:"'Space Mono',monospace" }}>
                    <span style={{ color:"#00e5ff", flexShrink:0, marginTop:2 }}>→</span>{t}
                  </div>
                ))}
              </div>
              <button className="ctaBtn" style={{ marginTop:28, width:"100%" }} onClick={() => navigate("login")}>HR Login →</button>
            </div>
            {/* Candidate */}
            <div style={{ padding:"38px 34px", background:"rgba(9,13,26,.9)", border:"1px solid rgba(181,123,255,.13)", borderRadius:18, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg,transparent,#b57bff,transparent)" }} />
              <div style={{ fontSize:38, marginBottom:18 }}>👨‍💻</div>
              <h3 style={{ fontSize:21, fontWeight:800, color:"#f0f4ff", marginBottom:18 }}>For Candidates</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                {["All assigned interviews in one dashboard","MCQ mode — multiple choice, auto-graded by AI","Virtual mode — conversational AI interview","Voice-to-text: speak your answers naturally","Real-time face monitoring (video never stored)","Instant results once you submit"].map(t => (
                  <div key={t} style={{ display:"flex", gap:9, alignItems:"flex-start", fontSize:13, color:"#a8b4d0", fontFamily:"'Space Mono',monospace" }}>
                    <span style={{ color:"#b57bff", flexShrink:0, marginTop:2 }}>→</span>{t}
                  </div>
                ))}
              </div>
              <button className="ctaOut" style={{ marginTop:28, width:"100%", padding:"14px 20px" }} onClick={() => navigate("login")}>Candidate Login →</button>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ position:"relative", zIndex:1, padding:"96px 32px 112px" }}>
        <div style={{ maxWidth:720, margin:"0 auto", textAlign:"center", padding:"64px 44px", background:"rgba(9,13,26,.9)", border:"1px solid rgba(0,229,255,.1)", borderRadius:22, position:"relative", overflow:"hidden", animation:"glowP 4s ease-in-out infinite" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg,transparent,#00e5ff 50%,transparent)" }} />
          <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 0%,rgba(0,229,255,.04) 0%,transparent 60%)", pointerEvents:"none" }} />
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#00e5ff", letterSpacing:".15em", textTransform:"uppercase", marginBottom:18 }}>Ready to transform hiring?</div>
          <h2 style={{ fontSize:"clamp(26px, 4.5vw, 48px)", fontWeight:900, color:"#f0f4ff", letterSpacing:"-0.03em", marginBottom:18, lineHeight:1.1 }}>Your next great hire<br />starts here</h2>
          <p style={{ fontSize:14, color:"#5a6a8a", marginBottom:38, fontFamily:"'Space Mono',monospace", lineHeight:1.75 }}>
            Login to create your first project, define your JD, and assign AI-powered interviews to your candidate pool in minutes.
          </p>
          <button className="ctaBtn" style={{ fontSize:16, padding:"17px 52px" }} onClick={() => navigate("login")}>
            Enter Platform →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position:"relative", zIndex:1, borderTop:"1px solid rgba(0,229,255,.05)", padding:"32px 46px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#00e5ff" }} />
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:"#2e3a52" }}>AI INTERVIEWER</span>
        </div>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#2e3a52" }}>Powered by Gemini AI · Built for enterprise hiring</div>
        <button style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:"#5a6a8a", background:"none", border:"none", cursor:"pointer", transition:"color .18s" }} onClick={() => navigate("login")}
          onMouseEnter={e=>e.target.style.color="#f0f4ff"} onMouseLeave={e=>e.target.style.color="#5a6a8a"}>
          Login →
        </button>
      </footer>
    </div>
  );
}
