import { useEffect, useState } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

const exampleQuestions = [
  "Can I patent a new Ayurvedic formulation?",
  "How can I protect my Ayurvedic brand name?",
  "Can an Ayurvedic book be copyrighted?"
]

function App() {
  const [question, setQuestion] = useState("")
  const [language, setLanguage] = useState("English")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ip-sakti-recent-questions"))
      return Array.isArray(saved) ? saved.slice(0, 5) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("ip-sakti-recent-questions", JSON.stringify(history))
    } catch {
      return
    }
  }, [history])

  async function ask() {
    const submittedQuestion = question.trim()
    if (!submittedQuestion) return

    setHistory(current => [
      submittedQuestion,
      ...current.filter(item => item !== submittedQuestion)
    ].slice(0, 5))
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: submittedQuestion, language })
      })
      if (!response.ok) throw new Error("Request failed")
      setResult(await response.json())
    } catch {
      setResult({
        answer: "Backend connection failed.",
        disclaimer: "This guidance is for informational purposes only and should not be treated as legal advice."
      })
    }

    setLoading(false)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">IS</div>
          <div>
            <div className="brand-name">IP-SAKTI</div>
            <div className="brand-subtitle">Sahayak</div>
          </div>
        </div>
        <div className="header-note">Ayurveda IP desk <span>•</span> India</div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="tag">AYURVEDA <span>•</span> INTELLECTUAL PROPERTY</p>
            <h1>Protect what<br /><em>you've grown.</em></h1>
            <p className="hero-description">IP-SAKTI Sahayak provides clear, Ayurveda-focused guidance on protecting formulations, brands, written works and traditional knowledge.</p>
            <div className="category-list" aria-label="Available IP categories">
              <span>Patent</span>
              <span>Trademark</span>
              <span>Copyright</span>
              <span>GI</span>
            </div>
          </div>

          <div className="search-panel">
            <div className="panel-kicker">Start a consultation</div>
            <form className="search" onSubmit={e => { e.preventDefault(); ask() }}>
              <label htmlFor="language">Response language</label>
              <select id="language" value={language} onChange={e => setLanguage(e.target.value)}>
                <option>English</option>
                <option>Hindi</option>
                <option>Hinglish</option>
              </select>

              <label htmlFor="question">Your question</label>
              <textarea
                id="question"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g. Can my herbal formulation be patented?"
              />

              <button type="submit" disabled={loading}>
                {loading ? "Searching..." : "Ask Sahayak"}
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <div className="examples">
              <p>Try an example</p>
              <div>
                {exampleQuestions.map(example => (
                  <button type="button" key={example} onClick={() => setQuestion(example)}>
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div className="history">
              <div className="section-heading">
                <h2>Recent Questions</h2>
                <span>{history.length}/5</span>
              </div>
              {history.length ? history.map((item, index) => (
                <button type="button" key={`${item}-${index}`} onClick={() => setQuestion(item)}>
                  <span>{item}</span>
                  <span aria-hidden="true">↗</span>
                </button>
              )) : <p className="empty-history">Your submitted questions will appear here.</p>}
            </div>
          </div>
        </section>

        {result && (
          <section className="result" aria-live="polite">
            <div className="result-heading">
              <div className="badge">{result.category}</div>
              {result.confidence && <div className={`confidence ${result.confidence.toLowerCase()}`}>Confidence: {result.confidence}</div>}
            </div>
            {result.intent && (
              <div className="intent">
                <p>Domain: {result.intent.domain}</p>
                <p>Category: {result.intent.category}</p>
                <p>Jurisdiction: {result.intent.jurisdiction}</p>
              </div>
            )}
            <p className="section-label">Guidance</p>
            <h2 className="result-title">Your next step, made clearer.</h2>
            <p className="answer">{result.answer}</p>
            {result.route && (
              <div className="route">
                <p className="section-label">IP Route</p>
                <p>{result.route}</p>
              </div>
            )}
            {result.next_steps?.length > 0 && (
              <div className="next-steps">
                <p className="section-label">Suggested Next Steps</p>
                <ol>
                  {result.next_steps.map(step => <li key={step}>{step}</li>)}
                </ol>
              </div>
            )}

            <div className="sources">
              <div className="section-heading">
                <h2>Verified Sources</h2>
                <span>Evidence: {result.evidence_count ?? 0} verified sources</span>
              </div>

              {result.sources?.map(source => (
                <a className="source" href={source.url} target="_blank" rel="noreferrer" key={`${source.url}-${source.title}`}>
                  <span className="source-title">{source.title}</span>
                  <span className="source-meta">{source.source}</span>
                  {source.verified && <span className="verified">✓ Verified</span>}
                </a>
              ))}
            </div>
            <p className="disclaimer">{result.disclaimer}</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App