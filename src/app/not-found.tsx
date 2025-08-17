import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cloud-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-sunset-coral-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-stone-gray-900 mb-2">Page Not Found</h2>
        <p className="text-stone-gray-600 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link 
          href="/" 
          className="inline-block px-6 py-3 bg-sunset-coral-600 text-white rounded-lg hover:bg-sunset-coral-700 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}