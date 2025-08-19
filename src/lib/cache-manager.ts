import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { CACHE_CONFIG } from './cache-config'

// Allow configurable cache directory via environment variable
// Default to .cache in the project root
export const CACHE_BASE_DIR = process.env.CACHE_BASE_DIR 
  ? path.resolve(process.env.CACHE_BASE_DIR)
  : path.join(process.cwd(), '.cache')

// Export cache TTLs for backward compatibility
export const CACHE_TTLS = {
  PLACES: CACHE_CONFIG.PLACES.TTL_MS,
  IMAGES: CACHE_CONFIG.IMAGES.TTL_MS,
  SEARCHES: CACHE_CONFIG.SEARCHES.TTL_MS,
  DEFAULT: CACHE_CONFIG.DEFAULT.TTL_MS
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  subfolder?: 'places' | 'images' | 'searches'
}

interface CachedData<T = any> {
  data: T
  timestamp: number
  expiresAt: number
}

/**
 * Ensures cache directory exists
 */
async function ensureCacheDir(subfolder?: string): Promise<string> {
  const dir = subfolder ? path.join(CACHE_BASE_DIR, subfolder) : CACHE_BASE_DIR
  await fs.mkdir(dir, { recursive: true })
  return dir
}

/**
 * Generates a cache key from input parameters
 */
export function generateCacheKey(input: string | object): string {
  const str = typeof input === 'string' ? input : JSON.stringify(input)
  return crypto.createHash('md5').update(str).digest('hex')
}

/**
 * Gets cached data if it exists and is not expired
 */
export async function getCached<T = any>(
  key: string,
  options: CacheOptions = {}
): Promise<T | null> {
  try {
    const dir = await ensureCacheDir(options.subfolder)
    const filePath = path.join(dir, `${key}.json`)
    
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const cached: CachedData<T> = JSON.parse(fileContent)
    
    // Check if cache is expired
    if (Date.now() > cached.expiresAt) {
      console.log(`Cache expired for key: ${key}`)
      await fs.unlink(filePath).catch(() => {}) // Clean up expired cache
      return null
    }
    
    console.log(`Cache hit for key: ${key}`)
    return cached.data
  } catch (error) {
    // Cache miss is expected, not an error
    if ((error as any).code !== 'ENOENT') {
      console.error('Cache read error:', error)
    }
    return null
  }
}

/**
 * Sets data in cache with timestamp and TTL
 */
export async function setCached<T = any>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<void> {
  try {
    const dir = await ensureCacheDir(options.subfolder)
    const filePath = path.join(dir, `${key}.json`)
    const ttl = options.ttl || CACHE_TTLS.DEFAULT
    
    const cacheData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    }
    
    await fs.writeFile(filePath, JSON.stringify(cacheData, null, 2))
    console.log(`Cache set for key: ${key}, expires in ${ttl}ms`)
  } catch (error) {
    console.error('Cache write error:', error)
    // Don't throw - caching failure shouldn't break the app
  }
}

/**
 * Gets cached binary data (for images)
 */
export async function getCachedBinary(
  key: string,
  extension: string = 'jpg'
): Promise<Buffer | null> {
  try {
    const dir = await ensureCacheDir('images')
    const metaPath = path.join(dir, `${key}.meta.json`)
    const dataPath = path.join(dir, `${key}.${extension}`)
    
    // Check metadata first
    const metaContent = await fs.readFile(metaPath, 'utf-8')
    const meta: CachedData = JSON.parse(metaContent)
    
    if (Date.now() > meta.expiresAt) {
      console.log(`Image cache expired for key: ${key}`)
      await fs.unlink(metaPath).catch(() => {})
      await fs.unlink(dataPath).catch(() => {})
      return null
    }
    
    const data = await fs.readFile(dataPath)
    console.log(`Image cache hit for key: ${key}`)
    return data
  } catch (error) {
    if ((error as any).code !== 'ENOENT') {
      console.error('Binary cache read error:', error)
    }
    return null
  }
}

/**
 * Sets binary data in cache (for images)
 */
export async function setCachedBinary(
  key: string,
  data: Buffer,
  extension: string = 'jpg',
  ttl: number = CACHE_TTLS.DEFAULT
): Promise<void> {
  try {
    const dir = await ensureCacheDir('images')
    const metaPath = path.join(dir, `${key}.meta.json`)
    const dataPath = path.join(dir, `${key}.${extension}`)
    
    // Save metadata
    const meta: CachedData = {
      data: { size: data.length, extension },
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    }
    
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))
    await fs.writeFile(dataPath, data)
    console.log(`Image cached for key: ${key}, expires in ${ttl}ms`)
  } catch (error) {
    console.error('Binary cache write error:', error)
  }
}

/**
 * Clears expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  const subfolders = ['places', 'images', 'searches']
  
  for (const subfolder of subfolders) {
    try {
      const dir = path.join(CACHE_BASE_DIR, subfolder)
      const files = await fs.readdir(dir)
      
      for (const file of files) {
        if (file.endsWith('.json') && !file.endsWith('.meta.json')) {
          const filePath = path.join(dir, file)
          try {
            const content = await fs.readFile(filePath, 'utf-8')
            const cached: CachedData = JSON.parse(content)
            
            if (Date.now() > cached.expiresAt) {
              await fs.unlink(filePath)
              console.log(`Removed expired cache: ${file}`)
            }
          } catch {
            // Skip invalid files
          }
        }
      }
    } catch {
      // Directory might not exist yet
    }
  }
}

/**
 * Gets the current cache configuration
 */
export function getCacheConfiguration() {
  return {
    baseDir: CACHE_BASE_DIR,
    isCustomDir: !!process.env.CACHE_BASE_DIR,
    ttls: {
      places: CACHE_CONFIG.PLACES.TTL_HOURS,
      images: CACHE_CONFIG.IMAGES.TTL_HOURS,
      searches: CACHE_CONFIG.SEARCHES.TTL_HOURS
    }
  }
}

/**
 * Gets cache statistics
 */
export async function getCacheStats(): Promise<{
  totalFiles: number
  totalSize: number
  byFolder: Record<string, { files: number; size: number }>
}> {
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    byFolder: {} as Record<string, { files: number; size: number }>
  }
  
  const subfolders = ['places', 'images', 'searches']
  
  for (const subfolder of subfolders) {
    try {
      const dir = path.join(CACHE_BASE_DIR, subfolder)
      const files = await fs.readdir(dir)
      let folderSize = 0
      let fileCount = 0
      
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = await fs.stat(filePath)
        if (stat.isFile()) {
          folderSize += stat.size
          fileCount++
        }
      }
      
      stats.byFolder[subfolder] = { files: fileCount, size: folderSize }
      stats.totalFiles += fileCount
      stats.totalSize += folderSize
    } catch {
      stats.byFolder[subfolder] = { files: 0, size: 0 }
    }
  }
  
  return stats
}