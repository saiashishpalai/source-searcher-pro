# WhatsApp Link Preview Fix

## The Problem
Your images are **1.9MB each** but WhatsApp requires images to be **under 300KB**.

## Solution: Optimize Images

You need to compress your images. Here are options:

### Option 1: Use Online Tools (Easiest)
1. Go to https://tinypng.com/ or https://squoosh.app/
2. Upload `main_preview.png` and `wailist_preview.png`
3. Download optimized versions (should be under 300KB)
4. Replace the files in `/public/`

### Option 2: Use ImageMagick (Command Line)
```bash
# Install ImageMagick first if needed
brew install imagemagick

# Optimize images
cd public/
convert main_preview.png -quality 85 -strip main_preview.png
convert wailist_preview.png -quality 85 -strip wailist_preview.png
```

### Option 3: Use Squoosh CLI
```bash
npm install -g @squoosh/cli
squoosh-cli --mozjpeg '{"quality":85}' -d public public/main_preview.png
squoosh-cli --mozjpeg '{"quality":85}' -d public public/wailist_preview.png
```

## After Optimizing

1. **Verify file sizes are under 300KB:**
   ```bash
   ls -lh public/*.png
   ```

2. **Push to Git:**
   ```bash
   git add public/*.png
   git commit -m "fix: Optimize OG images for WhatsApp (<300KB)"
   git push
   ```

3. **Wait for Vercel to deploy**

4. **Test in WhatsApp:**
   - Send the link to yourself in WhatsApp
   - Clear WhatsApp cache if needed (Settings > Storage > Clear Cache)
   - The preview should appear

## Additional WhatsApp Requirements Met:
✅ Image format: PNG (supported)  
✅ Image dimensions: 1200x630 (optimal)  
✅ Meta tags: All required OG tags present  
✅ Public URL: Images accessible directly  
⚠️ Image size: MUST be under 300KB (currently 1.9MB - TOO LARGE)

