import type { en } from './en';

// Brazilian Portuguese, key for key with en.ts. Glossary: cópia de trabalho · slot ·
// gravar · aplicar · sistema. Names the pedal prints (PCM, MFX, CTL, GK…) stay as printed.
const changes = (count: number) =>
  count === 1 ? '1 alteração não gravada' : `${count} alterações não gravadas`;

export const ptBR: typeof en = {
  app: {
    name: 'Rigbench',
    tagline: 'Edite seu equipamento de guitarra pelo navegador, via MIDI.',
    footer: 'Roda no seu navegador. Nada do que você edita sai deste computador.',
    notFound: 'Não há nada neste endereço.',
    backHome: 'Todos os dispositivos',
  },
  locale: {
    label: 'Idioma',
    names: { en: 'EN', 'pt-BR': 'PT-BR' },
  },
  gate: {
    noWebMidi: {
      title: 'Este navegador não conversa com dispositivos MIDI',
      body: 'O Rigbench precisa de Web MIDI, que o Safari e todos os navegadores de iPhone e iPad não têm. Abra esta página no Chrome ou no Edge em um computador.',
    },
    insecure: {
      title: 'MIDI exige uma página segura',
      body: 'Os navegadores só liberam MIDI em páginas servidas por HTTPS ou em localhost. Abra o Rigbench pelo endereço https://, ou por http://localhost se você mesmo o estiver rodando.',
    },
    firefoxNotice:
      'O Firefox pede uma permissão extra antes de a página falar MIDI com o pedal. Permita quando ele perguntar, senão o Rigbench não alcança o pedal.',
  },
  home: {
    title: 'Escolha seu dispositivo',
    open: 'Abrir editor',
    comingSoon: 'Em breve',
  },
  devices: {
    gr55: { name: 'Roland GR-55', kind: 'Sintetizador de guitarra' },
    vg99: { name: 'Roland VG-99', kind: 'Sistema V-Guitar' },
    gt10: { name: 'BOSS GT-10', kind: 'Processador de efeitos de guitarra' },
  },
  connection: {
    title: 'Conecte seu GR-55',
    intro:
      'Ligue o GR-55 a este computador com um cabo USB, ligue o pedal e então permita o acesso MIDI.',
    allow: 'Permitir acesso MIDI',
    denied:
      'O navegador recusou o acesso MIDI. Permita dispositivos MIDI para este site nas configurações do navegador e tente de novo.',
    input: 'Entrada MIDI (vinda do pedal)',
    output: 'Saída MIDI (para o pedal)',
    noPorts:
      'Nenhuma porta MIDI encontrada. Confira o cabo USB e se o driver do Roland GR-55 está instalado.',
    connect: 'Conectar',
    connecting: 'Procurando o GR-55…',
    noReply:
      'Nada respondeu nestas portas. Confira se o pedal está ligado e se as duas portas são dele.',
    wrongDevice: 'O dispositivo nestas portas respondeu, mas não é um GR-55.',
    simulate: 'Usar um pedal simulado',
    simulatedPort: 'GR-55 simulado',
    disconnect: 'Desconectar',
    lost: 'A conexão com o pedal falhou.',
  },
  gr55: {
    reading: (done: number, total: number) => `Lendo o patch do pedal… ${done}/${total}`,
    reload: 'Ler do pedal',
    search: {
      placeholder: 'Encontre qualquer parâmetro deste patch…',
    },
    navLibrary: 'Biblioteca',
    navStage: 'Palco',
    navEditor: 'Patch',
    navDevice: 'Dispositivo',
    workspace: {
      workingCopy: 'Cópia de trabalho',
      workingCopyHint:
        'Este é o patch que o pedal está tocando agora. Ele só existe enquanto este patch está selecionado: o pedal o descarta quando você troca de patch.',
      savedSlot: 'Slot gravado',
      savedSlotHint: 'Gravado no pedal. Fica lá até você gravar outra coisa no lugar.',
      pedal: 'Sistema',
      pedalHint: 'Ajuste de sistema, do pedal inteiro. O mesmo para todos os patches.',
      noUnsavedChanges: 'Nenhuma alteração não gravada',
      unsavedChanges: (count: number) => changes(count),
      confirmDiscard: (count: number) =>
        `A cópia de trabalho tem ${changes(count)}. ` +
        'Substituí-la perde essas alterações e o pedal segue tocando o patch gravado. Continuar?',
      pedalSwitchedNotice: (count: number) =>
        `O pedal trocou de patch sozinho. A cópia de trabalho tinha ` +
        `${count === 1 ? 'uma alteração não gravada, que se perdeu' : `${count} alterações não gravadas, que se perderam`}. ` +
        'O patch abaixo é o que o pedal tem agora.',
      dismissNotice: 'Dispensar',
    },
    mode: { GUITAR: 'Modo guitarra', BASS: 'Modo baixo' },
    unnamed: '(sem nome)',
    librarian: 'Bibliotecário',
    showAllEffects: 'Mostrar os parâmetros de todos os tipos de efeito',
    unknownValue: (hex: string) => `Valor desconhecido (${hex})`,
    error: (message: string) =>
      `O pedal não aceitou ou não respondeu à última mensagem: ${message}`,
    dismiss: 'Dispensar',
    pages: {
      patch: 'Patch',
      pcm1: 'PCM 1',
      pcm2: 'PCM 2',
      tone: 'Timbre',
      toneOffsets: 'Ajustes do timbre',
      modeling: 'Modelagem',
      normalPickup: 'Captador normal',
      amp: 'Amp',
      noiseSuppressor: 'Supressor de ruído',
      mod: 'MOD',
      mfx: 'MFX',
      delay: 'Delay',
      chorus: 'Chorus',
      reverb: 'Reverb',
      eq: 'EQ',
      assigns: 'Assigns',
      pedalGk: 'Pedais e GK',
      pedalRanges: 'GK set e faixas dos controles',
      master: 'Master',
      output: 'Saída',
      tuning: 'Afinação',
      vlink: 'V-LINK',
      ez: 'Som EZ',
    },
    document: {
      save: 'Gravar',
      saveAs: 'Gravar como…',
      revert: 'Reverter',
      revertConfirm: (count: number) =>
        `Desfazer ${count === 1 ? 'a 1 alteração não gravada' : `todas as ${count} alterações não gravadas`} e voltar ` +
        'a como estava no pedal? Enquanto isso o pedal segue tocando o patch gravado.',
      saveHint: (slot: string) => `Este patch veio de ${slot}. Gravar o devolve para lá.`,
      saveNoSlot:
        'Este patch veio da tela do pedal ou de um arquivo, então não há slot onde gravar. Use Gravar como… para guardá-lo em um slot.',
      advanced: 'Avançado',
    },
    blocks: {
      title: 'Cadeia de sinal',
      intro:
        'Como o som percorre este patch. Clique em um bloco para ajustar seus parâmetros; blocos acinzentados estão desligados.',
      input: 'Entrada',
      inputHint: 'O GK de 13 pinos e o captador normal de 1/4" alimentam o patch.',
      sources: 'Fontes de som',
      pcm1: 'PCM 1',
      pcm2: 'PCM 2',
      modeling: 'Modelagem',
      normalPickup: 'Captador normal',
      layers: 'Camadas',
      layersHint: 'Nível, pan e mute por fonte.',
      amp: 'Amp',
      mod: 'MOD',
      mfx: 'MFX',
      chorus: 'Chorus',
      delay: 'Delay',
      reverb: 'Reverb',
      eq: 'EQ',
      master: 'Master',
      control: 'Pedais e GK',
      controlHint: 'O que cada pisada faz: assigns, CTL, EXP, controles do GK.',
      output: 'Saída',
      off: 'Desligado',
      assignCables: 'Cabos: ao pisar em um pedal',
    },
  },
  librarian: {
    fileTitle: 'Arquivo de patch',
    fileIntro:
      'Um arquivo .syx guarda um patch. Abrir um arquivo substitui o patch que você está editando; não mexe nos patches gravados no pedal.',
    download: 'Baixar o patch como .syx',
    open: 'Abrir arquivo .syx…',
    opened: (name: string) =>
      `${name} carregado como cópia de trabalho. Sempre teste com um clique antes de guardar.`,
    problems: {
      'no-patch-data': 'Este arquivo não contém um patch de GR-55.',
      'bad-checksum': 'Este arquivo está danificado: uma mensagem dele falha na verificação.',
      'out-of-range':
        'Este arquivo está danificado: ele aponta para dados fora de um patch de GR-55.',
    },
    slotsTitle: 'Patches de usuário no pedal',
    slotsIntro:
      'Carregue um patch de usuário para editá-lo, ou grave o patch que você está editando em um slot. Gravar é a única ação aqui que muda o que está guardado no pedal.',
    readNames: 'Ler nomes dos patches',
    readingNames: (done: number, total: number) => `Lendo nomes… ${done}/${total}`,
    stop: 'Parar',
    load: 'Carregar',
    write: 'Gravar aqui',
    notRead: '—',
    confirmWrite: (slot: string, current: string | undefined, name: string) =>
      `Sobrescrever o patch de usuário ${slot}${current ? ` (“${current}”)` : ''} com “${name}”? O patch gravado lá hoje se perde.`,
    written: (slot: string) => `Gravado no patch de usuário ${slot}.`,
  },
  library: {
    title: 'Biblioteca',
    intro:
      'Todos os patches gravados no pedal. Teste um com um clique, abra-o no editor ou grave em um slot o patch em que você está trabalhando.',
    workingCopy: 'Cópia de trabalho',
    workingCopyIntro:
      'O patch que o pedal está tocando agora. O pedal o descarta quando troca de patch.',
    openInEditor: 'Abrir',
    changes: (count: number) => changes(count),
    noChanges: 'Nenhuma alteração não gravada',
    test: 'Testar',
    writeTo: 'Gravar em…',
    reading: (done: number, total: number) => `Lendo slots… ${done}/${total}`,
    namesTitle: 'Nomes dos slots',
    readAllNames: 'Ler os nomes de todos os slots',
    backupTitle: 'Backup do pedal inteiro',
    backupIntro:
      'Salve todos os slots do pedal em um arquivo, ou devolva um backup salvo ao pedal. As duas coisas ocupam o pedal por um tempo; leia só os nomes se você quer apenas um inventário.',
    backup: 'Salvar um backup de todos os slots…',
    backupProgress: (done: number, total: number) => `Fazendo backup… ${done}/${total} slots`,
    backupDone: (file: string) => `Backup salvo como ${file}.`,
    backupWriteTitle: 'Restaurar um backup de slots',
    backupWrite: 'Devolver um backup de slots…',
    backupRestoring: (done: number, total: number) => `Restaurando… ${done}/${total} slots`,
    backupRestored: 'O backup está de volta no pedal.',
    fileIsEmpty: 'Este arquivo de backup não contém slots.',
    writeFlowTitle: (slot: string) => `Gravar em ${slot}`,
    readDiff: 'Comparar com a cópia de trabalho',
    writeFlowIntro:
      'Só os parâmetros listados abaixo mudam. Confirmar os envia ao slot; o pedal fica mudo por alguns segundos — não pise nos pedais enquanto ele grava.',
    diffTitle: 'O que muda neste slot',
    diffEmpty: 'Nada difere; gravar é seguro.',
    diffConfirm: 'Gravar no slot',
    choosing: 'Escolha um slot',
    writing: 'Gravando no pedal — não pise nos pedais…',
    written: (slot: string) => `O slot ${slot} agora guarda este patch.`,
    tested: (slot: string) => `${slot} está tocando agora.`,
    emptySlot: '(vazio)',
    memory: (slot: string) => `Slot ${slot}`,
  },
  stage: {
    title: 'Palco',
    intro: 'O que está tocando agora, e o que cada pisada faz.',
    playingCopy:
      'O pedal está tocando sua cópia de trabalho, não o slot gravado. Pise nos pedais e o patch que soa muda junto.',
    pedals: 'O que cada pisada faz',
    effects: 'Efeitos agora',
    fixed: 'troca de patch, fixo no hardware',
    on: 'Ligado',
    off: 'Desligado',
    back: 'Voltar à biblioteca',
    footnote: 'Nada aqui é editável. Troque de patch de ouvido, no próprio pedal.',
  },
  device: {
    title: 'Dispositivo',
    intro:
      'Regras do pedal inteiro. Toda mudança aqui leva o selo azul, porque afeta o sistema e todos os 297 slots.',
    profileTitle: 'Seu instrumento',
    profileIntro:
      'Diga ao Rigbench o que você toca. Isso molda dicas e listas de patches neste computador; o pedal em si não é alterado.',
    profiles: {
      'guitar-gk': 'Guitarra elétrica com captador GK-3',
      'acoustic-piezo': 'Violão de aço ou nylon, captador piezo',
      'bass-gk': 'Baixo com captador GK-3B',
    },
    modeTitle: 'Modo guitarra / Modo baixo',
    modeIntro:
      'Ajuste de sistema. Trocar refaz a lista inteira de patches — todos os 297 slots mudam de sentido. Grave sua cópia de trabalho antes.',
    confirmMode: (count: number) =>
      `Trocar Guitarra⇄Baixo é uma mudança de sistema que afeta todos os 297 slots` +
      `${count ? ` e descarta ${changes(count)}` : ''}. Trocar?`,
    modeSwitchBlocked:
      'A cópia de trabalho ainda tem alterações não gravadas. Grave, reverta ou descarte antes de trocar de modo.',
    modeSwitchedTo: (mode: string) => `O pedal agora está em ${mode}.`,
    midiTitle: 'MIDI e USB',
    midiIntro:
      'O pedal conversa pelo cabo USB com o driver que a Roland fornece. O Rigbench lê um patch por vez e envia as mudanças conforme você as faz; nada fica guardado neste computador.',
    systemNotice: 'Ajustes de sistema sempre perguntam antes.',
    profileModeWarn: 'O pedal não está neste modo',
    backupTitle: 'Backup do sistema',
    backupIntro:
      'Salva os ajustes de sistema que o Rigbench enxerga — o modo e seus vizinhos na página de sistema — em um pequeno arquivo .syx. Restaurar pergunta antes.',
    backup: 'Salvar os ajustes de sistema…',
    backupWrite: 'Devolver um backup de sistema…',
    backupDone: (file: string) => `Backup do sistema salvo como ${file}.`,
    confirmSystemWrite:
      'Devolver estes ajustes de sistema à página de sistema? Todas as listas de patches e a chave de modo voltam ao que o backup guarda.',
    systemRestored: 'Os ajustes de sistema estão de volta no pedal.',
  },
};
