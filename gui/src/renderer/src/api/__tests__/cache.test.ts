import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createCache } from '../cache'

describe('API Response Cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createCache factory', () => {
    it('should create a cache instance with get, set, invalidate, and clear methods', () => {
      const cache = createCache()
      expect(cache).toHaveProperty('get')
      expect(cache).toHaveProperty('set')
      expect(cache).toHaveProperty('invalidate')
      expect(cache).toHaveProperty('clear')
      expect(typeof cache.get).toBe('function')
      expect(typeof cache.set).toBe('function')
      expect(typeof cache.invalidate).toBe('function')
      expect(typeof cache.clear).toBe('function')
    })
  })

  describe('cache.set and cache.get', () => {
    it('should return undefined for cache miss', () => {
      const cache = createCache()
      const result = cache.get('/api/models')
      expect(result).toBeUndefined()
    })

    it('should return cached data on cache hit', () => {
      const cache = createCache()
      const testData = { models: ['model1', 'model2'] }
      
      cache.set('/api/models', testData, 5 * 60 * 1000) // 5 minutes
      const result = cache.get('/api/models')
      
      expect(result).toEqual(testData)
    })

    it('should return undefined for expired cache entries', () => {
      const cache = createCache()
      const testData = { models: ['model1'] }
      const ttl = 5 * 60 * 1000 // 5 minutes
      
      cache.set('/api/models', testData, ttl)
      
      // Advance time past TTL
      vi.advanceTimersByTime(ttl + 1000)
      
      const result = cache.get('/api/models')
      expect(result).toBeUndefined()
    })

    it('should return cached data before expiration', () => {
      const cache = createCache()
      const testData = { settings: { language: 'en' } }
      const ttl = 60 * 1000 // 1 minute
      
      cache.set('/api/settings', testData, ttl)
      
      // Advance time but not past TTL
      vi.advanceTimersByTime(30 * 1000)
      
      const result = cache.get('/api/settings')
      expect(result).toEqual(testData)
    })
  })

  describe('cache.invalidate', () => {
    it('should remove specific cache entry by exact key', () => {
      const cache = createCache()
      const data1 = { models: ['model1'] }
      const data2 = { devices: ['device1'] }
      
      cache.set('/api/models', data1, 5 * 60 * 1000)
      cache.set('/api/devices', data2, 5 * 60 * 1000)
      
      cache.invalidate('/api/models')
      
      expect(cache.get('/api/models')).toBeUndefined()
      expect(cache.get('/api/devices')).toEqual(data2)
    })

    it('should support pattern-based invalidation with wildcards', () => {
      const cache = createCache()
      const data1 = { items: ['item1'] }
      const data2 = { items: ['item2'] }
      const data3 = { settings: {} }
      
      cache.set('/api/history?limit=10', data1, 5 * 60 * 1000)
      cache.set('/api/history?limit=20', data2, 5 * 60 * 1000)
      cache.set('/api/settings', data3, 5 * 60 * 1000)
      
      // Invalidate all /api/history* entries
      cache.invalidate('/api/history*')
      
      expect(cache.get('/api/history?limit=10')).toBeUndefined()
      expect(cache.get('/api/history?limit=20')).toBeUndefined()
      expect(cache.get('/api/settings')).toEqual(data3)
    })

    it('should handle pattern invalidation with trailing asterisk', () => {
      const cache = createCache()
      const modelsData = { models: [] }
      const settingsData = { settings: {} }
      
      cache.set('/api/models', modelsData, 5 * 60 * 1000)
      cache.set('/api/models/recommend', modelsData, 5 * 60 * 1000)
      cache.set('/api/settings', settingsData, 5 * 60 * 1000)
      
      cache.invalidate('/api/models*')
      
      expect(cache.get('/api/models')).toBeUndefined()
      expect(cache.get('/api/models/recommend')).toBeUndefined()
      expect(cache.get('/api/settings')).toEqual(settingsData)
    })
  })

  describe('cache.clear', () => {
    it('should remove all cache entries', () => {
      const cache = createCache()
      
      cache.set('/api/models', { models: [] }, 5 * 60 * 1000)
      cache.set('/api/settings', { settings: {} }, 5 * 60 * 1000)
      cache.set('/api/devices', { devices: [] }, 5 * 60 * 1000)
      
      cache.clear()
      
      expect(cache.get('/api/models')).toBeUndefined()
      expect(cache.get('/api/settings')).toBeUndefined()
      expect(cache.get('/api/devices')).toBeUndefined()
    })
  })

  describe('cache TTL configurations', () => {
    it('should respect different TTL values for different endpoints', () => {
      const cache = createCache()
      const data = { test: 'data' }
      
      cache.set('/api/models', data, 5 * 60 * 1000) // 5 minutes
      cache.set('/api/settings', data, 1 * 60 * 1000) // 1 minute
      
      // Advance 2 minutes
      vi.advanceTimersByTime(2 * 60 * 1000)
      
      // /api/models should still be cached (5 min TTL)
      expect(cache.get('/api/models')).toEqual(data)
      // /api/settings should be expired (1 min TTL)
      expect(cache.get('/api/settings')).toBeUndefined()
    })
  })
})
