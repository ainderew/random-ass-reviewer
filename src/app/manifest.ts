import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest. Standalone display and a start URL inside
// the app are what make the install prompt appear.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Aloft',
    short_name: 'Aloft',
    description:
      'Study with Toast. Turn your notes into cards, focus, and track your learning.',
    start_url: '/study',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fcf2ec',
    theme_color: '#fcf2ec',
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
