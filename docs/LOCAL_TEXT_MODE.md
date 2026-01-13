# Local Text Mode

This project can run without fetching books from Gutenberg / Standard Ebooks by reading `.txt` files from disk.

## Enable local mode

In `.env.local`:

- `CONTENT_MODE=local`
- `NEXT_PUBLIC_CONTENT_MODE=local`
- `LOCAL_TEXT_DIR=.data/texts`

## Where to put text files

Place text files under the directory configured by `LOCAL_TEXT_DIR`.

Preferred (drop files into folders by book title):

- `.data/texts/by-title/<Title>/full.txt`
- `.data/texts/by-title/<Title>/bedtime.txt`

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
