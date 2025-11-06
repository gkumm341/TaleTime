/**
 * Story Scraper for Public Domain Content
 * This module provides functions to ethically source stories from public domain websites
 */

export interface ScrapedStory {
  title: string
  content: string
  author: string
  source: string
  sourceUrl: string
  license: string
  estimatedReadTime: number
  genre?: string
  tags: string[]
}

export interface ScrapingConfig {
  respectRobotsTxt: boolean
  delayBetweenRequests: number // milliseconds
  maxConcurrentRequests: number
  userAgent: string
}

const DEFAULT_CONFIG: ScrapingConfig = {
  respectRobotsTxt: true,
  delayBetweenRequests: 1000, // 1 second between requests
  maxConcurrentRequests: 3,
  userAgent: 'TaleTime/1.0 (+https://taletime.app/contact)'
}

/**
 * Project Gutenberg API Integration
 * Searches and retrieves public domain stories
 */
export class ProjectGutenbergScraper {
  private config: ScrapingConfig
  private baseUrl = 'https://www.gutenberg.org'
  
  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Search for stories by genre, author, or keyword
   */
  async searchStories(query: {
    subject?: string
    author?: string
    title?: string
    language?: string
    limit?: number
  }): Promise<{ id: number; title: string; author: string; subject: string[] }[]> {
    const searchUrl = new URL(`${this.baseUrl}/ebooks/search/`)
    
    if (query.subject) searchUrl.searchParams.set('query', query.subject)
    if (query.author) searchUrl.searchParams.set('author', query.author)
    if (query.title) searchUrl.searchParams.set('title', query.title)
    if (query.language) searchUrl.searchParams.set('lang', query.language)
    
    searchUrl.searchParams.set('submit_search', 'Search')
    searchUrl.searchParams.set('sort_order', 'downloads')
    
    try {
      const response = await fetch(searchUrl.toString(), {
        headers: { 'User-Agent': this.config.userAgent }
      })
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      // Parse the HTML response (you'd need a proper HTML parser like jsdom)
      // This is a simplified example - in practice, use the Gutenberg API or RSS feeds
      const html = await response.text()
      return this.parseSearchResults(html, query.limit || 10)
      
    } catch (error) {
      console.error('Error searching Project Gutenberg:', error)
      return []
    }
  }

  /**
   * Download and process a specific story
   */
  async getStory(bookId: number): Promise<ScrapedStory | null> {
    try {
      // Get book metadata
      const metadataUrl = `${this.baseUrl}/ebooks/${bookId}`
      const textUrl = `${this.baseUrl}/files/${bookId}/${bookId}-0.txt`
      
      await this.delay(this.config.delayBetweenRequests)
      
      const [metadataResponse, textResponse] = await Promise.all([
        fetch(metadataUrl, { headers: { 'User-Agent': this.config.userAgent } }),
        fetch(textUrl, { headers: { 'User-Agent': this.config.userAgent } })
      ])
      
      if (!textResponse.ok) throw new Error(`Failed to fetch text: ${textResponse.status}`)
      
      const content = await textResponse.text()
      const cleanedContent = this.cleanProjectGutenbergText(content)
      
      // Extract metadata from content or API
      const metadata = this.extractMetadata(content)
      
      return {
        title: metadata.title || `Project Gutenberg Book ${bookId}`,
        content: cleanedContent,
        author: metadata.author || 'Unknown',
        source: 'Project Gutenberg',
        sourceUrl: metadataUrl,
        license: 'Public Domain',
        estimatedReadTime: this.calculateReadTime(cleanedContent),
        genre: metadata.genre,
        tags: metadata.tags || ['classic', 'public-domain']
      }
      
    } catch (error) {
      console.error(`Error fetching story ${bookId}:`, error)
      return null
    }
  }

  private parseSearchResults(html: string, limit: number) {
    // Implement HTML parsing logic here
    // This would extract book IDs, titles, authors from the search results
    // In practice, use a proper HTML parser or the Gutenberg catalog API
    return []
  }

  private cleanProjectGutenbergText(rawText: string): string {
    // Remove Project Gutenberg headers and footers
    let cleaned = rawText
    
    // Remove common Gutenberg header
    const headerEnd = cleaned.indexOf('*** START OF')
    if (headerEnd !== -1) {
      const actualStart = cleaned.indexOf('\n', headerEnd + 100)
      if (actualStart !== -1) {
        cleaned = cleaned.substring(actualStart + 1)
      }
    }
    
    // Remove common Gutenberg footer
    const footerStart = cleaned.lastIndexOf('*** END OF')
    if (footerStart !== -1) {
      cleaned = cleaned.substring(0, footerStart)
    }
    
    // Clean up formatting
    cleaned = cleaned
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .trim()
    
    return cleaned
  }

  private extractMetadata(content: string) {
    const lines = content.split('\n').slice(0, 50) // Check first 50 lines
    
    let title = ''
    let author = ''
    let genre = ''
    
    for (const line of lines) {
      if (line.toLowerCase().includes('title:')) {
        title = line.split(':')[1]?.trim() || ''
      }
      if (line.toLowerCase().includes('author:')) {
        author = line.split(':')[1]?.trim() || ''
      }
      if (line.toLowerCase().includes('subject:')) {
        genre = line.split(':')[1]?.trim() || ''
      }
    }
    
    return { title, author, genre, tags: [genre.toLowerCase()] }
  }

  private calculateReadTime(text: string): number {
    const wordsPerMinute = 200
    const wordCount = text.split(/\s+/).length
    return Math.ceil(wordCount / wordsPerMinute)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Internet Archive Scraper for public domain content
 */
export class InternetArchiveScraper {
  private baseUrl = 'https://archive.org'
  
  async searchBooks(query: {
    subject?: string
    creator?: string
    title?: string
    mediatype?: string
  }) {
    const searchUrl = new URL(`${this.baseUrl}/advancedsearch.php`)
    
    let q = 'mediatype:texts AND '
    if (query.subject) q += `subject:"${query.subject}" AND `
    if (query.creator) q += `creator:"${query.creator}" AND `
    if (query.title) q += `title:"${query.title}" AND `
    
    // Remove trailing AND
    q = q.replace(/ AND $/, '')
    
    searchUrl.searchParams.set('q', q)
    searchUrl.searchParams.set('fl', 'identifier,title,creator,subject,description')
    searchUrl.searchParams.set('rows', '50')
    searchUrl.searchParams.set('output', 'json')
    
    try {
      const response = await fetch(searchUrl.toString())
      const data = await response.json()
      return data.response.docs
    } catch (error) {
      console.error('Error searching Internet Archive:', error)
      return []
    }
  }
}

/**
 * Wikisource content scraper
 */
export class WikisourceScraper {
  private baseUrl = 'https://en.wikisource.org'
  
  async getCategories() {
    // Get list of short story categories
    const categories = [
      'Short_stories',
      'Fairy_tales',
      'Folk_tales',
      'Fables',
      'Children\'s_literature'
    ]
    return categories
  }
  
  async getStoriesFromCategory(category: string) {
    const apiUrl = `${this.baseUrl}/w/api.php`
    const params = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: '50',
      format: 'json',
      origin: '*'
    })
    
    try {
      const response = await fetch(`${apiUrl}?${params}`)
      const data = await response.json()
      return data.query?.categorymembers || []
    } catch (error) {
      console.error(`Error fetching ${category} from Wikisource:`, error)
      return []
    }
  }
}