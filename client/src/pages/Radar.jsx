import { useEffect, useState } from 'react'
import { getRadar } from '../api'

export default function Radar({ handle, onAnalyze }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const result = await getRadar(handle)
        if (!result.success) throw new Error(result.error)
        setData(result.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [handle])

  if (loading) return (
    <div style={styles.center}>
      <p style={styles.loadingText}>Building radar for {handle}...</p>
      <p style={styles.loadingSubtext}>Fetching CF history, computing skill map</p>
    </div>
  )

  if (error) return (
    <div style={styles.center}>
      <p style={{ color: '#ef4444' }}>{error}</p>
    </div>
  )

  const tagSkills = data.tagSkills || {}
  const weaknesses = data.weaknesses || []

  const sortedTags = Object.entries(tagSkills)
    .filter(([, v]) => v.confidence !== 'low')
    .sort((a, b) => a[1].rating - b[1].rating)

  const maxRating = Math.max(...sortedTags.map(([, v]) => v.rating), 1600)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>CP Compass</h1>
          <span style={styles.badge}>Skill Radar</span>
        </div>
        <h2 style={styles.handle}>{data.handle}</h2>
        <div style={styles.metaRow}>
          <span style={styles.meta}>
            Global estimate: <strong style={{ color: '#4a9eed' }}>
              {data.globalEstimate}
            </strong>
          </span>
          <span style={styles.meta}>
            Based on <strong style={{ color: '#e5e5e5' }}>
              {data.submissionCount}
            </strong> submissions
          </span>
        </div>
      </div>

      {/* Weakness callout */}
      {weaknesses.length > 0 && (
        <div style={styles.weaknessCallout}>
          <p style={styles.weaknessCalloutTitle}>Top weaknesses detected</p>
          <div style={styles.weaknessTags}>
            {weaknesses.slice(0, 3).map(w => (
              <div key={w.tag} style={styles.weaknessPill}>
                <span style={styles.weaknessPillTag}>{w.tag}</span>
                <span style={styles.weaknessPillRating}>{w.tagRating}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill bars */}
      <div style={styles.radarCard}>
        <h3 style={styles.radarTitle}>Tag Skill Map</h3>
        <div style={styles.tagList}>
          {sortedTags.map(([tag, data_]) => {
            const isWeak = weaknesses.some(w => w.tag === tag)
            const barWidth = Math.min((data_.rating / maxRating) * 100, 100)
            return (
              <div key={tag} style={styles.tagRow}>
                <span style={{
                  ...styles.tagName,
                  color: isWeak ? '#ef4444' : '#a0a0a0'
                }}>
                  {tag}
                </span>
                <div style={styles.barTrack}>
                  <div style={{
                    ...styles.bar,
                    width: `${barWidth}%`,
                    background: isWeak
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : 'linear-gradient(90deg, #22c55e, #4ade80)'
                  }} />
                  {/* Global estimate marker */}
                  <div style={{
                    ...styles.globalMarker,
                    left: `${Math.min((data.globalEstimate / maxRating) * 100, 100)}%`
                  }} />
                </div>
                <span style={{
                  ...styles.tagRating,
                  color: isWeak ? '#ef4444' : '#555'
                }}>
                  {data_.rating}
                </span>
              </div>
            )
          })}
        </div>
        <p style={styles.markerNote}>
          | = your global estimate ({data.globalEstimate})
        </p>
      </div>

      {/* CTA */}
      <div style={styles.cta}>
        <p style={styles.ctaText}>
          Want to know exactly what to solve next?
        </p>
        <button
          onClick={() => onAnalyze(data.handle)}
          style={styles.ctaButton}
        >
          Get My Training Plan →
        </button>
        <p style={styles.ctaSubtext}>
          CP Compass generates 3 surgical problems targeting your exact gaps
        </p>
      </div>

      <p style={styles.footer}>
        cpcompass.dev · Generated {new Date(data.computedAt).toLocaleDateString()}
      </p>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '2rem 1.5rem'
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '0.5rem'
  },
  loadingText: {
    fontSize: '1.1rem',
    color: '#e5e5e5'
  },
  loadingSubtext: {
    fontSize: '0.85rem',
    color: '#555'
  },
  header: {
    marginBottom: '1.5rem'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem'
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #4a9eed, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  badge: {
    fontSize: '0.75rem',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '20px',
    padding: '0.2rem 0.6rem',
    color: '#a0a0a0'
  },
  handle: {
    fontSize: '2rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem'
  },
  metaRow: {
    display: 'flex',
    gap: '1.5rem'
  },
  meta: {
    fontSize: '0.9rem',
    color: '#a0a0a0'
  },
  weaknessCallout: {
    background: '#1a0a0a',
    border: '1px solid #3a1a1a',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem'
  },
  weaknessCalloutTitle: {
    fontSize: '0.8rem',
    color: '#ef4444',
    fontWeight: '600',
    marginBottom: '0.6rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  weaknessTags: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  weaknessPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: '#2a1010',
    border: '1px solid #3a1a1a',
    borderRadius: '6px',
    padding: '0.3rem 0.6rem'
  },
  weaknessPillTag: {
    fontSize: '0.85rem',
    color: '#e5e5e5'
  },
  weaknessPillRating: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#ef4444'
  },
  radarCard: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  radarTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#555',
    marginBottom: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  tagList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem'
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  tagName: {
    width: '150px',
    fontSize: '0.82rem',
    textAlign: 'right',
    flexShrink: 0
  },
  barTrack: {
    flex: 1,
    background: '#2a2a2a',
    borderRadius: '4px',
    height: '10px',
    position: 'relative',
    overflow: 'visible'
  },
  bar: {
    height: '100%',
    borderRadius: '4px'
  },
  globalMarker: {
    position: 'absolute',
    top: '-3px',
    width: '2px',
    height: '16px',
    background: '#4a9eed',
    opacity: 0.6
  },
  tagRating: {
    width: '38px',
    fontSize: '0.8rem',
    textAlign: 'right'
  },
  markerNote: {
    fontSize: '0.75rem',
    color: '#333',
    marginTop: '0.75rem',
    textAlign: 'right'
  },
  cta: {
    background: 'linear-gradient(135deg, #0d1a2e, #1a0d2e)',
    border: '1px solid #1e3a5f',
    borderRadius: '12px',
    padding: '1.5rem',
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  ctaText: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#e5e5e5',
    marginBottom: '1rem'
  },
  ctaButton: {
    background: 'linear-gradient(135deg, #4a9eed, #8b5cf6)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    marginBottom: '0.75rem'
  },
  ctaSubtext: {
    fontSize: '0.82rem',
    color: '#555'
  },
  footer: {
    fontSize: '0.75rem',
    color: '#333',
    textAlign: 'center'
  }
}