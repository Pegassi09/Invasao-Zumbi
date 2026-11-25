import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/barlow-condensed/latin-800-italic.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { Nav, Brand } from '@/components/nav';
import { origin } from '@/lib/view';
import { eventTitle } from '@/lib/model';
export const metadata: Metadata = {
  metadataBase: new URL(origin()),
  title: { default: eventTitle, template: '%s | Invasão Zumbi Marília' },
  description:
    'Encontre lojas, ofertas e rotas para a Black Friday em Marília em 27 de novembro de 2026.',
  openGraph: {
    locale: 'pt_BR',
    type: 'website',
    title: eventTitle,
    description: 'A Black Friday invadiu o comércio de Marília. Explore as lojas no mapa.',
    images: ['/arte/social.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['/arte/social.jpg'] },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip" href="#principal">
          Pular para o conteúdo
        </a>
        <Nav />
        <main id="principal">{children}</main>
        <footer>
          <div className="wrap foot">
            <div>
              <Brand />
              <p>Black Friday no comércio de Marília · 2026</p>
            </div>
            <div>
              <h3>Organização</h3>
              <a href="https://acim.org.br/" target="_blank" rel="noreferrer">
                Associação Comercial e de Inovação de Marília <ArrowUpRight size={13} />
              </a>
            </div>
            <div>
              <h3>Canais oficiais</h3>
              <div className="row">
                <a href="https://www.instagram.com/acimariliasp">Instagram</a>
                <a href="https://www.facebook.com/ACIMariliaSP">Facebook</a>
              </div>
            </div>
            <Link href="/admin">Área administrativa</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
