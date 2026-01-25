# Local Text Mode

This project can run without fetching books from Gutenberg / Standard Ebooks by reading `.txt` files from disk.

## Enable local mode

In `.env.local`:

- `CONTENT_MODE=local`
- `NEXT_PUBLIC_CONTENT_MODE=local`
- `LOCAL_TEXT_DIR=.data/texts`

## Where to put text files

Place text files under the directory configured by `LOCAL_TEXT_DIR`.

## Structured story JSON (recommended)

In addition to plain `.txt`, TaleTime supports a structured “blocks” format:

- `.data/texts/by-title/<Title>/bedtime.story.json`
- `.data/texts/by-title/<Title>/full.story.json`

This format removes ambiguity around paragraphs vs. hard line-wrapping and makes it easy to add images, headings, and scene breaks.

Example:

```json
{
  "version": 1,
  "title": "Alice’s Adventures in Wonderland",
  "author": "Lewis Carroll",
  "blocks": [
    { "type": "paragraph", "text": "One warm afternoon…" },
    { "type": "image", "src": "1.png", "alt": "Alice by the river" },
    { "type": "sceneBreak" },
    { "type": "heading", "text": "CHAPTER I", "level": 2 }
  ]
}
```

Supported block types:

- `paragraph`: `{ "type": "paragraph", "text": "..." }`
- `image`: `{ "type": "image", "src": "1.png", "alt": "..." }`
- `sceneBreak`: `{ "type": "sceneBreak" }`
- `heading`: `{ "type": "heading", "text": "...", "level": 1|2|3 }`

Notes:

- `image.src` should be a filename like `image1.png` (avoid absolute paths like `C:\\...`). The app resolves it from the book’s `Illustrations/` folder via `/api/illustration`.
- The reader currently converts JSON blocks into the existing placeholder format (e.g. `{{1.png}}`) internally, so it stays compatible with the current rendering and image endpoints.

## Paginated story JSON (page-locked)

If you want full control over page and paragraph breaks, use the paginated JSON format. Each page becomes exactly one rendered page (no auto-pagination).

Files:

- `.data/texts/by-title/<Title>/full.pages.json`
- `.data/texts/by-title/<Title>/bedtime.pages.json`

Example:

```json
{
  "version": 1,
  "title": "The Secret Garden",
  "author": "Frances Hodgson Burnett",
  "pages": [
    {
      "id": "p1",
      "title": "Chapter 1",
      "paragraphs": [
        "When Mary Lennox was sent to Misselthwaite Manor to live with her uncle...",
        "She had been born in India and had always been ill in one way or another."
      ]
    },
    {
      "id": "p2",
      "paragraphs": [
        "The house was big, and the wind moaned around the corners."
      ],
      "image": "garden-1.png"
    }
  ]
}
```

Notes:

- Use `paragraphs` for exact paragraph breaks (or `text` if you prefer). Paragraphs are joined with a blank line internally.
- `image` (or `imageSrc`) can be a filename. It’s resolved from the book’s `Illustrations/` folder via `/api/illustration`.
- Inline image placeholders like `{{garden-1.png}}` still work inside `text`.

Preferred (drop files into folders by book title):

- `.data/texts/by-title/<Title>/full.txt`
- `.data/texts/by-title/<Title>/bedtime.txt`

You can also use the structured JSON variants in the same folder:

- `.data/texts/by-title/<Title>/full.story.json`
- `.data/texts/by-title/<Title>/bedtime.story.json`
- `.data/texts/by-title/<Title>/full.pages.json`
- `.data/texts/by-title/<Title>/bedtime.pages.json`

Default:

- `.data/texts/<bookId>/full.txt`
- `.data/texts/<bookId>/bedtime.txt`

Alternative (bedtime files by title):

- `.data/texts/bookBedtime/<Title> (Bedtime).txt`
- `.data/texts/bookBedtime/<Title>.txt`

Notes:

- The title comes from the `books.title` field in the SQLite DB.
- If the DB title ends with a parenthetical (e.g. `Peter Pan (Peter and Wendy)`), the app will also try the version without the parenthetical.
- Folder matching is case-insensitive and ignores most punctuation (Windows-safe).

## How selection works

- If the user picked “Bedtime”:
  - the app loads `bedtime.txt` (fallback: `full.txt`)
- If the user picked “Full version”:
  - the app loads `full.txt`

## Lookup precedence

When `CONTENT_MODE=local`, the server resolves files in this order:

1. `by-title/<Title>/bedtime.txt|full.txt`
2. `<bookId>/bedtime.txt|full.txt`
3. (Legacy) `bookBedtime/<Title> (Bedtime).txt`

## Remote mode (kept for later)

All the existing remote-fetch logic remains in the repo, but when `CONTENT_MODE=local` it is not executed.
