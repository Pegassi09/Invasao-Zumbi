# Validação de entrega · 25 de novembro de 2026

| Verificação | Resultado observado |
| --- | --- |
| Planilha original | 5 testes do importador aprovados com o XLSX fornecido. Cobertura das 10 abas e 110 linhas. |
| Integridade no Atlas | Uma conexão posterior à importação leu 50 lojas ativas, 92 promoções cadastradas, 90 ativas, 6 categorias, 46 coordenadas e 60 linhas históricas no banco exclusivo do evento. |
| Build | Next.js compilado e tipado em Node.js 24. O build remoto da Vercel também terminou com sucesso. |
| Catálogo | As 145 URLs do sitemap da base de conferência responderam HTTP 200. A URL de loja inexistente respondeu 404. |
| Consumidor | Chromium verificou menus, busca por loja, filtros, ordenação por desconto, favoritos entre páginas, ficha e oferta individual, diálogo de compartilhamento, cópia de link, destino WhatsApp e URL de rota. |
| Mapa | Marcadores e mosaicos reais carregados. A busca por Fralli retornou um marcador com popup. A consulta por M Freire retornou a unidade com indicação de pendência. O teste ampliou e reduziu o mapa. |
| Dispositivos | Conferência de largura útil em 320, 390, 768 e 1280 px nas páginas iniciais, catálogo, ofertas, evento, mapa e login. |
| Painel | Autenticação, criação de categoria, loja e oferta, alteração de oferta, exclusão confirmada, imagem persistida, leitura do conteúdo e encerramento de sessão verificados em banco isolado. |
| Importações | Prévia sem alterar catálogo, confirmação, repetição idempotente, preservação das filiais e arquivamento explícito de oferta divergente verificados. Uma prévia desatualizada foi rejeitada após edição concorrente. |
| Segurança | Sessão ausente ou encerrada retornou 401, origem diferente retornou 403, dados e arquivos inválidos foram recusados e excesso de tentativas retornou 429. Exclusão sem confirmação foi rejeitada. `npm audit --omit=dev` reportou zero alertas na data da entrega. |
| Passaporte | Emissão administrativa após confirmação presencial, resgate, registro no navegador e rejeição do segundo uso verificados. Módulo desativado na carga inicial. |
| Contadores | O teste conferiu registros reais de acesso, compartilhamento e auditoria em sua base exclusiva. |

O teste integrado roda em Chromium contra o servidor Next.js de produção e uma réplica real de MongoDB. A base exclusiva de QA é removida ao término. O relatório descreve as verificações executadas. O clique de compartilhamento e a abertura de rotas são verificáveis até o encaminhamento aos aplicativos externos. Nenhuma mensagem comercial é enviada pelos testes.

## Publicação

A carga autorizada foi concluída em `invasao_zumbi_2026`. O primeiro acesso da função publicada à página inicial encontrou uma recusa no handshake TLS com o Atlas. A mesma configuração de conexão funcionou a partir do computador da organização. A promoção ao domínio público depende de o teste da Vercel obter os dados no Atlas. A lista de acesso de rede do Atlas se aplica ao projeto do cluster. [Conectividade Vercel–Atlas](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)
