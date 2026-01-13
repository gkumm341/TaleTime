import ContinueReading from '@/components/ContinueReading';

export default function ContinuePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-start p-8">
      <div className="w-full max-w-2xl">
        <ContinueReading />
      </div>
    </div>
  );
}
