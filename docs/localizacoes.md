# Localização dos estabelecimentos

Em 25 de novembro de 2026, a conferência identificou coordenadas de endereço para 46 das 50 linhas comerciais das sete abas visíveis. Das 46, 45 têm endereço na planilha. Para a Teciê, a própria empresa publica o número. As abas ocultas trazem históricos, recusas e prospecção. O vínculo de um ponto a uma linha histórica depende da identificação da mesma unidade no cadastro vigente.

## Como conferir um ponto

A fonte das coordenadas é o Cadastro Nacional de Endereços para Fins Estatísticos do Censo 2022, município de Marília, código 3529005. O arquivo do IBGE tem a soma SHA-256 `c9d3019b98f4c26bdf458f6d262b58392bfe3ab551b2d294643d54715ddb7615`. Cada elemento de `lib/locations.json` preserva o nome e o endereço de origem com espaços externos removidos. O fragmento no campo `source` identifica o registro pela coluna `COD_UNICO_ENDERECO`. Para reproduzir a conferência, extraia o CSV, filtre pelo código e consulte `LATITUDE`, `LONGITUDE`, `NOM_SEGLOGR`, `NUM_ENDERECO`, `NV_GEO_COORD` e os complementos. Todos os pontos utilizados têm nível de geocodificação 1. [Arquivos municipais do IBGE](https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/35_SP/3529005_MARILIA.zip) · [Documentação do CNEFE](https://www.ibge.gov.br/estatisticas/Sociais/populacao/22827-censo-demografico-2022.html?edicao=40121)

A unidade participante e seu endereço atual vêm da planilha. O IBGE fornece a posição do imóvel no ano do recenseamento. Alguns imóveis tinham outro ocupante em 2022. A combinação exigiu município, via e número, com identificação da loja, do complemento ou da entrada em prédios com múltiplos pontos. A planilha continua sendo a fonte das condições comerciais. Uma mudança de endereço no painel exige nova conferência das coordenadas.

O centro de enquadramento de Marília é latitude −22,22 e longitude −49,95, posição aproximada da sede publicada no mapa municipal. O marcador de uma loja só aparece com as coordenadas do próprio cadastro. [Mapa municipal do IBGE](https://geoftp.ibge.gov.br/cartas_e_mapas/mapas_municipais/colecao_de_mapas_municipais/2020/SP/marilia/3529005_MM.pdf)

## Registros que exigiram conferência adicional

| Registro | Decisão |
| --- | --- |
| Teciê | A planilha informa o nome da rua apenas na aba. A empresa publica Rua Coronel Galdino de Almeida, 334–356, Centro. O IBGE identifica a loja de tecidos Teciê no térreo do 356, código 93605603. A chave do dado de origem mantém o endereço vazio. [Contato oficial](https://www.tecie.com.br/contato) |
| Cantinho Indiano | O endereço explícito prevalece sobre o nome da aba. O CNEFE registra Cantinho Indiano na loja 2 do número 387 da Rua Quatro de Abril. |
| Ótica Nove de Julho | O imóvel do número 1156 tem várias coordenadas. Foi selecionado o ponto nominal da ótica, código 202223879. |
| Ótica Veja e MD Uniótica | Os registros selecionados descrevem a frente de cada estabelecimento. Para a Uniótica, o CNEFE também lista o estacionamento nos fundos. |
| Frutipolpa | A ficha do parceiro confirma o número 688. O ponto utilizado identifica a frente deste imóvel no CNEFE. [Cadastro de parceiros da FACIM](https://facim.org.br/) |
| Ótica Fralli | O endereço bruto conserva o asterisco de “352*”. A FACIM confirma o número 352 da Rua Quatro de Abril. [Cadastro de parceiros da FACIM](https://facim.org.br/) |
| Ótica Feres | O site da empresa confirma a unidade da Prudente de Moraes, 116. A mesma unidade também consta no diretório da Acim. [Site da loja](https://www.oticaferes.com.br/) · [Diretório da Acim](https://acim.org.br/retire-seu-voucher/) |
| Cirandinha e Ótica São Bento | Cada filial permanece associada ao seu próprio endereço. A Cirandinha confirma a existência das duas unidades da Rua São Luiz. A Acim registra a São Bento nas ruas São Luiz e Nove de Julho. [Lojas Cirandinha](https://linktr.ee/cirandinha.lojas) · [Diretório da Acim](https://acim.org.br/retire-seu-voucher/) |

## Pendências no catálogo da planilha

| Cadastro | O que confirmar |
| --- | --- |
| Lídia Pereira Barros Souza | A descrição informa box 159 na Rua Nove de Julho. Falta identificar o imóvel e a entrada do box. |
| Cirandinha Calçados, Rua São Luiz, 890 | A loja confirma o endereço comercial 890. O CNEFE identifica a Cirandinha no 892 e tem um ponto distinto para a unidade 990. Confirmar a entrada do 890. [Lojas Cirandinha](https://linktr.ee/cirandinha.lojas) |
| M Freire Semi Joias | A planilha indica que a loja está no Confiança Norte. Confirmar a entrada do quiosque ou a indicação autorizada de acesso no supermercado. |
| Foto 1 Hora, Avenida Sampaio Vidal, 457 | O CNEFE tem diferentes posições no número 457 e identifica o estúdio também em outra rua. Confirmar a entrada da unidade participante da Sampaio Vidal. |

## Organização do evento

A Associação Comercial e de Inovação de Marília anuncia a ação em 27 de novembro de 2026 e informa a parceria com a Secretaria Municipal da Cultura. O rodapé institucional da própria associação publica seus perfis oficiais. [Anúncio da Acim](https://acim.org.br/noticias/comercio-varejista-acim-define-programacao-de-atividades-para-o-fim-do-ano/) · [Site institucional](https://acim.org.br/) · [Instagram](https://www.instagram.com/acimariliasp) · [Facebook](https://www.facebook.com/ACIMariliaSP) · [LinkedIn](https://br.linkedin.com/company/acimariliasp)
