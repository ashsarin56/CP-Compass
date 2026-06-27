import { useEffect, useState } from 'react'
import { getProfile, getRecommendations } from '../api'
import logo from '../assets/logo.svg'
import './Dashboard.css'

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
    <div className="dash-loading">
      <div className="spinner" />
      <p className="dash-loading-text">Loading your profile...</p>
    </div>
  )

  const weaknesses = profile?.weakness_vector || []
  const tagSkills = profile?.tag_skills || {}
  const batch = recs?.batch || []

  const sortedTags = Object.entries(tagSkills)
    .filter(([, v]) => v.confidence !== 'low')
    .sort((a, b) => a[1].rating - b[1].rating)

  return (
    <div>
      <nav className="dash-nav">
        <img src={logo} alt="CP Compass" className="dash-nav-logo" />
        <div className="dash-nav-right">
          <span className="dash-nav-handle">{handle}</span>
          <button
            className="dash-nav-btn dash-nav-btn--share"
            onClick={() => window.open(`/radar/${handle}`, '_blank')}
          >
            Share Radar ↗
          </button>
          <button
            className="dash-nav-btn dash-nav-btn--logout"
            onClick={onBack}
          >
            Log Out
          </button>
        </div>
      </nav>

      <div className="dash-container">
        <div className="dash-stats">
          <div className="dash-stat-card">
            <span className="dash-stat-value dash-stat-value--indigo">
              {profile?.global_estimate}
            </span>
            <span className="dash-stat-label">Global Estimate</span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-value dash-stat-value--danger">
              {weaknesses.length}
            </span>
            <span className="dash-stat-label">Weaknesses</span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-value">
              {sortedTags.length}
            </span>
            <span className="dash-stat-label">Tags Tracked</span>
          </div>
        </div>

        <div className="dash-grid">
          <section className="dash-card">
            <h3 className="dash-card-title">
              <span className="dash-card-title-icon">⚠</span>
              Weaknesses
              <span className="dash-card-count">{weaknesses.length}</span>
            </h3>
            {weaknesses.length === 0 ? (
              <p className="dash-weakness-empty">No clear weaknesses detected yet.</p>
            ) : (
              <div className="dash-weakness-list">
                {weaknesses.map(w => (
                  <div key={w.tag} className="dash-weakness-item">
                    <div className="dash-weakness-top">
                      <span className="dash-weakness-tag">{w.tag}</span>
                      <span className="dash-weakness-rating">{w.tagRating}</span>
                    </div>
                    <p className="dash-weakness-explanation">{w.explanation}</p>
                    {w.waRate && (
                      <div className="dash-wa-bar-wrap">
                        <div className="dash-wa-label">
                          <span className="dash-wa-label-text">WA Rate</span>
                          <span className="dash-wa-label-value">
                            {Math.round(w.waRate * 100)}%
                          </span>
                        </div>
                        <div className="dash-wa-track">
                          <div
                            className="dash-wa-fill"
                            style={{ width: `${Math.round(w.waRate * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dash-card">
            <h3 className="dash-card-title">
              <span className="dash-card-title-icon">📊</span>
              Tag Skill Map
              <span className="dash-card-count">{sortedTags.length}</span>
            </h3>
            <div className="dash-tagmap">
              {sortedTags.map(([tag, data]) => (
                <div key={tag} className="dash-tag-row">
                  <span className="dash-tag-name">{tag}</span>
                  <div className="dash-tag-bar-wrap">
                    <div
                      className={
                        'dash-tag-bar' +
                        (data.rating < profile.global_estimate
                          ? ' dash-tag-bar--below'
                          : ' dash-tag-bar--above')
                      }
                      style={{
                        width: `${Math.min((data.rating / 2000) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <span className="dash-tag-rating">{data.rating}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="dash-card dash-training">
          <h3 className="dash-card-title">
            <span className="dash-card-title-icon">🎯</span>
            Your Problems for Today
            <span className="dash-card-count">{batch.length}</span>
          </h3>
          <div className="dash-rec-grid">
            {batch.map(problem => (
              <div key={problem.problemId} className="dash-rec-card">
                <div className="dash-rec-top">
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="dash-rec-link"
                  >
                    {problem.name}
                  </a>
                  <span className="dash-rec-rating">⚡ {problem.rating}</span>
                </div>

                <p className="dash-rec-why">{problem.why}</p>

                <div className="dash-rec-prompts">
                  <p className="dash-rec-prompts-title">Think before coding</p>
                  {problem.thinkingPrompts.map((prompt, i) => (
                    <p key={i} className="dash-rec-prompt">{prompt}</p>
                  ))}
                </div>

                <div className="dash-rec-footer">
                  <span className="dash-rec-target">
                    targets: {problem.targetWeakness}
                  </span>
                  <span className="dash-rec-role">{problem.role}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}