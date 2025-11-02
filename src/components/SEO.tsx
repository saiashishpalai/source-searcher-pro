import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEO = ({
  title = 'Haven7 - Search Your Work Knowledge in Seconds',
  description = 'AI-powered search across Slack, Google Drive, and Notion. Find what you need without switching apps.',
  image = 'https://source-searcher-pro.vercel.app/og-image.png',
  url = 'https://source-searcher-pro.vercel.app',
  type = 'website',
}: SEOProps) => {
  const fullUrl = url.startsWith('http') ? url : `https://source-searcher-pro.vercel.app${url}`;
  const fullImageUrl = image.startsWith('http') ? image : `https://source-searcher-pro.vercel.app${image}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Haven7" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#000000" />
    </Helmet>
  );
};

export default SEO;
