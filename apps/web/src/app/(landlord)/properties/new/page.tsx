import PropertyForm from './PropertyForm'

export default function NewPropertyPage() {
  return (
    <main className="flex-1 p-8 bg-bg-1">
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-fg-1 mb-8">Add property</h1>
        <div className="rounded-lg border border-border-1 bg-surface-1 p-6">
          <PropertyForm />
        </div>
      </div>
    </main>
  )
}
