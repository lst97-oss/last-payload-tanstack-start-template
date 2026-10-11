import { Link } from '@tanstack/react-router'

// Site-level not-found boundary. Separate from the admin `AdminNotFound`
// (which needs Payload provider contexts and the forwarded RSC payload) —
// this covers unmatched public routes with no data dependencies.
export function SiteNotFound() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <p>
        <Link to="/">Go home</Link>
      </p>
    </div>
  )
}
