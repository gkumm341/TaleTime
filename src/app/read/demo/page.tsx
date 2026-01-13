import BookFlip from "@/components/BookFlip";

export default function DemoReaderPage() {
  const pages = [
    {
      id: "p1",
      title: "Chapter 1",
      imageSrc: "/demo/forest.jpg",
      text:
        "Once upon a time, a brother and sister lived near a great forest...\n\n" +
        "This is placeholder text. Replace it with your story content.",
    },
    {
      id: "p2",
      title: "Chapter 2",
      imageSrc: "/demo/cottage.jpg",
      text:
        "They followed a path of crumbs—until the birds found them first...\n\n" +
        "Add more pages as needed.",
    },
    {
      id: "p3",
      title: "Chapter 3",
      imageSrc: "/demo/candy.jpg",
      text:
        "Deep in the woods stood a cottage that smelled like sugar and spice...\n\n" +
        "This is just example content.",
    },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 p-6">
      <BookFlip
        appName="TaleTime"
        storyTitle="Hansel & Gretel (Demo)"
        author="Public Domain (retelling)"
        coverImageSrc="/demo/cover.jpg"
        pages={pages}
      />
    </main>
  );
}
