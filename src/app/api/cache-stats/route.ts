import { NextResponse } from 'next/server'
import { getCacheStats, clearExpiredCache, getCacheConfiguration } from '@/lib/cache-manager'
import { getCacheConfigInfo } from '@/lib/cache-config'

export async function GET() {
  try {
    // Clear expired cache entries first
    await clearExpiredCache()
    
    // Get cache statistics
    const stats = await getCacheStats()
    
    // Get cache configuration info
    const configInfo = getCacheConfigInfo()
    const cacheConfig = getCacheConfiguration()
    
    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2),
        byFolder: Object.entries(stats.byFolder).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: {
            ...value,
            sizeMB: (value.size / (1024 * 1024)).toFixed(2)
          }
        }), {})
      },
      directory: {
        path: cacheConfig.baseDir,
        isCustom: cacheConfig.isCustomDir,
        source: cacheConfig.isCustomDir ? 'CACHE_BASE_DIR environment variable' : 'Default (.cache in project root)'
      },
      configuration: configInfo
    })
  } catch (error) {
    console.error('Cache stats error:', error)
    return NextResponse.json({ error: 'Failed to get cache stats' }, { status: 500 })
  }
}