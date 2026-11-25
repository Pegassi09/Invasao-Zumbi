import { origin } from '@/lib/view';
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/admin', '/api/atividade', '/favoritos'],
    },
    sitemap: origin() + '/sitemap.xml',
  };
}
