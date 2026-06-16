import { Component } from 'react'
import ErrorPage from '../pages/ErrorPage'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.resetError = this.resetError.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  resetError() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code={500}
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          onRetry={this.resetError}
          onHome={() => {
            this.resetError()
            window.location.href = '/'
          }}
        />
      )
    }

    return this.props.children
  }
}
