import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageTitle } from '@/components/page-title';
import { Countdown } from '@/components/home-explore';
import { Share } from '@/components/actions';
import { eventTitle } from '@/lib/model';
export const metadata = { title: 'O evento' };
export default function Page() {
  return (
    <div className="wrap inside">
      <PageTitle title="O evento" />
      <div className="eventgrid">
        <img
          src="/arte/cartaz.webp"
          alt="Cartaz da Invasão Zumbi, Black Friday de 27 de novembro em Marília"
        />
        <div>
          <div className="kicker">27 NOV 2026 · SEXTA-FEIRA</div>
          <h2>Invasão Zumbi no Comércio de Marília</h2>
          <p>
            A Invasão Zumbi faz parte da programação de Black Friday da Associação Comercial e de
            Inovação de Marília, em parceria com a Secretaria Municipal da Cultura. A programação
            prevê comércio aberto até as 22h.
          </p>
          <p>
            <Countdown />. Consulte as condições e os horários de cada estabelecimento antes da
            visita.
          </p>
          <div className="stack">
            <Link className="button primary" href="/lojas">
              Explorar lojas <ArrowRight size={16} />
            </Link>
            <a
              className="textlink"
              href="https://acim.org.br/noticias/comercio-varejista-acim-define-programacao-de-atividades-para-o-fim-do-ano/"
            >
              Consultar programação da Acim ↗
            </a>
            <Share id="inicio" title={eventTitle} path="/" />
          </div>
        </div>
      </div>
    </div>
  );
}
