import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md rounded-lg border border-line bg-panel px-6 py-8">
        <p className="text-sm font-medium text-muted">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          This page is not in the roster console.
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          The address does not match a module in this application.
        </p>
        <Link
          to="/"
          className="mt-5 inline-block text-sm font-medium text-accent hover:underline"
        >
          Go to the dashboard
        </Link>
      </div>
    </div>
  )
}
