import { Navigation } from '@/components/Navigation';
import { BookGrid } from '@/components/BookGrid';

export default async function Home() {
  // Fetch children's books from database
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const catalogUrl = `${baseUrl}/api/catalog?page=1`;

  let books = [];
  let error = null;

  try {
    const response = await fetch(catalogUrl, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      books = data.results;
    } else {
      error = `Failed to fetch catalog: ${response.status}`;
    }
  } catch (e) {
    error = `Error fetching catalog: ${e}`;
    console.error('Catalog fetch error:', e);
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
              Project Gutenberg Bedtime Reader
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Browse classic children's books with reading-time estimates. 
              Download and read EPUBs offline with your personalized reading preferences.
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
              <p className="text-red-800 dark:text-red-200 font-semibold">
                {error}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                Please make sure the server is running and try again.
              </p>
            </div>
          )}

          {/* Books Grid */}
          {!error && books.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                Children's Books
              </h2>
              <BookGrid initialBooks={books} />
            </div>
          )}

          {/* Empty State */}
          {!error && books.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No books found. Try adjusting your search criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
