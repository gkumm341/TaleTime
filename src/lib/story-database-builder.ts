/**
 * Story Database Builder
 * Ethically sources and processes stories for the TaleTime database
 */

import { ProjectGutenbergScraper, InternetArchiveScraper, WikisourceScraper, type ScrapedStory } from './story-scraper'
import { type Story } from './stories'

export class StoryDatabaseBuilder {
  private gutenbergScraper: ProjectGutenbergScraper
  private archiveScraper: InternetArchiveScraper
  private wikisourceScraper: WikisourceScraper

  constructor() {
    this.gutenbergScraper = new ProjectGutenbergScraper()
    this.archiveScraper = new InternetArchiveScraper()
    this.wikisourceScraper = new WikisourceScraper()
  }

  /**
   * Curated list of public domain short story collections
   */
  private getRecommendedSources() {
    return [
      // Project Gutenberg short story collections
      { source: 'gutenberg', id: 2148, title: "The Gift of the Magi and Other Stories by O. Henry" },
      { source: 'gutenberg', id: 932, title: "The Yellow Wallpaper by Charlotte Perkins Gilman" },
      { source: 'gutenberg', id: 1063, title: "The Cask of Amontillado by Edgar Allan Poe" },
      { source: 'gutenberg', id: 2000, title: "Grimms' Fairy Tales" },
      { source: 'gutenberg', id: 2591, title: "Hans Andersen's Fairy Tales" },
      
      // Collections good for different age groups
      { source: 'gutenberg', id: 19993, title: "The Blue Fairy Book by Andrew Lang" }, // Kids
      { source: 'gutenberg', id: 1200, title: "Treasure Island by Robert Louis Stevenson" }, // Teens
      { source: 'gutenberg', id: 345, title: "Dracula by Bram Stoker" }, // Adults (can extract chapters)
    ]
  }

  /**
   * Process and clean stories for the TaleTime format
   */
  async buildStoryDatabase(maxStories: number = 50): Promise<Story[]> {
    const stories: Story[] = []
    const sources = this.getRecommendedSources()
    
    console.log('🚀 Starting story collection process...')
    
    for (const source of sources.slice(0, maxStories)) {
      try {
        console.log(`📖 Processing: ${source.title}`)
        
        const scrapedStory = await this.gutenbergScraper.getStory(source.id)
        if (scrapedStory) {
          const processedStories = this.processLongText(scrapedStory)
          stories.push(...processedStories)
          
          console.log(`✅ Added ${processedStories.length} stories from ${source.title}`)
        }
        
        // Respectful delay between requests
        await this.delay(2000)
        
      } catch (error) {
        console.error(`❌ Failed to process ${source.title}:`, error)
      }
    }
    
    console.log(`🎉 Collection complete! Gathered ${stories.length} stories.`)
    return stories
  }

  /**
   * Break long texts into readable short stories
   */
  private processLongText(scrapedStory: ScrapedStory): Story[] {
    const stories: Story[] = []
    
    // If it's already short enough (under 2000 words), keep as is
    const wordCount = scrapedStory.content.split(/\s+/).length
    if (wordCount <= 2000) {
      stories.push(this.convertToTaleTimeFormat(scrapedStory))
      return stories
    }
    
    // For longer texts, try to split into chapters or sections
    const sections = this.splitIntoSections(scrapedStory.content)
    
    sections.forEach((section, index) => {
      const sectionStory: ScrapedStory = {
        ...scrapedStory,
        title: sections.length > 1 ? `${scrapedStory.title} - Part ${index + 1}` : scrapedStory.title,
        content: section,
        estimatedReadTime: this.calculateReadTime(section)
      }
      
      // Only include sections that are reasonable length (300-3000 words)
      const sectionWordCount = section.split(/\s+/).length
      if (sectionWordCount >= 300 && sectionWordCount <= 3000) {
        stories.push(this.convertToTaleTimeFormat(sectionStory))
      }
    })
    
    return stories
  }

  /**
   * Intelligently split long texts into chapters or natural breaks
   */
  private splitIntoSections(text: string): string[] {
    const sections: string[] = []
    
    // Try splitting by chapters first
    const chapterMatches = text.match(/^(CHAPTER|Chapter|chapter).*$/gm)
    if (chapterMatches && chapterMatches.length > 1) {
      const chapterSplit = text.split(/^(CHAPTER|Chapter|chapter).*$/gm)
      return chapterSplit.filter(section => section.trim().length > 500)
    }
    
    // Try splitting by Roman numerals
    const romanSplit = text.split(/^\s*[IVX]+\.?\s*$/gm)
    if (romanSplit.length > 1) {
      return romanSplit.filter(section => section.trim().length > 500)
    }
    
    // Split by double line breaks and group into reasonable chunks
    const paragraphs = text.split(/\n\n+/)
    let currentSection = ''
    const targetWordsPerSection = 1500
    
    for (const paragraph of paragraphs) {
      currentSection += paragraph + '\n\n'
      
      if (currentSection.split(/\s+/).length >= targetWordsPerSection) {
        sections.push(currentSection.trim())
        currentSection = ''
      }
    }
    
    // Add remaining content
    if (currentSection.trim()) {
      sections.push(currentSection.trim())
    }
    
    return sections.length > 0 ? sections : [text]
  }

