# Testing OG Images

## Quick Testing Options

### ✅ Option 1: Test OG Image Endpoints Directly (After Deployment)
Once deployed (even on a preview branch), you can test the OG images directly:

1. **Landing Page OG Image:**
   ```
   https://source-searcher-pro.vercel.app/api/og-landing
   ```
   Or on preview deployment:
   ```
   https://source-searcher-pro-git-[branch]-[your-username].vercel.app/api/og-landing
   ```

2. **Waitlist Page OG Image:**
   ```
   https://source-searcher-pro.vercel.app/api/og-waitlist
   ```

Simply open these URLs in your browser to see the generated images!

### ✅ Option 2: Use Vercel Preview Deployments
Vercel automatically creates preview deployments for every PR:

1. **Create a PR** to any branch (even main)
2. **Find the preview URL** in the Vercel dashboard or PR comment
3. **Test the OG images** at:
   - `https://[preview-url]/api/og-landing`
   - `https://[preview-url]/api/og-waitlist`
4. **Test in Post Inspector** using the preview URL:
   - `https://[preview-url]/` (landing page)
   - `https://[preview-url]/waitlist` (waitlist page)

### ✅ Option 3: Deploy to Main
Once merged to main and deployed:

1. **Test OG images:**
   - `https://source-searcher-pro.vercel.app/api/og-landing`
   - `https://source-searcher-pro.vercel.app/api/og-waitlist`

2. **Test in LinkedIn Post Inspector:**
   - Go to: https://www.linkedin.com/post-inspector/
   - Enter: `https://source-searcher-pro.vercel.app/`
   - Enter: `https://source-searcher-pro.vercel.app/waitlist`

3. **Test in other platforms:**
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## Local Testing (Development)

⚠️ **Note:** OG images require Vercel's Edge Runtime, so they won't work with `npm run dev`. However, you can:

1. **Review the code** in `/api/og-landing.tsx` and `/api/og-waitlist.tsx`
2. **Test the visual design** by checking the styling matches your design system
3. **Deploy to a preview** to test the actual generation

## Troubleshooting

### OG Image Not Loading
- Check that the API routes are deployed correctly
- Verify `vercel.json` includes the `/api/(.*)` route
- Check Vercel function logs for errors

### Preview Not Showing Correct Image
- Clear cache in Post Inspector (there's usually a "Clear" or "Refresh" button)
- Wait a few minutes for changes to propagate
- Verify the meta tags are correct in the page source

### Image Looks Different Than Expected
- Check browser console for any rendering errors
- Verify the colors match Haven7's design system
- Test the endpoint directly in browser first

