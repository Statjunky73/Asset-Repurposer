import { useState } from "react";

const FORMATS = [
  { id: "tweet", label: "𝕏 Thread", icon: "✦", desc: "3-part tweet thread" },
  { id: "linkedin", label: "LinkedIn Post", icon: "◆", desc: "Professional story post" },
  { id: "tiktok", label: "TikTok Hook", icon: "▲", desc: "Scroll-stopping opener" },
  { id: "email", label: "Email Subject", icon: "◉", desc: "5 subject line options" },
  { id: "newsletter", label: "Newsletter Blurb", icon: "◐", desc: "Short teaser paragraph" },
];

const TONES = ["Casual", "Professional", "Bold", "Witty", "Inspiring"];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} style={{
      background: copied ? "#22c55e" : "transparent",
      border: `1px solid ${copied ? "#22c55e" : "#374151"}`,
      color: copied ? "#fff" : "#9ca3af",
      padding: "4px 12px",
      borderRadius: "6px",
      fontSize: "11px",
      cursor: "pointer",
      transition: "all 0.2s",
      fontFamily: "inherit",
      letterSpacing: "0.05em",
    }}>
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

export default function RepurposeAI() {
  const [input, setInput] = useState("");
  const [selectedFormats, setSelectedFormats] = useState(["tweet", "linkedin"]);
  const [tone, setTone] = useState("Casual");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleFormat = (id) => {
    setSelectedFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const repurpose = async () => {
    if (!input.trim() || selectedFormats.length === 0) return;
    setLoading(true);
    setResults(null);
    setError("");

    const formatDescriptions = selectedFormats.map(id => {
      const f = FORMATS.find(f => f.id === id);
      return `- ${f.label} (${f.desc})`;
    }).join("\n");

    const prompt = `You are an expert content strategist and copywriter. A creator has given you raw content and wants it repurposed into multiple formats.

TONE: ${tone}

RAW CONTENT:
${input}

Generate the following content formats. Return ONLY a valid JSON object with keys matching the format IDs below. No markdown, no explanation.

Formats needed:
${selectedFormats.map(id => {
  const f = FORMATS.find(f => f.id === id);
  if (id === "tweet") return `"tweet": a string with 3 tweets separated by \\n\\n (each tweet max 280 chars, formatted as "1/ ...", "2/ ...", "3/ ...")`;
  if (id === "linkedin") return `"linkedin": a string for a LinkedIn post (150-200 words, starts with a hook, uses line breaks, ends with a CTA)`;
  if (id === "tiktok") return `"tiktok": a string with 3 alternative TikTok/Reels hooks (each 1-2 sentences, separated by \\n\\n, numbered 1. 2. 3.)`;
  if (id === "email") return `"email": a string with 5 email subject lines, each on a new line, numbered 1-5`;
  if (id === "newsletter") return `"newsletter": a string for a newsletter teaser paragraph (2-3 sentences, creates curiosity, invites click-through)`;
  return `"${id}": generated content`;
}).join(",\n")}

JSON only:`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResults(parsed);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c14",
      color: "#e5e7eb",
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1a2332",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{
          width: "32px", height: "32px",
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px",
        }}>⚡</div>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.02em", color: "#f9fafb" }}>
            Repurpose<span style={{ color: "#818cf8" }}>.ai</span>
          </div>
          <div style={{ fontSize: "11px", color: "#4b5563", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Content Multiplier
          </div>
        </div>
        <div style={{
          marginLeft: "auto",
          background: "#0f172a",
          border: "1px solid #1e3a5f",
          color: "#60a5fa",
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "11px",
          letterSpacing: "0.04em",
        }}>
          MVP DEMO
        </div>
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            margin: "0 0 12px",
            background: "linear-gradient(135deg, #f9fafb 40%, #818cf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            One piece of content.<br />Everywhere.
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px", margin: 0 }}>
            Paste a transcript, article, or idea — get ready-to-post content for every platform.
          </p>
        </div>

        {/* Input Card */}
        <div style={{
          background: "#0d1420",
          border: "1px solid #1a2540",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "20px",
        }}>
          <div style={{ fontSize: "11px", color: "#4b5563", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Your Raw Content
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste a blog post, video transcript, podcast notes, or any raw idea here..."
            rows={6}
            style={{
              width: "100%",
              background: "#060a10",
              border: "1px solid #1a2540",
              borderRadius: "10px",
              color: "#d1d5db",
              fontSize: "14px",
              padding: "14px",
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: "12px", color: "#374151", marginTop: "6px" }}>
            {input.length} chars · ~{Math.ceil(input.split(/\s+/).filter(Boolean).length)} words
          </div>
        </div>

        {/* Controls Row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "20px",
        }}>
          {/* Format Picker */}
          <div style={{
            background: "#0d1420",
            border: "1px solid #1a2540",
            borderRadius: "16px",
            padding: "20px",
          }}>
            <div style={{ fontSize: "11px", color: "#4b5563", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>
              Output Formats
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {FORMATS.map(f => {
                const active = selectedFormats.includes(f.id);
                return (
                  <button key={f.id} onClick={() => toggleFormat(f.id)} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: active ? "#0f1e35" : "transparent",
                    border: `1px solid ${active ? "#3b5bdb" : "#1a2540"}`,
                    borderRadius: "8px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textAlign: "left",
                  }}>
                    <span style={{ color: active ? "#818cf8" : "#374151", fontSize: "13px" }}>{f.icon}</span>
                    <div>
                      <div style={{ color: active ? "#e5e7eb" : "#6b7280", fontSize: "12px", fontWeight: 600 }}>{f.label}</div>
                      <div style={{ color: "#374151", fontSize: "10px" }}>{f.desc}</div>
                    </div>
                    <div style={{
                      marginLeft: "auto",
                      width: "16px", height: "16px",
                      borderRadius: "4px",
                      background: active ? "#6366f1" : "transparent",
                      border: `1px solid ${active ? "#6366f1" : "#374151"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "10px",
                      color: "#fff",
                    }}>
                      {active && "✓"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone + CTA */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              background: "#0d1420",
              border: "1px solid #1a2540",
              borderRadius: "16px",
              padding: "20px",
              flex: 1,
            }}>
              <div style={{ fontSize: "11px", color: "#4b5563", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>
                Tone of Voice
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)} style={{
                    background: tone === t ? "linear-gradient(135deg, #6366f1, #a855f7)" : "transparent",
                    border: `1px solid ${tone === t ? "transparent" : "#1a2540"}`,
                    color: tone === t ? "#fff" : "#6b7280",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: tone === t ? 600 : 400,
                    transition: "all 0.15s",
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={repurpose}
              disabled={loading || !input.trim() || selectedFormats.length === 0}
              style={{
                background: loading || !input.trim() || selectedFormats.length === 0
                  ? "#1a2540"
                  : "linear-gradient(135deg, #6366f1, #a855f7)",
                color: loading || !input.trim() || selectedFormats.length === 0 ? "#374151" : "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "18px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading || !input.trim() || selectedFormats.length === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.02em",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}>
              {loading ? (
                <>
                  <span style={{
                    width: "14px", height: "14px",
                    border: "2px solid #4b5563",
                    borderTopColor: "#818cf8",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                    display: "inline-block",
                  }} />
                  Generating...
                </>
              ) : (
                <>⚡ Repurpose Content</>
              )}
            </button>

            {/* Placeholder idea */}
            <button onClick={() => setInput(`I spent 6 months learning to wake up at 5am every day, and here's what actually happened. The first week was brutal — I failed 4 out of 7 days. But by month 2, I discovered it wasn't about willpower at all. It was about what I did the night before. The secret: I stopped optimizing my mornings and started designing my evenings instead. Prep your clothes, set a specific intention for the morning, and get off screens 90 minutes before bed. Now I wake up before my alarm. Every single day.`)} style={{
              background: "transparent",
              border: "1px dashed #1a2540",
              color: "#4b5563",
              borderRadius: "10px",
              padding: "10px",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.03em",
            }}>
              ✦ Load example content
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#1a0a0a",
            border: "1px solid #7f1d1d",
            borderRadius: "10px",
            padding: "14px 18px",
            color: "#fca5a5",
            fontSize: "13px",
            marginBottom: "20px",
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              fontSize: "11px", color: "#4b5563",
              letterSpacing: "0.08em", textTransform: "uppercase",
              paddingBottom: "8px",
              borderBottom: "1px solid #1a2540",
            }}>
              ✦ Generated Content — {tone} Tone
            </div>
            {selectedFormats.map(id => {
              const f = FORMATS.find(f => f.id === id);
              const content = results[id];
              if (!content) return null;
              return (
                <div key={id} style={{
                  background: "#0d1420",
                  border: "1px solid #1a2540",
                  borderRadius: "16px",
                  padding: "20px 24px",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#818cf8", fontSize: "14px" }}>{f.icon}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#c7d2fe", letterSpacing: "0.02em" }}>{f.label}</span>
                    </div>
                    <CopyButton text={content} />
                  </div>
                  <div style={{
                    color: "#d1d5db",
                    fontSize: "13.5px",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    borderLeft: "2px solid #1e3a5f",
                    paddingLeft: "16px",
                  }}>
                    {content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        textarea:focus { border-color: #3b5bdb !important; }
        textarea::placeholder { color: #374151; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #080c14; }
        ::-webkit-scrollbar-thumb { background: #1a2540; border-radius: 3px; }
      `}</style>
    </div>
  );
}
