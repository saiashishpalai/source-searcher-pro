# Open Graph (OG) Images Guide

This guide explains how Open Graph images are generated for social media link previews.

## Dynamic OG Image Generation

Haven7 uses **dynamic OG image generation** powered by Vercel's `@vercel/og` package. Images are automatically generated server-side and match Haven7's design system perfectly.

## Image Endpoints

The OG images are generated at these API endpoints:

1. **`/api/og-landing`** - For the landing page (https://source-searcher-pro.vercel.app/)
2. **`/api/og-waitlist`** - For the waitlist page (https://source-searcher-pro.vercel.app/waitlist)

These endpoints return dynamically generated images in real-time with Haven7 branding.

## Image Specifications

### Technical Requirements
- **Dimensions**: 1200 x 630 pixels (optimal for all social platforms)
- **Format**: PNG (generated automatically)
- **Aspect Ratio**: 1.91:1
- **Runtime**: Edge Runtime (fast generation)

### Design System

The OG images automatically use Haven7's design system:
- **Background**: Black (#000000) with radial gradients
- **Brand Colors**: 
  - Purple: rgba(139, 92, 246, 0.3) - Primary accent
  - Fuchsia: rgba(236, 72, 153, 0.2) - Secondary accent
- **Typography**: Bold, modern fonts with high contrast
- **Layout**: Centered content with decorative gradient blurs

#### Landing Page Design (`/api/og-landing`)
- Haven7 branding at the top
- Main headline: "Search Your Work Knowledge in Seconds"
- Subheading: "AI-powered search across Slack, Google Drive, and Notion"
- Purple and fuchsia gradient blurs for visual depth

#### Waitlist Page Design (`/api/og-waitlist`)
- Haven7 branding at the top
- Headline: "Join Haven7 Waitlist"
- Subheading about early access benefits
- Call-to-action badge with gradient styling
- Matching purple and fuchsia gradient accents

## Testing Your OG Images

After adding images, test them using:

1. **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
3. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
4. **Open Graph Preview**: https://www.opengraph.xyz/

Enter your URLs:
- `https://source-searcher-pro.vercel.app/`
- `https://source-searcher-pro.vercel.app/waitlist`

## Deployment

The OG images are automatically generated on Vercel when you deploy. No manual image creation needed!

The images are available at:
- `https://source-searcher-pro.vercel.app/api/og-landing`
- `https://source-searcher-pro.vercel.app/api/og-waitlist`

## Customization

To customize the OG images, edit these files:
- `/api/og-landing.tsx` - Landing page OG image
- `/api/og-waitlist.tsx` - Waitlist page OG image

You can modify:
- Colors and gradients
- Text content
- Layout and spacing
- Decorative elements

## Current Setup

The SEO component in `src/components/SEO.tsx` automatically handles:
- Dynamic meta tags per page
- Open Graph tags (Facebook, LinkedIn)
- Twitter Card tags
- Proper URL and image URLs pointing to the API endpoints

Everything is fully automated and matches Haven7's design system!

