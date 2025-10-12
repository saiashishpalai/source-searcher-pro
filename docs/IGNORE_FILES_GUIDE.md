# Ignore Files Guide

This guide explains the `.gitignore` and `.cursorignore` files organization.

---

## 📁 Files Created

### `.gitignore`
Controls which files are **not tracked** by Git (not committed to the repository).

### `.cursorignore`  
Controls which files Cursor AI should **not index** when analyzing your codebase.

---

## 🎯 What Gets Ignored

### ✅ Now Ignored by Git

#### Build Artifacts
- `node_modules/` - Dependencies (can be reinstalled)
- `dist/`, `dist-ssr/`, `build/` - Production builds
- `.next/` - Next.js build cache (95 files removed from git)
- `*.tsbuildinfo` - TypeScript build info

#### Environment & Secrets
- `.env`, `.env.local`, `.env.*.local` - Environment variables
- `.env.local.backup` - Backup files

#### Logs & Temporary Files
- `*.log`, `frontend.log`, `server.log` - Log files
- `tmp/`, `temp/`, `*.tmp`, `*.temp` - Temporary files
- `temp_fix.txt`, `*.bak`, `*.backup` - Backup files

#### Editor & OS Files
- `.cursor/` - Cursor IDE settings
- `.DS_Store`, `Thumbs.db` - OS generated files
- `.vscode/` (except extensions.json)
- `.idea/` - JetBrains IDE

#### Cache Directories
- `.cache/`, `.parcel-cache/`, `.vite/`
- `.turbo/`, `.vercel/`
- `.supabase/` - Local Supabase

---

## 📊 Statistics

### Files Removed from Git Tracking
- **95 files** from `.next/` folder
- Saved ~15,000 lines of unnecessary tracked changes
- Reduced repository size significantly

### Impact
- ✅ Cleaner git history
- ✅ Faster commits and pushes
- ✅ Better Cursor AI performance (with .cursorignore)
- ✅ No more accidental commits of build files

---

## 🔧 .gitignore Sections

```
1. Dependencies          - node_modules, etc.
2. Build outputs         - dist, .next, build
3. Environment variables - .env files
4. Logs                  - *.log files
5. Editor files          - .vscode, .idea, .cursor
6. Testing               - coverage, test outputs
7. Temporary files       - tmp, temp, backups
8. OS generated          - .DS_Store, Thumbs.db
9. Package managers      - lock files (commented)
10. Local development    - *.local, caches
11. Supabase local       - .supabase/
12. Misc                 - .vercel, .turbo
```

---

## 🎨 .cursorignore Sections

Similar to `.gitignore` but also includes:

- Binary and media files (images, videos, fonts)
- Minified files (*.min.js, *.bundle.js)
- Large lock files (to speed up indexing)
- Documentation (optional - currently enabled)

**Purpose**: Makes Cursor AI faster by only indexing relevant source code.

---

## 💡 Best Practices

### ✅ Do Ignore
- Build artifacts
- Dependencies (node_modules)
- Environment files
- Logs and temporary files
- Editor-specific files
- OS-generated files

### ❌ Don't Ignore
- Source code (src/, server/)
- Configuration files (package.json, tsconfig.json)
- Documentation (README.md, docs/)
- Database schemas (database/)
- Lock files (for consistency)*

*Lock files are currently **not ignored** to ensure consistent dependency versions across team.

---

## 🔄 Lock Files

Currently **tracked** (committed):
- `package-lock.json`
- `yarn.lock`
- `pnpm-lock.yaml`
- `bun.lockb`

**Why?** Ensures everyone has the same dependency versions.

**To ignore them:** Uncomment the lines in `.gitignore`:
```gitignore
# Uncomment to ignore lock files
package-lock.json
yarn.lock
```

---

## 🚀 Verification

### Check what's ignored:
```bash
git status --ignored
```

### Check what Cursor indexes:
- Open Cursor AI
- Check if response times improved
- Verify it's not reading build files

### After pulling these changes:
```bash
# Clean up any local .next files
rm -rf .next/

# Rebuild if needed
npm run dev
```

---

## 📝 Notes

- **96 files changed** in commit `98334de`
- `.next/` folder will be regenerated when you run `npm run dev`
- Changes are automatically active for all team members who pull
- Cursor AI will automatically respect `.cursorignore`

---

## 🔗 Related Files

- [.gitignore](../.gitignore) - Git ignore rules
- [.cursorignore](../.cursorignore) - Cursor AI ignore rules
- [Project Organization](./ORGANIZATION_SUMMARY.md) - Overall project structure

---

*Last updated: October 12, 2025*

