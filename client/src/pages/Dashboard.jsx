import { useEffect, useState } from 'react'
import { getProfile, getRecommendations } from '../api'

export default function Dashboard({ handle, onBack }) {
  const [profile, setProfile] = useState(null)
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [p, r] = await Promise.all([
        getProfile(handle),
        getRecommendations(handle)
      ])
      setProfile(p.data)
      setRecs(r.data)
      setLoading(false)
    }
    load()
  }, [handle])

  if (loading) return (
    <div style={styles.center}>
      <p style={{ color: '#a0a0a0' }}>Loading your profile...</p>
    </div>
  )

  const weaknesses = profile?.weakness_vector || []
  const tagSkills = profile?.tag_skills || {}
  const batch = recs?.batch || []

  const sortedTags = Object.entries(tagSkills)
    .filter(([, v]) => v.confidence !== 'low')
    .sort((a, b) => a[1].rating - b[1].rating)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.buttonGroup}>
          <button onClick={onBack} style={styles.backBtn}>← Back</button>
          <button
            onClick={() => {
              window.open(`/radar/${handle}`, '_blank')
            }}
            style={{
              ...styles.backBtn,
              background: 'linear-gradient(135deg, #4a9eed22, #8b5cf622)',
              border: '1px solid #4a9eed44',
              color: '#4a9eed'
            }}
          >
            Share Radar ↗
          </button>
        </div>
        <div>
          <h2 style={styles.handle}>{handle}</h2>
          <p style={styles.globalEst}>
            Global estimate:{' '}
            <strong style={{ color: '#4a9eed' }}>
              {profile?.global_estimate}
            </strong>
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Your Weaknesses</h3>
          {weaknesses.length === 0 ? (
            <p style={styles.muted}>No clear weaknesses detected yet.</p>
          ) : (
            weaknesses.map(w => (
              <div key={w.tag} style={styles.weaknessItem}>
                <div style={styles.weaknessTop}>
                  <span style={styles.tag}>{w.tag}</span>
                  <span style={styles.weaknessRating}>{w.tagRating}</span>
                </div>
                <p style={styles.explanation}>{w.explanation}</p>
                {w.waRate && (
                  <p style={styles.waRate}>
                    WA rate: {Math.round(w.waRate * 100)}%
                  </p>
                )}
              </div>
            ))
          )}
        </section>

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Tag Skill Map</h3>
          <div style={styles.tagList}>
            {sortedTags.map(([tag, data]) => (
              <div key={tag} style={styles.tagRow}>
                <span style={styles.tagName}>{tag}</span>
                <div style={styles.barContainer}>
                  <div style={{
                    ...styles.bar,
                    width: `${Math.min((data.rating / 2000) * 100, 100)}%`,
                    background: data.rating < profile.global_estimate
                      ? '#ef4444'
                      : '#22c55e'
                  }} />
                </div>
                <span style={styles.tagRating}>{data.rating}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ ...styles.card, marginTop: '1.5rem' }}>
        <h3 style={styles.cardTitle}>Your Problems for Today</h3>
        <div style={styles.recGrid}>
          {batch.map(problem => (
            <div key={problem.problemId} style={styles.recCard}>
              <div style={styles.recTop}>
                <a
                  href={problem.url}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.problemLink}
                >
                  {problem.name}
                </a>
                <span style={styles.rating}>⚡ {problem.rating}</span>
              </div>

              <p style={styles.why}>{problem.why}</p>

              <div style={styles.prompts}>
                <p style={styles.promptsTitle}>Think before coding:</p>
                {problem.thinkingPrompts.map((prompt, i) => (
                  <p key={i} style={styles.prompt}>→ {prompt}</p>
                ))}
              </div>

              <div style={styles.recFooter}>
                <span style={styles.weaknessTag}>
                  targets: {problem.targetWeakness}
                </span>
                <span style={styles.role}>{problem.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

const styles = {
  container: { maxWidth: '1100px', margin: '0 auto', padding: '2rem' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  buttonGroup: { display: 'flex', gap: '0.5rem' },
  backBtn: { background: '#1a1a1a', border: '1px solid #333', color: '#a0a0a0', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem' },
  handle: { fontSize: '1.5rem', fontWeight: '700' },
  globalEst: { color: '#a0a0a0', fontSize: '0.9rem', marginTop: '0.25rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1.5rem' },
  cardTitle: { fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#e5e5e5' },
  weaknessItem: { marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #2a2a2a' },
  weaknessTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' },
  tag: { background: '#2a2a2a', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', color: '#ef4444' },
  weaknessRating: { fontSize: '1.1rem', fontWeight: '700', color: '#ef4444' },
  explanation: { fontSize: '0.85rem', color: '#a0a0a0', lineHeight: '1.5' },
  waRate: { fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.3rem' },
  muted: { color: '#555', fontSize: '0.9rem' },
  tagList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  tagRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  tagName: { width: '140px', fontSize: '0.8rem', color: '#a0a0a0', textAlign: 'right', flexShrink: 0 },
  barContainer: { flex: 1, background: '#2a2a2a', borderRadius: '4px', height: '8px', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  tagRating: { width: '40px', fontSize: '0.8rem', color: '#555', textAlign: 'right' },
  recGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.5rem' },
  recCard: { background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1.25rem' },
  recTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' },
  problemLink: { color: '#4a9eed', fontWeight: '600', fontSize: '0.95rem', textDecoration: 'none' },
  rating: { color: '#f59e0b', fontSize: '0.85rem', fontWeight: '600', flexShrink: 0 },
  why: { fontSize: '0.82rem', color: '#a0a0a0', lineHeight: '1.5', marginBottom: '0.75rem' },
  prompts: { background: '#1a1a1a', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem' },
  promptsTitle: { fontSize: '0.75rem', color: '#8b5cf6', fontWeight: '600', marginBottom: '0.4rem' },
  prompt: { fontSize: '0.78rem', color: '#888', lineHeight: '1.5' },
  recFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  weaknessTag: { fontSize: '0.75rem', color: '#555' },
  role: { fontSize: '0.75rem', background: '#2a2a2a', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#8b5cf6' }
}