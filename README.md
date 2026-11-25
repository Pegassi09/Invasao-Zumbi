# Invasão Zumbi no Comércio de Marília

Portal da Black Friday de 27 de novembro de 2026. O catálogo público, a vitrine, as fichas compartilháveis, os favoritos e o mapa estão disponíveis em português. O painel da organização fica em `/admin`.

## Executar

Use Node.js 24, npm e um MongoDB com suporte a transações, como Atlas ou um replica set local. Cada ambiente tem seu próprio banco. O servidor reaproveita as conexões entre requisições. Next.js atende as páginas e as APIs na Vercel. O sistema lê os cadastros a cada consulta pública e as alterações administrativas ficam disponíveis após salvar.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configure `MONGODB_URI` e `MONGODB_DB` em `.env.local`. Em desenvolvimento o endereço padrão é http://localhost:3000. Configure `SITE_URL` quando usar domínio próprio. Na Vercel, o domínio de produção informado pela plataforma serve como origem dos metadados e do sitemap. O build pode ser executado sem acesso ao banco.

```sh
npm run admin -- email@dominio.com.br
npm run importar -- "/caminho/para/planilha.xlsx"
npm run importar -- --confirmar ID_DA_PREVIA
npm run build
npm start
```

O comando administrativo solicita a senha com entrada oculta. Para trocar a senha, execute o mesmo comando para o e-mail existente. A troca encerra as sessões anteriores. O painel permite importar os próximos arquivos e corrigir cadastros sem acesso ao terminal.

## Rotas e tarefas

| Área | Caminho ou operação |
| --- | --- |
| Início, evento e mapa | `/`, `/evento`, `/mapa` |
| Busca, filtros e favoritos | `/lojas`, `/ofertas`, `/favoritos` |
| Fichas permanentes | `/lojas/[slug]`, `/ofertas/[id]` |
| Administração | `/admin` |
| Importações | Painel → Importações → Gerar prévia → Conferir → Confirmar |
| Conferência de ofertas e localização | Painel → Pendências |
| Estatísticas e histórico | Painel → Visão geral, Auditoria, Importações |
| Passaporte opcional | Painel → Passaporte. Quando ativo, a página inicial aponta para `/passaporte`. |

Em uma visita confirmada presencialmente, o responsável autenticado emite um código para a unidade visitada. O código expira em quinze minutos e só pode ser usado uma vez. O passaporte concede um carimbo por unidade e por navegador. O banco grava o progresso e um cookie opaco identifica o navegador. O módulo começa desativado.

## Fonte e revisão editorial

O relatório da planilha relaciona as 110 linhas às respectivas abas. A carga inicial tem 50 lojas, 92 promoções cadastradas e 90 ativas. As abas ocultas contêm 60 linhas históricas. A prévia conserva os campos originais em área administrativa e permite consultar cada linha. A página de localização documenta os 46 pontos iniciais e quatro endereços pendentes. [Conferência da planilha](docs/planilha.md) · [Localizações e fontes](docs/localizacoes.md)

A planilha não traz uma coluna de categoria. A carga sugere categorias quando o nome da loja ou os produtos descritos identificam o segmento. A organização pode corrigir essas categorias e os destaques editoriais. Nomes e celulares de prospecção ficam disponíveis no histórico privado. Os campos públicos de telefone e WhatsApp podem ser preenchidos após confirmação comercial. As datas e os horários específicos de cada oferta ficam vazios quando ausentes. A contagem regressiva usa dias de calendário em São Paulo.

