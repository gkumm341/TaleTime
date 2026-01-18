# Local Book Metadata (`metadata.json`)

When using `CONTENT_MODE=local`, TaleTime reads local text files from `.data/texts/by-title/<Title>/`.

This repo supports a standardized per-book metadata file:

- Path: `.data/texts/by-title/<Title>/metadata.json`
- Schema: `docs/local-book-metadata.schema.json`

## Goals

- Keep bibliographic info close to the local files.
- Make file availability explicit (full/bedtime/audio/image).
- Ensure a stable, machine-readable format.

## Format (Schema v1)

Top-level keys:

- `schemaVersion` (number) – currently `1`.
- `generatedAt` (ISO string) – when the generator last wrote the file.
- `book` (object) – bibliographic fields primarily from SQLite (`books`, `estimates`).
- `local` (object) – local folder + file inventory.
- `custom` (object, optional) – free-form user fields; preserved on regeneration.

### `book`

- `id`: TaleTime/DB id (`books.id`) or `null` if unknown.
- `title`: display title.
- `authors`: array of author strings.
- `languages`: array of language codes/labels.
- `subjects`: array of subject strings.
- `downloadCount`: value from DB if present.
- `updatedAt`: DB `updated_at` if present.
- `links`: `{ txtUrl, epubUrl, coverUrl }` from DB if present.
- `estimate`: `{ minutes, words, wpm, source, computedAt }` from `estimates` if present.
- `source`: `{ kind, externalId }` (best-effort).

### `local`

- `layout`: currently always `by-title`.
- `folderName`: the folder name under `by-title`.
- `relativeDir`: repo-relative directory.
- `files`: inventory of known files (text variants, images, audio, etc), each with:
  - `role`: `full | bedtime | image | audio | other`
  - `filename`: basename within the folder
  - `bytes`: file size if present
  - `sha256`: SHA-256 hash if computed

## Generator

Use:

- `node scripts/generate-local-metadata.mjs`

The generator:

- scans `.data/texts/by-title/*/`
- reads file inventory
- matches folders to DB titles
- writes `metadata.json` for each folder
- preserves any existing `custom` object
