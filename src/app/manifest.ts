import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest. Standalone display and a start URL inside
// the app are what make the install prompt appear.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Aloft',
    short_name: 'Aloft',
    description:
      'Study. Earn. Build. Verified focus and real recall pay for a floating island.',
    start_url: '/study',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#14161f',
    theme_color: '#14161f',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
