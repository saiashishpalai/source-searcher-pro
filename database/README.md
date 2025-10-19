# Database Files

This directory contains all database-related SQL files, organized by purpose.

## 📂 Directory Structure

```
database/
├── schema/                 # Database schema definitions
├── migrations/             # Database migrations (version updates)
├── fixes/                  # Bug fixes and patches
└── debug/                  # Debugging and diagnostic queries
```

## 📁 Folder Details

### 🏗️ schema/
**Purpose**: Base schema definitions and table structures

- `supabase-schema.sql` - Main Supabase database schema
- `user-connections-schema.sql` - User connections table schema

**When to use**: Setting up a new database or understanding the core structure

---

### 🔄 migrations/
**Purpose**: Database version updates and structural changes

- `database-migration.sql` - General database migration
- `profile-fields-migration.sql` - User profile fields updates
- `database-search-threads.sql` - Search threads feature migration
- `rag-vector-search.sql` - RAG vector search implementation
- `version-linking-schema.sql` - TF-IDF content fingerprinting and version linking

**When to use**: Updating existing databases with new features

---

### 🔧 fixes/
**Purpose**: Bug fixes, performance improvements, and security patches

#### OAuth & Authentication Fixes
- `database-fix-oauth.sql` - OAuth integration fixes
- `database-schema-fix.sql` - General schema corrections

#### Performance Fixes
- `supabase-performance-fixes.sql` - Initial performance optimizations
- `supabase-performance-fixes-corrected.sql` - Corrected performance fixes
- `supabase-performance-fixes-final.sql` - Final performance improvements

#### Security & Policy Fixes
- `supabase-security-fixes.sql` - Security enhancements
- `supabase-rls-policy-fix.sql` - Row Level Security (RLS) policy fixes
- `supabase-final-warnings-fix.sql` - Supabase warning resolutions

#### Storage & Comprehensive Fixes
- `fix-storage-bucket.sql` - Storage bucket configuration
- `supabase-definitive-fix.sql` - Comprehensive fix bundle

**When to use**: Troubleshooting or applying patches to existing installations

---

### 🐛 debug/
**Purpose**: Diagnostic queries and debugging tools

- `check-storage.sql` - Storage bucket diagnostics
- `debug-profile-avatar.sql` - Profile avatar debugging queries

**When to use**: Investigating issues or verifying database state

---

## 🚀 Recommended Execution Order

### For New Setup:
1. **Schema files** (`schema/`) - Create base tables
2. **Migrations** (`migrations/`) - Apply feature updates
3. **Fixes** (`fixes/`) - Apply latest patches (if needed)

### For Existing Installation:
1. Check current state with **Debug queries** (`debug/`)
2. Apply relevant **Fixes** (`fixes/`)
3. Run new **Migrations** (`migrations/`) as needed

### For Troubleshooting:
1. Run **Debug queries** (`debug/`) to identify issues
2. Apply specific **Fixes** (`fixes/`) that address the problem

---

## ⚠️ Important Notes

- Always backup your database before running any SQL files
- Review SQL contents before execution to understand changes
- Some fix files may supersede others (e.g., `*-final.sql` files)
- Test on a development database first when possible

---

## 📊 File Count

- **Schema**: 2 files
- **Migrations**: 5 files
- **Fixes**: 10 files
- **Debug**: 2 files
- **Total**: 19 SQL files

Last updated: October 12, 2025

