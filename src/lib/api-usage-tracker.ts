import { prisma } from '@/lib/prisma'

export interface ApiUsageOptions {
  service: string
  endpoint: string
  userId?: string
}

export interface ApiLimitError extends Error {
  name: 'ApiLimitError'
  service: string
  endpoint: string
  currentUsage: number
  dailyLimit: number
}

export class ApiUsageTracker {
  private static instance: ApiUsageTracker
  private cache = new Map<string, number>() // Cache daily usage counts
  
  private constructor() {}
  
  static getInstance(): ApiUsageTracker {
    if (!ApiUsageTracker.instance) {
      ApiUsageTracker.instance = new ApiUsageTracker()
    }
    return ApiUsageTracker.instance
  }
  
  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0]
  }
  
  /**
   * Get cache key for usage tracking
   */
  private getCacheKey(service: string, endpoint: string, date: string, userId?: string): string {
    return `${service}:${endpoint}:${date}:${userId || 'global'}`
  }
  
  /**
   * Get or create API configuration
   */
  async getApiConfig(service: string): Promise<{ dailyLimit: number; enabled: boolean }> {
    try {
      let config = await prisma.apiConfig.findUnique({
        where: { service }
      })
      
      if (!config) {
        // Create default config
        config = await prisma.apiConfig.create({
          data: {
            service,
            dailyLimit: 2000,
            enabled: true
          }
        })
      }
      
      return {
        dailyLimit: config.dailyLimit,
        enabled: config.enabled
      }
    } catch (error) {
      console.error(`Error getting API config for ${service}:`, error)
      // Return default values on error
      return { dailyLimit: 2000, enabled: true }
    }
  }
  
  /**
   * Get current usage for a service/endpoint on a specific date
   */
  async getCurrentUsage(service: string, endpoint: string, date: string, userId?: string): Promise<number> {
    const cacheKey = this.getCacheKey(service, endpoint, date, userId)
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    
    try {
      const usage = await prisma.apiUsage.findFirst({
        where: {
          service,
          endpoint,
          date,
          userId: userId || null
        }
      })
      
      const count = usage?.count || 0
      this.cache.set(cacheKey, count)
      return count
    } catch (error) {
      console.error('Error getting current usage:', error)
      return 0
    }
  }
  
  /**
   * Check if API call would exceed daily limit
   */
  async checkLimit(options: ApiUsageOptions): Promise<boolean> {
    const { service, endpoint, userId } = options
    const today = this.getTodayString()
    
    const config = await this.getApiConfig(service)
    if (!config.enabled) {
      return false // Service disabled, don't allow calls
    }
    
    const currentUsage = await this.getCurrentUsage(service, endpoint, today, userId)
    return currentUsage < config.dailyLimit
  }
  
  /**
   * Track an API call and check limits
   * @param options - API usage tracking options
   * @throws {ApiLimitError} When daily limit is exceeded
   */
  async trackApiCall(options: ApiUsageOptions): Promise<void> {
    const { service, endpoint, userId } = options
    const today = this.getTodayString()
    
    const config = await this.getApiConfig(service)
    if (!config.enabled) {
      const error = new Error(`API service ${service} is disabled`) as ApiLimitError
      error.name = 'ApiLimitError'
      error.service = service
      error.endpoint = endpoint
      error.currentUsage = 0
      error.dailyLimit = config.dailyLimit
      throw error
    }
    
    // Check current usage before incrementing
    const currentUsage = await this.getCurrentUsage(service, endpoint, today, userId)
    
    if (currentUsage >= config.dailyLimit) {
      const error = new Error(`Daily API limit exceeded for ${service}:${endpoint}`) as ApiLimitError
      error.name = 'ApiLimitError'
      error.service = service
      error.endpoint = endpoint
      error.currentUsage = currentUsage
      error.dailyLimit = config.dailyLimit
      throw error
    }
    
    try {
      // Find existing usage record
      const existingUsage = await prisma.apiUsage.findFirst({
        where: {
          service,
          endpoint,
          date: today,
          userId: userId || null
        }
      })

      let updatedUsage
      if (existingUsage) {
        // Update existing record
        updatedUsage = await prisma.apiUsage.update({
          where: { id: existingUsage.id },
          data: {
            count: {
              increment: 1
            }
          }
        })
      } else {
        // Create new record
        updatedUsage = await prisma.apiUsage.create({
          data: {
            service,
            endpoint,
            date: today,
            count: 1,
            userId: userId || null
          }
        })
      }
      
      // Update cache
      const cacheKey = this.getCacheKey(service, endpoint, today, userId)
      this.cache.set(cacheKey, updatedUsage.count)
      
    } catch (error) {
      console.error('Error tracking API call:', error)
      // Don't throw here - we don't want to block the API call if tracking fails
    }
  }
  
  /**
   * Get usage statistics for a service
   */
  async getUsageStats(service: string, days: number = 7): Promise<{
    dailyUsage: Array<{
      date: string
      endpoint: string
      count: number
    }>
    totalUsage: number
    config: { dailyLimit: number; enabled: boolean }
  }> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    
    const startDateString = startDate.toISOString().split('T')[0]
    const endDateString = endDate.toISOString().split('T')[0]
    
    try {
      const [usage, config] = await Promise.all([
        prisma.apiUsage.findMany({
          where: {
            service,
            date: {
              gte: startDateString,
              lte: endDateString
            }
          },
          orderBy: {
            date: 'desc'
          }
        }),
        this.getApiConfig(service)
      ])
      
      const totalUsage = usage.reduce((sum, record) => sum + record.count, 0)
      
      return {
        dailyUsage: usage.map(record => ({
          date: record.date,
          endpoint: record.endpoint,
          count: record.count
        })),
        totalUsage,
        config
      }
    } catch (error) {
      console.error('Error getting usage stats:', error)
      return {
        dailyUsage: [],
        totalUsage: 0,
        config: { dailyLimit: 2000, enabled: true }
      }
    }
  }
  
  /**
   * Update API configuration
   */
  async updateConfig(service: string, updates: { dailyLimit?: number; enabled?: boolean }): Promise<void> {
    try {
      await prisma.apiConfig.upsert({
        where: { service },
        update: updates,
        create: {
          service,
          dailyLimit: updates.dailyLimit || 2000,
          enabled: updates.enabled !== undefined ? updates.enabled : true
        }
      })
      
      // Clear cache for this service
      const today = this.getTodayString()
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.startsWith(`${service}:`) && key.includes(today)
      )
      keysToDelete.forEach(key => this.cache.delete(key))
      
    } catch (error) {
      console.error('Error updating API config:', error)
      throw error
    }
  }
  
  /**
   * Reset daily usage (useful for testing or manual resets)
   */
  async resetDailyUsage(service: string, date?: string): Promise<void> {
    const targetDate = date || this.getTodayString()
    
    try {
      await prisma.apiUsage.deleteMany({
        where: {
          service,
          date: targetDate
        }
      })
      
      // Clear cache for this service and date
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.startsWith(`${service}:`) && key.includes(targetDate)
      )
      keysToDelete.forEach(key => this.cache.delete(key))
      
    } catch (error) {
      console.error('Error resetting daily usage:', error)
      throw error
    }
  }
  
  /**
   * Clean up old usage records (older than specified days)
   */
  async cleanupOldRecords(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    const cutoffDateString = cutoffDate.toISOString().split('T')[0]
    
    try {
      const result = await prisma.apiUsage.deleteMany({
        where: {
          date: {
            lt: cutoffDateString
          }
        }
      })
      
      return result.count
    } catch (error) {
      console.error('Error cleaning up old records:', error)
      return 0
    }
  }
}

// Export singleton instance
export const apiUsageTracker = ApiUsageTracker.getInstance()

// Helper function for easy tracking
export async function trackGoogleMapsCall(endpoint: string, userId?: string): Promise<void> {
  return apiUsageTracker.trackApiCall({
    service: 'google-maps',
    endpoint,
    userId
  })
}

// Helper function to check Google Maps limits
export async function checkGoogleMapsLimit(endpoint: string, userId?: string): Promise<boolean> {
  return apiUsageTracker.checkLimit({
    service: 'google-maps',
    endpoint,
    userId
  })
}