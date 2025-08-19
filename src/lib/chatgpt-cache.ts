import fs from 'fs/promises'
import path from 'path'
import yaml from 'js-yaml'
import { CACHE_BASE_DIR } from './cache-manager'

/**
 * ChatGPT Cache Manager for debugging and visibility
 * Stores requests and responses organized by trip ID with timestamps
 */

interface ChatGPTCache {
  itineraryId: string
  timestamp: string
  prompt: string
  response: string
  error?: string
}

/**
 * Convert escape sequences to actual line breaks for better readability
 */
function formatTextForYaml(text: string): string {
  return text
    .replace(/\\n/g, '\n')   // Convert \n to actual line breaks
    .replace(/\\t/g, '\t')   // Convert \t to actual tabs
    .replace(/\\r/g, '\r')   // Convert \r to actual carriage returns
}

/**
 * Generate timestamped filename
 */
function generateTimestampedFilename(prefix: string, extension: string = 'yaml'): string {
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
 * Save ChatGPT conversation to cache (prompt and response in one file)
 */
export async function saveChatGPTConversation(
  itineraryId: string,
  prompt: string,
  response: string,
  error?: string
): Promise<void> {
  try {
    const cacheDir = await ensureChatGPTCacheDir(itineraryId)
    const timestamp = new Date().toISOString()
    
    const cacheData: ChatGPTCache = {
      itineraryId,
      timestamp,
      prompt: formatTextForYaml(prompt),
      response: error ? '' : formatTextForYaml(response),
      error
    }
    
    const filename = generateTimestampedFilename('conversation')
    const filepath = path.join(cacheDir, filename)
    
    // Write as YAML for better readability
    const yamlContent = yaml.dump(cacheData, {
      lineWidth: -1,        // No line wrapping
      quotingType: '"',     // Use double quotes
      forceQuotes: false,   // Only quote when necessary
      sortKeys: false       // Keep original order
    })
    
    await fs.writeFile(filepath, yamlContent, 'utf8')
    
    console.log(`💬 ChatGPT conversation cached: ${filename}`)
  } catch (error) {
    console.error('Error saving ChatGPT conversation to cache:', error)
  }
}

/**
 * Get ChatGPT cache stats for a trip
 */
export async function getChatGPTCacheStats(itineraryId: string): Promise<{
  conversationCount: number
  totalFiles: number
  files: string[]
}> {
  try {
    const cacheDir = path.join(CACHE_BASE_DIR, 'chatgpt', itineraryId)
    
    try {
      const files = await fs.readdir(cacheDir)
      const conversations = files.filter(f => f.startsWith('conversation_') && f.endsWith('.yaml'))
      
      return {
        conversationCount: conversations.length,
        totalFiles: files.length,
        files: files.sort()
      }
    } catch (dirError) {
      // Directory doesn't exist yet
      return {
        conversationCount: 0,
        totalFiles: 0,
        files: []
      }
    }
  } catch (error) {
    console.error('Error getting ChatGPT cache stats:', error)
    return {
      conversationCount: 0,
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
  totalConversations: number
  totalFiles: number
  tripStats: Record<string, { conversations: number; files: number }>
}> {
  try {
    const chatgptDir = path.join(CACHE_BASE_DIR, 'chatgpt')
    
    try {
      const tripDirs = await fs.readdir(chatgptDir)
      const stats = {
        totalTrips: tripDirs.length,
        totalConversations: 0,
        totalFiles: 0,
        tripStats: {} as Record<string, { conversations: number; files: number }>
      }
      
      for (const tripId of tripDirs) {
        const tripStat = await getChatGPTCacheStats(tripId)
        stats.totalConversations += tripStat.conversationCount
        stats.totalFiles += tripStat.totalFiles
        stats.tripStats[tripId] = {
          conversations: tripStat.conversationCount,
          files: tripStat.totalFiles
        }
      }
      
      return stats
    } catch (dirError) {
      // ChatGPT directory doesn't exist yet
      return {
        totalTrips: 0,
        totalConversations: 0,
        totalFiles: 0,
        tripStats: {}
      }
    }
  } catch (error) {
    console.error('Error getting all ChatGPT cache stats:', error)
    return {
      totalTrips: 0,
      totalConversations: 0,
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