  /**
   * Convert scraped story to TaleTime format
   */
  private convertToTaleTimeFormat(scrapedStory: ScrapedStory): Story {
    return {
      id: this.generateId(),
      title: this.cleanTitle(scrapedStory.title),
      genre: this.inferGenre(scrapedStory),
      age: this.inferAgeGroup(scrapedStory),
      time: scrapedStory.estimatedReadTime,
      teaser: this.generateTeaser(scrapedStory.content),
      content: scrapedStory.content,
      author: scrapedStory.author,
      mood: this.inferMood(scrapedStory),
      difficulty: this.inferDifficulty(scrapedStory.content),
      tags: this.generateTags(scrapedStory),
      dateAdded: new Date().toISOString().split('T')[0],
      featured: false
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/^(The\s+)?(.+?)\s+by\s+.+$/i, '$2') // Remove "by Author"
      .replace(/\s+/g, ' ')
      .trim()
  }

  private inferGenre(story: ScrapedStory): string {
    const content = story.content.toLowerCase()
    const title = story.title.toLowerCase()
    
    if (content.includes('fairy') || content.includes('magic') || title.includes('fairy')) return 'Fantasy'
    if (content.includes('murder') || content.includes('mystery') || content.includes('detective')) return 'Mystery'
    if (content.includes('adventure') || content.includes('journey') || content.includes('quest')) return 'Adventure'
    if (story.tags.some(tag => tag.includes('inspiration'))) return 'Inspiration'
    
    return 'Adventure' // Default
  }

  private inferAgeGroup(story: ScrapedStory): string {
    const content = story.content.toLowerCase()
    const title = story.title.toLowerCase()
    
    if (title.includes('fairy') || title.includes('children') || story.tags.includes('children')) return 'Kids'
    if (content.includes('school') || content.includes('teenage') || story.estimatedReadTime <= 15) return 'Teens'
    
    return 'Adults' // Default
  }

  private inferMood(story: ScrapedStory): string {
    const content = story.content.toLowerCase()
    
    if (content.includes('dark') || content.includes('death') || content.includes('horror')) return 'Eerie'
    if (content.includes('magic') || content.includes('fairy') || content.includes('wonder')) return 'Whimsical'
    if (content.includes('hope') || content.includes('triumph') || content.includes('success')) return 'Uplifting'
    if (content.includes('mystery') || content.includes('ancient') || content.includes('secret')) return 'Mystical'
    
    return 'Hopeful' // Default
  }

  private inferDifficulty(content: string): 'Easy' | 'Medium' | 'Hard' {
    const sentences = content.split(/[.!?]+/)
    const avgSentenceLength = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length
    
    if (avgSentenceLength < 15) return 'Easy'
    if (avgSentenceLength < 25) return 'Medium'
    return 'Hard'
  }

  private generateTeaser(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
    
    // Try to find an intriguing sentence from the first few paragraphs
    const firstParagraphs = content.substring(0, 1000)
    const interestingSentence = firstParagraphs.split(/[.!?]+/)
      .find(s => s.length > 30 && s.length < 150 && 
        (s.includes('discover') || s.includes('secret') || s.includes('mysterious') || s.includes('adventure')))
    
    if (interestingSentence) {
      return interestingSentence.trim() + '.'
    }
    
    // Fallback: use first meaningful sentence
    const firstSentence = sentences[0]?.trim()
    return firstSentence ? firstSentence + '.' : 'A captivating tale awaits.'
  }

  private generateTags(story: ScrapedStory): string[] {
    const tags: string[] = [...story.tags]
    
    // Add genre-based tags
    if (story.content.toLowerCase().includes('love')) tags.push('romance')
    if (story.content.toLowerCase().includes('family')) tags.push('family')
    if (story.content.toLowerCase().includes('friend')) tags.push('friendship')
    if (story.content.toLowerCase().includes('nature')) tags.push('nature')
    if (story.content.toLowerCase().includes('historical')) tags.push('historical')
    
    // Add source tags
    tags.push('public-domain', 'classic')
    
    return [...new Set(tags)] // Remove duplicates
  }

  private calculateReadTime(text: string): number {
    const wordsPerMinute = 200
    const wordCount = text.split(/\s+/).length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Usage example and utility functions
 */
export async function populateStoryDatabase() {
  const builder = new StoryDatabaseBuilder()
  
  try {
    const stories = await builder.buildStoryDatabase(20) // Get 20 stories
    
    // Save to file or database
    const storyData = `export const generatedStories = ${JSON.stringify(stories, null, 2)}`
    
    console.log('📝 Story database ready!')
    console.log('Stories by genre:', 
      stories.reduce((acc, story) => {
        acc[story.genre] = (acc[story.genre] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    )
    
    return storyData
    
  } catch (error) {
    console.error('Failed to build story database:', error)
    throw error
  }
}

/**
 * Manual curation helpers - for when you want to hand-pick stories
 */
export const curatedPublicDomainStories = [
  { 
    gutenbergId: 2148, 
    title: "The Gift of the Magi", 
    author: "O. Henry",
    genre: "Romance",
    ageGroup: "Adults",
    estimatedTime: 8
  },
  { 
    gutenbergId: 1063, 
    title: "The Cask of Amontillado", 
    author: "Edgar Allan Poe",
    genre: "Mystery", 
    ageGroup: "Adults",
    estimatedTime: 12
  },
  { 
    gutenbergId: 932, 
    title: "The Yellow Wallpaper", 
    author: "Charlotte Perkins Gilman",
    genre: "Mystery",
    ageGroup: "Adults", 
    estimatedTime: 25
  }
]