A arte do banner deriva do cartaz fornecido. O cartaz integral aparece na página do evento. As fotos ilustrativas das categorias são distribuídas como arquivos WebP otimizados. [Óculos](https://images.unsplash.com/photo-1511499767150-a48a237f0083) · [Óculos solares](https://images.unsplash.com/photo-1572635196237-14b3f281503f) · [Calçados](https://images.unsplash.com/photo-1542291026-7eec264c27ff) · [Moda](https://images.unsplash.com/photo-1515886657613-9f3515b0c78f) · [Beleza](https://images.unsplash.com/photo-1512496015851-a90fb38ba796)

## Reimportação

A prévia aceita XLSX e CSV UTF-8 de até 3 MB, preserva a origem e mostra novas unidades, correspondências, repetições, campos incompletos e ofertas divergentes. A unidade é identificada por nome e endereço normalizados e pelo vínculo preservado na importação anterior. Linhas comerciais distintas de uma unidade podem acrescentar várias ofertas. Os campos brutos permanecem no histórico mesmo quando um valor precisa de conferência.

Na reimportação, o conteúdo comercial idêntico é reconhecido por unidade, título, condições e período. Se houver novas ofertas e ofertas anteriores divergentes, a prévia solicita a escolha de acrescentar as novas ou desativar as divergentes indicadas. A segunda opção mantém os registros para consulta. Edições manuais são preservadas. Se o catálogo mudar entre a prévia e a confirmação, gere a prévia novamente. A confirmação é transacional e pode ser repetida com o mesmo identificador.

Para importações posteriores, CSV aceita, por exemplo, os cabeçalhos `Empresa;Endereço;Categoria;Oferta;Condições;Início;Fim`. Datas ISO são recomendadas. Os cabeçalhos explícitos `Telefone público`, `WhatsApp comercial público`, `Descrição da loja` e `Horário de funcionamento` podem complementar campos vazios. Contatos genéricos são preservados para conferência.

## Persistência e controles

O Atlas armazena lojas, categorias, ofertas, usuários administrativos, sessões, lotes e linhas de importação, auditoria, contadores, imagens e dados opcionais do passaporte. Imagens enviadas pelo painel têm formato e dimensões validados e são recodificadas em WebP, removendo metadados. Seus bytes ficam na coleção de imagens do banco externo e a URL pública imutável aponta para `/api/imagens/[id]`. Esse armazenamento mantém os uploads entre deploys com um serviço externo único. Os arquivos públicos incluídos com o código são a identidade visual versionada.

As senhas são derivadas com scrypt e sal individual. Sessões administrativas expiram em oito horas. O servidor verifica sessão, usuário ativo e papel administrativo. Requisições de alteração verificam origem. Endpoints sensíveis usam limites de requisições no banco com expiração. Para métricas de divulgação, cada ação registra uma contagem agregada. As métricas representam eventos, inclusive acessos repetidos de um visitante.

## GitHub e Vercel

O repositório inclui lockfile, exclusão de credenciais do Git e do pacote Vercel, verificação pelo GitHub Actions e detecção automática do Next.js. Use repositório privado para o desenvolvimento e relatórios internos. Para habilitar deploys por push, conecte o repositório da organização ao projeto `invasao-zumbi-marilia` em Settings → Git na Vercel. Configure a branch de produção. Faça as alterações e os testes de preview em banco próprio.

Configure as duas variáveis MongoDB para Production. Para Preview e Development configure credenciais e bancos correspondentes. Confirme o acesso de rede **das funções da Vercel** antes de promover a versão. Uma conexão bem-sucedida do computador da organização verifica apenas aquela origem. O cluster usado para as importações deve ter réplicas e o usuário da aplicação deve ter permissões de leitura, escrita e criação de índices no banco do ambiente. [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) · [Integração oficial do MongoDB com a Vercel](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)

## Validação

```sh
npm test
npm run build
npx playwright install chromium
PLANILHA_ORIGINAL="/caminho/para/planilha.xlsx" npm test
TEST_MONGODB_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" PLANILHA_ORIGINAL="/caminho/para/planilha.xlsx" npm run test:e2e
```

O teste de ponta a ponta cria um banco exclusivo de QA na réplica local, inicia o build de produção e remove apenas sua própria base ao finalizar. Valida todas as URLs do sitemap da carga original, catálogo, filtros, localização, favoritos, compartilhamento, formulários administrativos, uploads, alterações, importação repetida, concorrência entre prévia e confirmação, auditoria, passaporte e rejeição de solicitações inválidas. A verificação dos mosaicos do mapa precisa de conectividade com o OpenStreetMap.

Para conferir o domínio público, execute `PORTAL_URL=https://seu-dominio npm run test:publicado`. O teste percorre o sitemap e usa um navegador móvel com os mosaicos reais do mapa. Para incluir o login e a leitura do painel, informe `PORTAL_ADMIN_EMAIL` e `PORTAL_ADMIN_PASSWORD_FILE` apontando para um arquivo privado fora do Git.
