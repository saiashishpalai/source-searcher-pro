# Low-Level Design (Updated 2025-10)

## Google Drive Incremental Sync
- Filter: `modifiedTime > last_sync_at - 7 days`
- Hash check: `file.md5Checksum` vs `documents.content_hash`
- Force reprocess PDFs with prior placeholder content
- Pagination: newest-first; stop at `MAX_DOCUMENTS = 200`
- Batching: 5 files concurrently; update `sync_metadata.files_processed`
- Store results: upsert `documents` (content, hash, last_modified_at, sync_status)

## PDF Parser
- Module: `server/services/pdf-parser.js`
- Cache key: `fileId:md5`
- Timeout: 30s; Max size: 10MB
- Outcomes:
  - Parsed text + pages
  - No extractable text → `pdfParsed=false` (not error)
  - Password/too-large/unsupported → `parseSkipped=true` with reason

## Skip vs Error Policy
- Unsupported mime types (images, videos, archives, forms, folders) → skipped
- Google Sheets/Slides export 403 → skipped (permissions)
- Network/unknown exceptions → error with `sync_error` message

## Tables
- `sync_metadata(user_id, source_type, last_sync_at, last_full_sync_at, status, files_processed, files_skipped, files_errored, started_at, completed_at)`
- `documents` adds `content_hash`, `sync_status`, `sync_error`, `is_deleted`
- Indexes: `(user_id, source_type, content_hash)` and `(user_id, source_type, last_modified_at desc)`

## API Contracts
- `POST /api/sync/google-drive` ⇒ `{ syncType, processed, skipped, newFiles, updatedFiles, unchangedFiles, errors, totalDocuments, totalChunks, duration }`
- `GET /api/sync/status` ⇒ per-source counts; Drive progress uses `files_processed`

## UI Bindings
- Progress: `(files_processed / 200)`
- KPIs: Files (total in run), Updated, Unchanged, Efficiency `processed/(processed+skipped+errors)`
