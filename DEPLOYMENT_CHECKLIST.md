# Wireframe Feature Deployment Checklist

## Pre-Deployment

### Database Setup
- [ ] Run migration: `database/migrations/add-wireframe-columns.sql`
- [ ] Verify columns exist: `wireframe_url`, `wireframe_metadata` in `prd_sections`
- [ ] Run storage setup: `database/schema/wireframes-storage-bucket.sql`
- [ ] Verify bucket exists in Supabase Storage UI
- [ ] Test bucket RLS policies with authenticated user

### Environment Variables
- [ ] Verify `OPENAI_API_KEY` is set (backend)
- [ ] Verify API key has GPT-4 Vision access (test in OpenAI playground)
- [ ] Verify `VITE_SUPABASE_URL` is set (frontend)
- [ ] Verify `VITE_SUPABASE_ANON_KEY` is set (frontend)
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set (backend)

### Code Verification
- [ ] Frontend build passes: `npm run build` ✅ (Already verified)
- [ ] Backend has no import errors
- [ ] All linter errors resolved ✅ (Already verified)
- [ ] TypeScript types compile ✅ (Already verified)

## Deployment Steps

### Backend Deployment
- [ ] Deploy `server/services/wireframe-analysis-service.js`
- [ ] Deploy updated `server/index.js` with new endpoints
- [ ] Restart backend service
- [ ] Verify backend health endpoint responds
- [ ] Test `/api/prd/generate-requirements-from-wireframe` endpoint (use Postman/curl)
- [ ] Test `/api/prd/regenerate-requirements-from-wireframe` endpoint

### Frontend Deployment
- [ ] Build frontend: `npm run build`
- [ ] Deploy `dist/` to hosting (Vercel/Railway/etc.)
- [ ] Verify frontend loads
- [ ] Check browser console for errors
- [ ] Verify Supabase client connection

## Post-Deployment Testing

### Upload Flow Testing
- [ ] Navigate to `/prd/new`
- [ ] See "Upload Wireframe" section in Step 3
- [ ] Upload PNG wireframe (should succeed)
- [ ] Upload JPG wireframe (should succeed)
- [ ] Upload PDF wireframe (should succeed)
- [ ] Upload 15MB file (should fail with error)
- [ ] Upload .txt file (should fail with error)
- [ ] Drag-and-drop upload (should work)
- [ ] Remove uploaded wireframe (should work)
- [ ] Verify preview thumbnail displays

### Generation Flow Testing - New PRD
- [ ] Upload wireframe in Step 3
- [ ] Proceed to Step 4 (Requirements)
- [ ] See wireframe preview card
- [ ] Click "Generate Requirements from Wireframe"
- [ ] See loading spinner for 10-30 seconds
- [ ] Requirements populate in textarea
- [ ] Toast shows confidence score
- [ ] Verify format: "**4. Requirements**\n\n### A. Functional Requirements..."
- [ ] Edit generated requirements (should work)
- [ ] Auto-save persists changes (wait 2 seconds)
- [ ] Complete PRD creation
- [ ] View saved PRD (should show requirements)

### Generation Flow Testing - Edit Existing PRD
- [ ] Open existing PRD at `/prd/{id}`
- [ ] Click "Edit" button
- [ ] Click edit icon on Requirements section
- [ ] See two tabs: "Manual Edit" | "Generate from Wireframe"
- [ ] Switch to "Generate from Wireframe" tab
- [ ] Upload wireframe
- [ ] Click "Generate Requirements"
- [ ] See loading spinner
- [ ] Generated content appears with confidence badge
- [ ] Click "Replace All" (should replace existing requirements)
- [ ] Repeat: Upload → Generate → Click "Insert Below" (should append)
- [ ] Repeat: Upload → Generate → Click "Cancel" (should discard)
- [ ] Click "Save" (should persist changes)

### Error Handling Testing
- [ ] Upload with no internet (should show error)
- [ ] Generate with invalid API key (should show error)
- [ ] Upload blurry wireframe (should generate with low confidence)
- [ ] Generate with empty context (should still work)
- [ ] Cancel mid-generation (should abort gracefully)

### Edge Cases Testing
- [ ] Multiple consecutive uploads (should replace previous)
- [ ] Multiple consecutive generations (should work)
- [ ] Navigate away mid-upload (should cleanup)
- [ ] Navigate away mid-generation (should abort)
- [ ] Upload in both PRD creation and edit flows (both should work)

## Monitoring

### Immediate (First Hour)
- [ ] Check backend logs for errors
- [ ] Check frontend console for errors
- [ ] Monitor OpenAI API usage
- [ ] Monitor Supabase Storage usage
- [ ] Test on mobile device
- [ ] Test on different browsers (Chrome, Firefox, Safari)

### First Day
- [ ] Review 10+ wireframe generations
- [ ] Check average confidence scores
- [ ] Verify costs align with estimates (~$0.10-0.30 per generation)
- [ ] Monitor user feedback
- [ ] Check error rates

### First Week
- [ ] Review analytics data
- [ ] Identify common error patterns
- [ ] Measure feature adoption rate
- [ ] Assess confidence score distribution
- [ ] Review generated requirements quality

## Analytics Setup (Optional)

- [ ] Install PostHog/Mixpanel
- [ ] Update `src/lib/analytics.ts` with provider code
- [ ] Set `VITE_ENABLE_ANALYTICS=true`
- [ ] Test events fire correctly:
  - `wireframe_uploaded`
  - `wireframe_removed`
  - `wireframe_generation_started`
  - `requirements_generated`
  - `wireframe_generation_failed`
- [ ] Set up dashboard for key metrics

## Rollback Plan

If critical issues arise:

### Quick Rollback (Frontend Only)
```bash
# Revert to previous frontend version
# The feature is optional, so PRDs still work without it
```

### Full Rollback (Backend + Frontend)
```bash
# Revert backend
git revert <commit-hash>

# Revert frontend
git revert <commit-hash>

# Database cleanup (optional - columns are nullable)
ALTER TABLE prd_sections DROP COLUMN wireframe_url;
ALTER TABLE prd_sections DROP COLUMN wireframe_metadata;
```

## Success Metrics

After 1 week, verify:
- [ ] ≥5 wireframes uploaded
- [ ] ≥3 requirements generated successfully
- [ ] Average confidence score ≥60%
- [ ] Error rate <10%
- [ ] No critical bugs reported
- [ ] Positive user feedback

## Known Limitations

Document for users:
- Max file size: 10MB
- Supported formats: PNG, JPG, PDF only
- Generation time: 10-45 seconds depending on complexity
- Best results with clear, annotated wireframes
- Requires good context (objective/background/scope)

## Support Resources

For issues, refer users to:
1. `WIREFRAME_QUICKSTART.md` - Quick start guide
2. `docs/WIREFRAME_SETUP.md` - Detailed setup instructions
3. `WIREFRAME_FEATURE.md` - Complete feature documentation
4. Browser console logs for debugging
5. Backend logs for API errors

## Final Sign-Off

- [ ] All checklist items completed
- [ ] Feature tested in production
- [ ] Monitoring in place
- [ ] Documentation accessible
- [ ] Team trained on support process

**Deployed by**: _________________  
**Date**: _________________  
**Version**: _________________

---

**Status**: Ready for deployment ✅

