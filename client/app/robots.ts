import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://botnexa.onrender.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/embed/chat?*', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
