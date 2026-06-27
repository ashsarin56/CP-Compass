import { useEffect, useState } from 'react'
import { getRadar } from '../api'
import logo from '../assets/logo.svg'
import './Radar.css'

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
    <div className="radar-loading">
      <div className="spinner" />
      <p className="radar-loading-text">Building radar for {handle}...</p>
      <p className="radar-loading-subtext">
        Fetching CF history, computing skill map
      </p>
    </div>
  )

  if (error) return (
    <div className="radar-error">
      <span className="radar-error-icon">✕</span>
      <p className="radar-error-text">{error}</p>
    </div>
  )

  const tagSkills = data.tagSkills || {}
  const weaknesses = data.weaknesses || []

  const sortedTags = Object.entries(tagSkills)
    .filter(([, v]) => v.confidence !== 'low')
    .sort((a, b) => a[1].rating - b[1].rating)

  const maxRating = Math.max(...sortedTags.map(([, v]) => v.rating), 1600)
  const globalMarkerLeft = `${Math.min((data.globalEstimate / maxRating) * 100, 100)}%`

  return (
    <div className="radar-page">
      <header className="radar-header">
        <div className="radar-title-row">
          <img src={logo} alt="CP Compass" className="radar-logo" />
          <span className="radar-badge">Skill Radar</span>
        </div>

        <h1 className="radar-handle">{data.handle}</h1>

        <div className="radar-meta-row">
          <span className="radar-meta">
            Global estimate:{' '}
            <strong className="radar-meta-value--indigo">
              {data.globalEstimate}
            </strong>
          </span>
          <span className="radar-meta">
            Based on{' '}
            <strong className="radar-meta-value">
              {data.submissionCount}
            </strong>{' '}
            submissions
          </span>
        </div>
      </header>

      {weaknesses.length > 0 && (
        <div className="radar-weakness-callout">
          <p className="radar-weakness-label">Top Weaknesses Detected</p>
          <div className="radar-weakness-pills">
            {weaknesses.slice(0, 3).map(w => (
              <div key={w.tag} className="radar-weakness-pill">
                <span className="radar-weakness-pill-tag">{w.tag}</span>
                <span className="radar-weakness-pill-rating">{w.tagRating}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="radar-skillmap-card">
        <h3 className="radar-skillmap-title">Tag Skill Map</h3>

        <div className="radar-tag-list">
          {sortedTags.map(([tag, data_]) => {
            const isWeak = weaknesses.some(w => w.tag === tag)
            const barWidth = Math.min((data_.rating / maxRating) * 100, 100)

            return (
              <div key={tag} className="radar-tag-row">
                <span
                  className={
                    'radar-tag-name' + (isWeak ? ' radar-tag-name--weak' : '')
                  }
                >
                  {tag}
                </span>

                <div className="radar-bar-track">
                  <div
                    className={
                      'radar-bar-fill' +
                      (isWeak ? ' radar-bar-fill--red' : ' radar-bar-fill--green')
                    }
                    style={{ width: `${barWidth}%` }}
                  />
                  <div
                    className="radar-global-marker"
                    style={{ left: globalMarkerLeft }}
                  />
                </div>

                <span
                  className={
                    'radar-tag-rating' +
                    (isWeak ? ' radar-tag-rating--weak' : '')
                  }
                >
                  {data_.rating}
                </span>
              </div>
            )
          })}
        </div>

        <p className="radar-legend">
          <span className="radar-legend-marker">|</span> = your global estimate (
          {data.globalEstimate})
        </p>
      </div>

      <div className="radar-cta">
        <p className="radar-cta-text">
          Want to know exactly what to solve next?
        </p>
        <button
          className="radar-cta-button btn-primary"
          onClick={() => onAnalyze(data.handle)}
        >
          Get My Training Plan →
        </button>
        <p className="radar-cta-subtext">
          CP Compass generates 3 surgical problems targeting your exact gaps
        </p>
      </div>

      <p className="radar-footer">
        cpcompass.app · Generated{' '}
        {new Date(data.computedAt).toLocaleDateString()}
      </p>
    </div>
  )
}