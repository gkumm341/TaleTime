import ContinueBookmarked from '@/components/ContinueBookmarked';

export default function ContinuePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl">
        <ContinueBookmarked />
      </div>
    </div>
  );
}
