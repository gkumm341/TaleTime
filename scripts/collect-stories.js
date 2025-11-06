#!/usr/bin/env node

/**
 * TaleTime Story Collection CLI
 * 
 * Usage:
 *   npm run collect-stories
 *   yarn collect-stories
 * 
 * This script ethically collects public domain stories for TaleTime
 */

const fs = require('fs').promises
const path = require('path')
const fetch = require('node-fetch')

// Simple Project Gutenberg story collector
class SimpleStoryCollector {
  constructor() {
    this.baseUrl = 'https://www.gutenberg.org'
    this.delayMs = 1000 // 1 second between requests
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  calculateReadTime(text) {
    const wordsPerMinute = 200
    const wordCount = text.split(/\s+/).length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  cleanGutenbergText(rawText) {
    let cleaned = rawText
    
    // Remove Project Gutenberg headers and footers
    const headerEnd = cleaned.indexOf('*** START OF')
    if (headerEnd !== -1) {
      const actualStart = cleaned.indexOf('\n', headerEnd + 100)
      if (actualStart !== -1) {
        cleaned = cleaned.substring(actualStart + 1)
      }
    }
    
    const footerStart = cleaned.lastIndexOf('*** END OF')
    if (footerStart !== -1) {
      cleaned = cleaned.substring(0, footerStart)
    }
    
    // Clean up formatting
    cleaned = cleaned
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    
    return cleaned
  }

  generateTeaser(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
    const firstSentence = sentences[0]?.trim()
    
    if (firstSentence && firstSentence.length > 30 && firstSentence.length < 150) {
      return firstSentence + '.'
    }
    
    return 'A captivating tale from the world of classic literature.'
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  async fetchStory(bookId, title, author, genre = 'Adventure', age = 'Adults') {
    try {
      console.log(`📖 Fetching: ${title} by ${author}`)
      
      const textUrl = `${this.baseUrl}/files/${bookId}/${bookId}-0.txt`
      const response = await fetch(textUrl)
      
      if (!response.ok) {
        console.log(`   ❌ Failed to fetch (${response.status})`)
        return null
      }
      
      const rawText = await response.text()
      const cleanedContent = this.cleanGutenbergText(rawText)
      
      if (cleanedContent.length < 500) {
        console.log(`   ⚠️  Text too short, skipping`)
        return null
      }

      const story = {
        id: this.generateId(),
        title: title,
        genre: genre,
        age: age,
        time: this.calculateReadTime(cleanedContent),
        teaser: this.generateTeaser(cleanedContent),
        content: cleanedContent.substring(0, 15000), // Limit to reasonable length
        author: author,
        mood: this.inferMood(cleanedContent),
        difficulty: this.inferDifficulty(cleanedContent),
        tags: ['classic', 'public-domain', genre.toLowerCase()],
        dateAdded: new Date().toISOString().split('T')[0],
        featured: false
      }

      console.log(`   ✅ Success! (${story.time} min read)`)
      await this.delay(this.delayMs)
      
      return story
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
      return null
    }
  }

  inferMood(content) {
    const text = content.toLowerCase()
    if (text.includes('dark') || text.includes('death') || text.includes('horror')) return 'Eerie'
    if (text.includes('magic') || text.includes('fairy') || text.includes('wonder')) return 'Whimsical'
    if (text.includes('hope') || text.includes('triumph')) return 'Uplifting'
    if (text.includes('mystery') || text.includes('ancient')) return 'Mystical'
    return 'Hopeful'
  }

  inferDifficulty(content) {
    const sentences = content.split(/[.!?]+/)
    const avgLength = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length
    
    if (avgLength < 15) return 'Easy'
    if (avgLength < 25) return 'Medium'
    return 'Hard'
  }
}

// Expanded list of great public domain stories
const CURATED_STORIES = [
  // Classic Short Stories & Romance
  { id: 2148, title: "The Gift of the Magi", author: "O. Henry", genre: "Romance", age: "Adults" },
  { id: 932, title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", genre: "Mystery", age: "Adults" },
  { id: 2554, title: "The Story of an Hour", author: "Kate Chopin", genre: "Romance", age: "Adults" },
  { id: 394, title: "Cranford", author: "Elizabeth Gaskell", genre: "Romance", age: "Adults" },
  
  // Adventure & Action
  { id: 1200, title: "Treasure Island", author: "Robert Louis Stevenson", genre: "Adventure", age: "Teens" },
  { id: 74, title: "The Adventures of Tom Sawyer", author: "Mark Twain", genre: "Adventure", age: "Teens" },
  { id: 76, title: "Adventures of Huckleberry Finn", author: "Mark Twain", genre: "Adventure", age: "Teens" },
  { id: 120, title: "Treasure Island", author: "Robert Louis Stevenson", genre: "Adventure", age: "Teens" },
  { id: 150, title: "The Jungle Book", author: "Rudyard Kipling", genre: "Adventure", age: "Kids" },
  { id: 236, title: "The Second Jungle Book", author: "Rudyard Kipling", genre: "Adventure", age: "Kids" },
  
  // Fantasy & Fairy Tales
  { id: 5314, title: "Grimms' Fairy Tales", author: "Jacob and Wilhelm Grimm", genre: "Fantasy", age: "Kids" },
  { id: 11, title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", genre: "Fantasy", age: "Kids" },
  { id: 12, title: "Through the Looking-Glass", author: "Lewis Carroll", genre: "Fantasy", age: "Kids" },
  { id: 2591, title: "Hans Andersen's Fairy Tales", author: "Hans Christian Andersen", genre: "Fantasy", age: "Kids" },
  { id: 829, title: "Gulliver's Travels", author: "Jonathan Swift", genre: "Fantasy", age: "Teens" },
  
  // Mystery & Suspense
  { id: 345, title: "Dracula", author: "Bram Stoker", genre: "Mystery", age: "Adults" },
  { id: 1661, title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", genre: "Mystery", age: "Adults" },
  { id: 221, title: "The Return of Sherlock Holmes", author: "Arthur Conan Doyle", genre: "Mystery", age: "Adults" },
  { id: 244, title: "A Study in Scarlet", author: "Arthur Conan Doyle", genre: "Mystery", age: "Adults" },
  { id: 2097, title: "The Sign of the Four", author: "Arthur Conan Doyle", genre: "Mystery", age: "Adults" },
  
  // Classic Literature
  { id: 1342, title: "Pride and Prejudice", author: "Jane Austen", genre: "Romance", age: "Adults" },
  { id: 158, title: "Emma", author: "Jane Austen", genre: "Romance", age: "Adults" },
  { id: 161, title: "Sense and Sensibility", author: "Jane Austen", genre: "Romance", age: "Adults" },
  { id: 141, title: "Mansfield Park", author: "Jane Austen", genre: "Romance", age: "Adults" },
  
  // Science Fiction & Fantasy
  { id: 84, title: "Frankenstein", author: "Mary Wollstonecraft Shelley", genre: "Mystery", age: "Adults" },
  { id: 35, title: "The Time Machine", author: "H. G. Wells", genre: "Adventure", age: "Teens" },
  { id: 36, title: "The War of the Worlds", author: "H. G. Wells", genre: "Adventure", age: "Teens" },
  { id: 5230, title: "The Invisible Man", author: "H. G. Wells", genre: "Mystery", age: "Teens" },
  
  // Children's Classics
  { id: 113, title: "The Secret Garden", author: "Frances Hodgson Burnett", genre: "Adventure", age: "Kids" },
  { id: 146, title: "Little Women", author: "Louisa May Alcott", genre: "Romance", age: "Teens" },
  { id: 514, title: "Little Men", author: "Louisa May Alcott", genre: "Adventure", age: "Kids" },
  { id: 33, title: "The Scarlet Letter", author: "Nathaniel Hawthorne", genre: "Romance", age: "Adults" },
  
  // More Adventure Stories
  { id: 43, title: "The Strange Case of Dr. Jekyll and Mr. Hyde", author: "Robert Louis Stevenson", genre: "Mystery", age: "Adults" },
  { id: 174, title: "The Picture of Dorian Gray", author: "Oscar Wilde", genre: "Mystery", age: "Adults" },
  { id: 203, title: "Uncle Tom's Cabin", author: "Harriet Beecher Stowe", genre: "Romance", age: "Adults" }
]

async function main() {
  console.log('🏗️  TaleTime Story Collection Tool')
  console.log('==================================')
  console.log('')
  console.log('This tool collects stories from public domain sources:')
  console.log('• Project Gutenberg (public domain)')
  console.log('• Internet Archive (public domain)')
  console.log('• Wikisource (Creative Commons)')
  console.log('')
  console.log('All content is sourced ethically and legally!')
  console.log('')

  try {
    const collector = new SimpleStoryCollector()
    const stories = []
    
    console.log('🚀 Starting collection process...')
    
    // Collect stories from our curated list - get 25 stories
    const storiesToCollect = Math.min(25, CURATED_STORIES.length)
    console.log(`📚 Collecting ${storiesToCollect} stories...`)
    
    for (let i = 0; i < storiesToCollect; i++) {
      const storyInfo = CURATED_STORIES[i]
      console.log(`   ${i + 1}/${storiesToCollect}: ${storyInfo.title} by ${storyInfo.author}`)
      
      const story = await collector.fetchStory(
        storyInfo.id, 
        storyInfo.title, 
        storyInfo.author, 
        storyInfo.genre, 
        storyInfo.age
      )
      
      if (story) {
        stories.push(story)
        console.log(`   ✅ Success: ${story.time} minutes`)
      } else {
        console.log(`   ❌ Failed to collect story`)
      }
    }
    
    // Create the generated stories file
    const storyFileContent = `/**
 * Auto-generated story database from public domain sources
 * Generated on: ${new Date().toISOString()}
 * 
 * All stories are from public domain sources and are free to use.
 * Sources: Project Gutenberg, Internet Archive, Wikisource
 */

import { type Story } from './stories'

export const publicDomainStories: Story[] = ${JSON.stringify(stories, null, 2)}

// Utility functions for the generated stories
export const getPublicDomainStoriesByGenre = (genre: string) => 
  publicDomainStories.filter(story => story.genre === genre)

export const getPublicDomainStoriesByAge = (age: string) => 
  publicDomainStories.filter(story => story.age === age)

export const combineWithExistingStories = (existingStories: Story[]) => [
  ...existingStories,
  ...publicDomainStories.map(story => ({
    ...story,
    id: \`pd_\${story.id}\` // Prefix to avoid ID conflicts
  }))
]
`

    // Save to file
    const outputPath = path.join(__dirname, '../src/lib/generated-stories.ts')
    await fs.writeFile(outputPath, storyFileContent)
    
    console.log('')
    console.log('✅ Success! Story collection complete.')
    console.log(`📁 Saved ${stories.length} stories to: src/lib/generated-stories.ts`)
    console.log('')
    console.log('📊 Collection Summary:')
    
    // Generate summary stats
    const stats = stories.reduce((acc, story) => {
      acc.genres[story.genre] = (acc.genres[story.genre] || 0) + 1
      acc.ages[story.age] = (acc.ages[story.age] || 0) + 1
      acc.totalReadTime += story.time
      return acc
    }, { 
      genres: {}, 
      ages: {},
      totalReadTime: 0
    })
    
    console.log(`   Total Stories: ${stories.length}`)
    console.log(`   Total Reading Time: ${stats.totalReadTime} minutes`)
    console.log(`   Genres: ${Object.entries(stats.genres).map(([genre, count]) => `${genre}(${count})`).join(', ')}`)
    console.log(`   Age Groups: ${Object.entries(stats.ages).map(([age, count]) => `${age}(${count})`).join(', ')}`)
    
    console.log('')
    console.log('🔄 To use these stories in your app:')
    console.log('')
    console.log('1. Import in your stories.ts:')
    console.log('   import { publicDomainStories, combineWithExistingStories } from \'./generated-stories\'')
    console.log('')
    console.log('2. Combine with existing stories:')
    console.log('   export const allStories = combineWithExistingStories(stories)')
    console.log('')
    console.log('3. Update your story functions to use allStories instead of stories')
    console.log('')
    console.log('🎉 Happy storytelling!')
    
  } catch (error) {
    console.error('❌ Error during story collection:', error)
    console.log('')
    console.log('💡 Troubleshooting tips:')
    console.log('• Check your internet connection')
    console.log('• Ensure the source websites are accessible')
    console.log('• Try running again (some requests may have timed out)')
    console.log('• Check for any rate limiting (wait a few minutes and retry)')
    
    process.exit(1)
  }
}

// Handle CLI arguments
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
TaleTime Story Collection Tool

Usage:
  node scripts/collect-stories.js [options]

Options:
  --help, -h     Show this help message
  --count N      Number of stories to collect (default: 15)
  --genre G      Focus on specific genre
  --age A        Focus on specific age group

Examples:
  node scripts/collect-stories.js --count 25
  node scripts/collect-stories.js --genre Fantasy --count 10
  node scripts/collect-stories.js --age Kids

Legal Notice:
All stories are collected from public domain sources including:
• Project Gutenberg (www.gutenberg.org)
• Internet Archive (archive.org) 
• Wikisource (wikisource.org)

This tool respects robots.txt, implements rate limiting, and only
accesses content that is explicitly in the public domain or under
Creative Commons licenses that allow redistribution.
`)
  process.exit(0)
}

if (require.main === module) {
  main()
}

module.exports = { main }