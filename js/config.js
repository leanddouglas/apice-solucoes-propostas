/*
 * CONFIGURAÇÃO DA ÁPICE SOLUÇÕES
 * ------------------------------------------------------------------
 * Edite este arquivo para trocar dados da empresa, logotipo, preços
 * de exemplo, serviços e condições padrão. Não é preciso compilar nada:
 * salve o arquivo e recarregue a página.
 *
 * ATENÇÃO: todos os preços abaixo são VALORES DE EXEMPLO (placeholders).
 * Substitua pelos preços reais da empresa antes de enviar propostas.
 */
window.APICE_CONFIG = {
  empresa: {
    nome: 'Ápice Soluções',
    slogan: 'Fachadas, revestimentos e retrofit',
    // Para usar um logotipo em imagem, coloque o arquivo na pasta assets/
    // e informe o caminho, por exemplo: 'assets/logo.png'. Vazio = wordmark em texto.
    logoUrl: '',
    cnpj: '00.000.000/0001-00',
    telefone: '(00) 00000-0000',
    email: 'contato@apicesolucoes.com.br',
    site: 'www.apicesolucoes.com.br',
    endereco: 'Rua Exemplo, 123 — Cidade/UF',
    responsavelTecnico: 'Nome do responsável técnico',
    registroProfissional: 'CREA/CAU 000000'
  },

  // Enquanto true, a proposta impressa traz a faixa "MODELO — valores de exemplo".
  // Mude para false depois de cadastrar os preços reais da empresa.
  precosSaoExemplo: true,

  // Prefixo do número da proposta (ex.: APC-2026-0001)
  prefixoProposta: 'APC',

  // Padrões de um novo orçamento
  padroes: {
    largura: 14,          // frente (m)
    profundidade: 20,     // lateral (m)
    pavimentos: 8,
    peDireito: 3.0,       // altura de cada pavimento-tipo (m)
    peDireitoTerreo: 4.5, // altura do térreo (m)
    platibanda: 1.2,      // altura da platibanda (m)
    descontoVaos: 20,     // % da área ocupada por janelas/esquadrias, descontada da medição
    faces: { frente: true, direita: true, fundos: false, esquerda: true },
    servico: 'revestimento',
    acabamento: 'acm',
    cor: '#2f5d7c',
    sacadas: true,
    validadeDias: 15,
    prazoExecucaoDias: 90,
    impostosPercentual: 0,
    impostosRotulo: 'Impostos (ISS e outros)',
    formaPagamento: '30% na assinatura, 40% na metade da obra e 30% na entrega',
    observacoes: 'Medição final conforme levantamento em campo. Valores sujeitos a confirmação após vistoria técnica.'
  },

  // Serviços principais (valor por m² de fachada medida) — VALORES DE EXEMPLO
  servicos: [
    { id: 'revestimento', nome: 'Execução de revestimento de fachada', precoM2: 95, usaAcabamento: true },
    { id: 'retrofit', nome: 'Retrofit completo de fachada', precoM2: 160, usaAcabamento: true },
    { id: 'recuperacao', nome: 'Recuperação de fachada (som cavo, juntas e reposição de peças)', precoM2: 120, usaAcabamento: true },
    { id: 'pintura', nome: 'Pintura de fachada com preparo de base', precoM2: 45, usaAcabamento: true },
    { id: 'impermeabilizacao', nome: 'Impermeabilização de fachada', precoM2: 38, usaAcabamento: false },
    { id: 'limpeza', nome: 'Limpeza técnica e hidrojateamento', precoM2: 18, usaAcabamento: false }
  ],

  // Acabamentos (fornecimento de material, por m²) — VALORES DE EXEMPLO
  // tipo define a aparência no modelo 3D: acm | vidro | porcelanato | pastilha | textura | concreto | tijolo
  acabamentos: [
    { id: 'acm', nome: 'Painel em ACM (alumínio composto)', tipo: 'acm', precoM2: 210, cor: '#2f5d7c' },
    { id: 'vidro', nome: 'Pele de vidro (structural glazing)', tipo: 'vidro', precoM2: 480, cor: '#6f93a8' },
    { id: 'porcelanato', nome: 'Porcelanato técnico 60×120', tipo: 'porcelanato', precoM2: 170, cor: '#d9d4cb' },
    { id: 'pastilha', nome: 'Pastilha cerâmica 5×5', tipo: 'pastilha', precoM2: 130, cor: '#5f8f8c' },
    { id: 'textura', nome: 'Textura acrílica', tipo: 'textura', precoM2: 28, cor: '#e9e2d4' },
    { id: 'concreto', nome: 'Concreto aparente com hidrofugante', tipo: 'concreto', precoM2: 55, cor: '#a7a39c' },
    { id: 'tijolo', nome: 'Tijolinho aparente', tipo: 'tijolo', precoM2: 110, cor: '#a5583c' }
  ],

  // Itens adicionais disponíveis no botão "Adicionar item" — VALORES DE EXEMPLO
  itensExtras: [
    { descricao: 'Mobilização e desmobilização de equipe', unidade: 'vb', quantidade: 1, preco: 3500 },
    { descricao: 'Andaime fachadeiro (locação mensal)', unidade: 'mês', quantidade: 3, preco: 6000 },
    { descricao: 'Balancim elétrico (locação mensal)', unidade: 'mês', quantidade: 3, preco: 2800 },
    { descricao: 'Projeto de paginação de fachada', unidade: 'vb', quantidade: 1, preco: 2500 },
    { descricao: 'Emissão de ART/RRT', unidade: 'un', quantidade: 1, preco: 250 },
    { descricao: 'Limpeza final da obra', unidade: 'vb', quantidade: 1, preco: 1200 }
  ],

  formasPagamento: [
    '30% na assinatura, 40% na metade da obra e 30% na entrega',
    'Medições mensais conforme avanço físico',
    '50% de entrada e 50% na conclusão',
    'À vista com desconto (já aplicado)'
  ]
};
