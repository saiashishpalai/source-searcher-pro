import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          backgroundImage: 'radial-gradient(circle at top left, rgba(139, 92, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.2) 0%, transparent 50%)',
        }}
      >
        {/* Logo/Brand Name */}
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 40,
            letterSpacing: '-0.02em',
          }}
        >
          Haven7
        </div>

        {/* Main Headline */}
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: 'center',
            maxWidth: '1000px',
            marginBottom: 32,
            lineHeight: 1.2,
            paddingLeft: 60,
            paddingRight: 60,
          }}
        >
          Search Your Work Knowledge in Seconds
        </div>

        {/* Subheadline */}
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: '#D1D5DB',
            textAlign: 'center',
            maxWidth: '900px',
            paddingLeft: 60,
            paddingRight: 60,
            lineHeight: 1.5,
          }}
        >
          AI-powered search across Slack, Google Drive, and Notion
        </div>

        {/* Decorative Elements */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            right: 100,
            width: 250,
            height: 250,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
  } catch (error: any) {
    return new Response(`Failed to generate image: ${error.message}`, { status: 500 });
  }
}

