import fs from 'fs/promises'
import path from 'path'
import { CACHE_BASE_DIR } from './cache-manager'

/**
 * ChatGPT Cache Manager for debugging and visibility
 * Stores requests and responses organized by trip ID with timestamps
 */

interface ChatGPTRequest {
  itineraryId: string
  model: string
  messages: any[]
  timestamp: string
  maxTokens?: number
  temperature?: number
}

interface ChatGPTResponse {
  itineraryId: string
  requestTimestamp: string
  responseTimestamp: string
  response: any
  usage?: any
  error?: string
}

/**
 * Generate timestamped filename
 */
function generateTimestampedFilename(prefix: string, extension: string = 'json'): string {
  const now = new Date()
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, -5) // Remove milliseconds and Z
  
  return `${prefix}_${timestamp}.${extension}`
}

/**
 * Ensure ChatGPT cache directory exists for a trip
 */
async function ensureChatGPTCacheDir(itineraryId: string): Promise<string> {
  const chatgptDir = path.join(CACHE_BASE_DIR, 'chatgpt', itineraryId)
  await fs.mkdir(chatgptDir, { recursive: true })
  return chatgptDir
}

/**
 * Save ChatGPT request to cache
 */
export async function saveChatGPTRequest(
  itineraryId: string,
  messages: any[],
  model: string = 'gpt-4o-mini',
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  try {
    const cacheDir = await ensureChatGPTCacheDir(itineraryId)
    const timestamp = new Date().toISOString()
    
    const requestData: ChatGPTRequest = {
      itineraryId,
      model,
      messages,
      timestamp,
      maxTokens: options.maxTokens,
      temperature: options.temperature
    }
    
    const filename = generateTimestampedFilename('request')
    const filepath = path.join(cacheDir, filename)
    
    await fs.writeFile(filepath, JSON.stringify(requestData, null, 2))
    
    console.log(`📝 ChatGPT request cached: ${filename}`)
    return timestamp
  } catch (error) {
    console.error('Error saving ChatGPT request to cache:', error)
    return new Date().toISOString()
  }
}

/**
 * Save ChatGPT response to cache
 */
export async function saveChatGPTResponse(
  itineraryId: string,
  requestTimestamp: string,
  response: any,
  error?: string
): Promise<void> {
  try {
    const cacheDir = await ensureChatGPTCacheDir(itineraryId)
    const responseTimestamp = new Date().toISOString()
    
    const responseData: ChatGPTResponse = {
      itineraryId,
      requestTimestamp,
      responseTimestamp,
      response: error ? null : response,
      usage: response?.usage,
      error
    }
    
    // Use the same timestamp format as request for easier matching
    const requestTime = requestTimestamp.replace(/[:.]/g, '-').replace('T', '_').slice(0, -5)
    const filename = `response_${requestTime}.json`
    const filepath = path.join(cacheDir, filename)
    
    await fs.writeFile(filepath, JSON.stringify(responseData, null, 2))
    
    console.log(`💬 ChatGPT response cached: ${filename}`)
  } catch (error) {
    console.error('Error saving ChatGPT response to cache:', error)
  }
}

/**
 * Get ChatGPT cache stats for a trip
 */
export async function getChatGPTCacheStats(itineraryId: string): Promise<{
  requestCount: number
  responseCount: number
  totalFiles: number
  files: string[]
}> {
  try {
    const cacheDir = path.join(CACHE_BASE_DIR, 'chatgpt', itineraryId)
    
    try {
      const files = await fs.readdir(cacheDir)
      const requests = files.filter(f => f.startsWith('request_'))
      const responses = files.filter(f => f.startsWith('response_'))
      
      return {
        requestCount: requests.length,
        responseCount: responses.length,
        totalFiles: files.length,
        files: files.sort()
      }
    } catch (dirError) {
      // Directory doesn't exist yet
      return {
        requestCount: 0,
        responseCount: 0,
        totalFiles: 0,
        files: []
      }
    }
  } catch (error) {
    console.error('Error getting ChatGPT cache stats:', error)
    return {
      requestCount: 0,
      responseCount: 0,
      totalFiles: 0,
      files: []
    }
  }
}

/**
 * Get all ChatGPT cache stats (all trips)
 */
export async function getAllChatGPTCacheStats(): Promise<{
  totalTrips: number
  totalRequests: number
  totalResponses: number
  totalFiles: number
  tripStats: Record<string, { requests: number; responses: number; files: number }>
}> {
  try {
    const chatgptDir = path.join(CACHE_BASE_DIR, 'chatgpt')
    
    try {
      const tripDirs = await fs.readdir(chatgptDir)
      const stats = {
        totalTrips: tripDirs.length,
        totalRequests: 0,
        totalResponses: 0,
        totalFiles: 0,
        tripStats: {} as Record<string, { requests: number; responses: number; files: number }>
      }
      
      for (const tripId of tripDirs) {
        const tripStat = await getChatGPTCacheStats(tripId)
        stats.totalRequests += tripStat.requestCount
        stats.totalResponses += tripStat.responseCount
        stats.totalFiles += tripStat.totalFiles
        stats.tripStats[tripId] = {
          requests: tripStat.requestCount,
          responses: tripStat.responseCount,
          files: tripStat.totalFiles
        }
      }
      
      return stats
    } catch (dirError) {
      // ChatGPT directory doesn't exist yet
      return {
        totalTrips: 0,
        totalRequests: 0,
        totalResponses: 0,
        totalFiles: 0,
        tripStats: {}
      }
    }
  } catch (error) {
    console.error('Error getting all ChatGPT cache stats:', error)
    return {
      totalTrips: 0,
      totalRequests: 0,
      totalResponses: 0,
      totalFiles: 0,
      tripStats: {}
    }
  }
}

/**
 * Clean up old ChatGPT cache files (older than specified days)
 */
export async function cleanupOldChatGPTCache(
  olderThanDays: number = 30,
  itineraryId?: string
): Promise<{ deletedFiles: number; errors: string[] }> {
  const results = { deletedFiles: 0, errors: [] as string[] }
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
  
  try {
    const baseDir = itineraryId 
      ? path.join(CACHE_BASE_DIR, 'chatgpt', itineraryId)
      : path.join(CACHE_BASE_DIR, 'chatgpt')
    
    const processDirectory = async (dir: string) => {
      try {
        const files = await fs.readdir(dir)
        
        for (const file of files) {
          const filepath = path.join(dir, file)
          const stats = await fs.stat(filepath)
          
          if (stats.isFile() && stats.mtime < cutoffDate) {
            try {
              await fs.unlink(filepath)
              results.deletedFiles++
              console.log(`🗑️  Deleted old ChatGPT cache file: ${file}`)
            } catch (deleteError) {
              results.errors.push(`Failed to delete ${file}: ${deleteError}`)
            }
          } else if (stats.isDirectory() && !itineraryId) {
            // Recursively process subdirectories when cleaning all trips
            await processDirectory(filepath)
          }
        }
      } catch (dirError) {
        results.errors.push(`Failed to read directory ${dir}: ${dirError}`)
      }
    }
    
    await processDirectory(baseDir)
  } catch (error) {
    results.errors.push(`Cleanup error: ${error}`)
  }
  
  return results
}