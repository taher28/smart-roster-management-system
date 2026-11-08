export default function ModulePlaceholder({ title, summary, phase }) {
  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{summary}</p>

      <div className="mt-6 rounded-lg border border-line bg-panel px-5 py-6">
        <h2 className="text-sm font-semibold text-ink">Waiting for {phase}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This screen is a placeholder so the navigation can be reviewed. It
          does not load records, and it does not offer actions that would
          appear to save data.
        </p>
      </div>
    </section>
  )
}
