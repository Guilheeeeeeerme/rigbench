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
    disconnect: 'Desconectar',
    lost: 'A conexão com o pedal falhou.',
  },
  gr55: {
    reading: (done: number, total: number) => `Lendo o patch do pedal… ${done}/${total}`,
    reload: 'Ler do pedal',
    search: {
      placeholder: 'Encontre qualquer parâmetro deste patch…',
    },
    navConfig: 'Global',
    navStage: 'Banco',
    navPatch: 'Banco',
    navBank: 'Banco',
    navGlobal: 'Global',
    bankHere: 'Aqui',
    bankPedals: 'CTL e expression',
    bankChatHint:
      'O chat nesta página pode ajustar tudo deste banco — as três teclas, CTL, expression e o patch que está soando.',
    navLibrary: 'Slots e arquivos',
    navDevice: 'Configuração',
    navGk: 'GK sets',
    navMaestro: 'Maestro AI',
    navMore: 'Mais',
    navRecalibrate: 'Recalibrar instrumento',
    exit: 'Sair',
    requestSnapshot: 'Pedir snapshot',
    snapshotBusy: 'Lendo o pedal…',
    authorityApp: 'Confiando no app',
    authorityPedal: 'Espelhando o pedal',
    patchSlot: 'Slot do patch',
    patchSlotUnknown: 'Desconhecido / não é slot de usuário',
    chatCollapse: 'Ocultar chat',
    chatExpand: 'Mostrar chat',
    chatResize: 'Redimensionar o painel do chat',
    workspace: {
      workingCopy: 'Cópia de trabalho',
      workingCopyHint:
        'Este é o patch que o pedal está tocando agora. Ele só existe enquanto este patch está selecionado: o pedal o descarta quando você troca de patch.',
      savedSlot: 'Slot gravado',
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
  config: {
    title: 'Ajustes',
    intro: 'A configuração do pedal inteiro: feita uma vez, atualizada com pouca frequência.',
    deviceItem: 'Saída, pedais, MIDI e USB, modo guitarra/baixo, backup do sistema.',
    gkItem: 'Cápsula GK e sensibilidade de cada corda; qual é a sua guitarra.',
    recalibrateItem: 'O setup guiado do início, passo a passo.',
  },
  voices: {
    pcm1: 'Synth PCM 1',
    pcm2: 'Synth PCM 2',
    modeling: 'Guitarra modelada',
    normalPickup: 'Cápsula normal',
    master: 'Nível master',
    amp: 'Amplificador',
    chorus: 'Chorus',
    delay: 'Delay',
    reverb: 'Reverb',
    eq: 'EQ',
    mute: 'mudo',
  },
  stage: {
    title: 'Palco',
    now: 'Agora',
    userMark: 'USER',
    bankMark: 'Banco',
    feet: 'No pedal',
    gapWarn: 'Trocar de patch deixa o pedal mudo por cerca de um segundo.',
    notSynced: 'Ainda não lido',
    unknownSlot: 'O pedal trocou de patch por conta própria; escolha um aqui para voltar ao mapa.',
    sound: 'Instrumentos',
    playingCopy:
      'O pedal está tocando sua cópia de trabalho, não o slot gravado. Trocar de patch ou desconectar perde essas alterações.',
    slotOf: (number: number) => `Patch de usuário ${number + 1}`,
    onOff: 'Ligado / desligado',
    mixerHint:
      'Estes interruptores e níveis mudam o patch que o pedal está tocando agora — a cópia de trabalho. Nada é gravado em um slot aqui.',
    on: 'Ligado',
  },
  device: {
    title: 'Dispositivo',
    intro:
      'Regras do pedal inteiro. Toda mudança aqui leva o selo azul, porque afeta o sistema e todos os 297 slots.',
    modeTitle: 'Modo guitarra / Modo baixo',
    modeIntro:
      'Ajuste de sistema. Trocar refaz a lista inteira de patches — todos os 297 slots mudam de sentido. Grave sua cópia de trabalho antes.',
    confirmMode: (count: number) =>
      `Trocar Guitarra⇄Baixo é uma mudança de sistema que afeta todos os 297 slots` +
      `${count ? ` e descarta ${changes(count)}` : ''}. Trocar?`,
    modeSwitchBlocked:
      'A cópia de trabalho ainda tem alterações não gravadas. Grave, reverta ou descarte antes de trocar de modo.',
    modeSwitchedTo: (mode: string) => `O pedal agora está em ${mode}.`,
    systemNotice: 'Ajustes de sistema sempre perguntam antes.',
    backupTitle: 'Backup do sistema',
    backupIntro:
      'Salva os ajustes de sistema que o Rigbench lê — os dez GK sets, saída, pedais, MIDI e modo — em um pequeno arquivo .syx. Restaurar pergunta antes.',
    backup: 'Salvar os ajustes de sistema…',
    backupWrite: 'Devolver um backup de sistema…',
    backupDone: (file: string) => `Backup do sistema salvo como ${file}.`,
    confirmSystemWrite:
      'Devolver estes ajustes de sistema ao pedal? GK sets, saída, pedais, MIDI e modo voltam ao que o backup guarda.',
    systemRestored: 'Os ajustes de sistema estão de volta no pedal.',
  },
  sync: {
    title: 'Sincronização com o pedal',
    intro:
      'O Rigbench guarda uma cópia de todos os slots neste computador, para que nomes e patches apareçam na hora. O pedal nunca envia sua memória sozinho: o Rigbench a lê slot por slot, e nunca grava nada no pedal enquanto faz isso.',
    badge: {
      idle: (done: number, total: number) => `Não sincronizado · ${done}/${total}`,
      syncing: (slot: string, done: number, total: number) => `SINC ${slot} · ${done}/${total}`,
      paused: (done: number, total: number) => `Pausado · ${done}/${total}`,
      ready: (total: number) => `PRONTO ✓ ${total}/${total}`,
      changed: (count: number) => (count === 1 ? 'Δ 1 divergente' : `Δ ${count} divergentes`),
      failed: (done: number, total: number) => `Sincronização parada · ${done}/${total}`,
    },
    percent: (percent: number) => `${percent}% concluído`,
    eta: (minutes: number) =>
      minutes < 1
        ? 'falta menos de um minuto'
        : minutes === 1
          ? 'falta cerca de 1 minuto'
          : `faltam cerca de ${minutes} minutos`,
    reading: (slot: string) => `Lendo ${slot} agora.`,
    queue: (count: number) => (count === 1 ? 'Falta ler 1 slot' : `Falta ler ${count} slots`),
    finishedAt: (when: string) => `Última sincronização: ${when}.`,
    readInFull: (count: number) =>
      count === 1
        ? '1 slot foi lido por inteiro desta vez.'
        : `${count} slots foram lidos por inteiro desta vez.`,
    start: 'Sincronizar agora',
    continue: 'Continuar a sincronização',
    pause: 'Pausar',
    resume: 'Retomar',
    stop: 'Parar',
    full: 'Ler todos os slots de novo',
    fullHint:
      'Uma sincronização rápida confere o nome e os ajustes comuns de cada slot e só lê de novo os slots em que eles mudaram. Se você editou algo mais fundo no próprio pedal, leia todos os slots de novo.',
    close: 'Fechar',
    failed:
      'O pedal parou de responder. O que já foi lido fica guardado; continue quando o pedal voltar.',
    changedTitle: 'Mudou no pedal desde a última sincronização',
    changedEntry: (slot: string, before: string, after: string, parameters: number) =>
      `${slot}: “${before}” → “${after}” (${parameters === 1 ? '1 parâmetro' : `${parameters} parâmetros`})`,
    acknowledge: 'Entendi',
    notSynced: 'Ainda não lido',
  },
  enums: {
    puType: {
      'GK-3': 'GK-3',
      'GK-2A': 'GK-2A',
      PIEZO: 'Piezo',
      'PIEZO R': 'Piezo R (RMC)',
      'PIEZO F': 'Piezo F (Fishman)',
      'PIEZO G': 'Piezo G (Graph Tech)',
      'PIEZO L': 'Piezo L (L.R. Baggs)',
      'PIEZO M': 'Piezo M',
    },
    puTypeBass: {
      'GK-3': 'GK-3B',
      'GK-2A': 'GK-2B',
      PIEZO: 'Piezo',
      'PIEZO R': 'Piezo R (RMC)',
      'PIEZO F': 'Piezo F (Fishman)',
      'PIEZO G': 'Piezo G (Graph Tech)',
      'PIEZO L': 'Piezo L (L.R. Baggs)',
      'PIEZO M': 'Piezo M',
    },
    outputSelect: {
      'LINE/PHONES': 'Linha ou fones (mesa, PA, interface de áudio)',
      'JC-120': 'Amp JC-120, entrada de guitarra',
      SMALL: 'Amp pequeno, entrada de guitarra',
      COMBO: 'Amp combo, entrada de guitarra',
      STACK: 'Amp stack, entrada de guitarra',
      'JC-120 RETURN': 'Amp JC-120, entrada return',
      'COMBO RETURN': 'Amp combo, entrada return',
      'STACK RETURN': 'Amp stack, entrada return',
      'B-AMP WITH TWEETER': 'Amp de baixo com tweeter',
      'B-AMP NO TWEETER': 'Amp de baixo sem tweeter',
    },
    guitarOut: {
      PATCH: 'O que cada patch disser',
      OFF: 'Nada',
      'NORMAL PU': 'O captador normal',
      MODELING: 'O som de modelagem',
      BOTH: 'Os dois',
    },
    polarity: {
      NORMAL: 'Normal',
      INVERSE: 'Invertida',
      REVERSE: 'Invertida',
    },
    midiMode: {
      MONO: 'Mono: um canal por corda',
      POLY: 'Poly: todas as cordas em um canal',
    },
    pedalFunction: {
      OFF: 'Nada',
      'PATCH SETTING': 'O que cada patch disser',
      HOLD: 'Hold',
      'PATCH VOLUME': 'Volume do patch',
      'TONE VOLUME': 'Volume dos timbres',
      'PITCH BEND': 'Pitch bend',
      MODULATION: 'Modulação',
      'CROSS FADER': 'Transição entre timbres',
      'DELAY LEVEL': 'Nível do delay',
      'REVERB LEVEL': 'Nível do reverb',
      'CHORUS LEVEL': 'Nível do chorus',
      'MOD CONTROL': 'Controle do efeito MOD',
      'TAP TEMPO': 'Tap tempo',
      'TONE SW': 'Liga/desliga timbres',
      'AMP SW': 'Liga/desliga amp',
      'MOD SW': 'Liga/desliga MOD',
      'MFX SW': 'Liga/desliga MFX',
      'DELAY SW': 'Liga/desliga delay',
      'REVERB SW': 'Liga/desliga reverb',
      'CHORUS SW': 'Liga/desliga chorus',
      'SOUND STYLE INC': 'Próximo sound style',
      'SOUND STYLE DEC': 'Sound style anterior',
      'BANK NUMBER INC': 'Próximo banco',
      'BANK NUMBER DEC': 'Banco anterior',
      'PATCH NUMBER INC': 'Próximo patch',
      'PATCH NUMBER DEC': 'Patch anterior',
      'AUDIO PLAYER PLAY/STOP': 'Player de áudio: tocar/parar',
      'AUDIO PLAYER SONG INC': 'Player de áudio: próxima música',
      'AUDIO PLAYER SONG DEC': 'Player de áudio: música anterior',
      'AUDIO PLAYER SW': 'Liga/desliga player de áudio',
      'V-LINK SW': 'Liga/desliga V-LINK',
    },
  },
  system: {
    reading: 'Lendo os ajustes de sistema…',
    readFailed: 'Não foi possível ler os ajustes de sistema.',
    retry: 'Ler de novo',
    pending: (count: number) =>
      count === 1
        ? '1 mudança de sistema ainda não aplicada'
        : `${count} mudanças de sistema ainda não aplicadas`,
    pendingHint: 'Nada aqui chega ao pedal até você aplicar. Cada mudança afeta todos os patches.',
    apply: 'Aplicar no pedal',
    discard: 'Descartar',
    change: (label: string, from: string, to: string) => `${label}: ${from} → ${to}`,
    inGkSet: (number: number, label: string) => `GK set ${number} · ${label}`,
    confirmApply: (count: number, list: string) =>
      `Aplicar ${count === 1 ? 'esta mudança de sistema' : `estas ${count} mudanças de sistema`}? ` +
      `${count === 1 ? 'Ela afeta' : 'Elas afetam'} todos os patches.\n\n${list}`,
    applied: (count: number) =>
      count === 1 ? '1 mudança aplicada no pedal.' : `${count} mudanças aplicadas no pedal.`,
    fields: {
      activeGkSet: 'GK set em uso',
      outputSelect: 'A saída do pedal vai para',
      guitarOut: 'O jack GUITAR OUT leva',
      rxSwitch: 'Trocar de patch quando chegar um program change',
      txSwitch: 'Enviar um program change quando o patch mudar',
      channel: 'Canal MIDI das trocas de patch',
      guitarToMidi: 'Guitar to MIDI (tocar outros aparelhos pelas cordas)',
      guitarToMidiMode: 'Modo do Guitar to MIDI',
      stringChannels: 'Canais das seis cordas',
      usbMonitor: 'Ouvir o pedal direto ao gravar por USB',
      ctl: 'Pedal CTL',
      expOff: 'Pedal EXP',
      expOn: 'Pedal EXP, com a chave ligada',
      expSw: 'Chave do pedal EXP (pise a ponta até o fim)',
      gkVol: 'Knob de volume do GK',
      gkS1: 'Chave S1 do GK',
      gkS2: 'Chave S2 do GK',
    },
    outputTitle: 'Saída',
    outputIntro:
      'Diga ao pedal em que ele está ligado, para que os modelos de amp soem certo ali. O jack GUITAR OUT é à parte: escolha o que ele leva para seu monitor ou segundo amp.',
    pedalsTitle: 'Pedais, para todos os patches',
    pedalsIntro:
      'Uma pisada é decidida em três camadas. Esta é a primeira: a regra de sistema. “O que cada patch disser” entrega o pedal à segunda camada, os ajustes de pedal do próprio patch; os oito assigns de um patch são a terceira camada, a mais fina. Qualquer outra escolha aqui vale igual nos 297 slots.',
    midiTitle: 'MIDI e USB',
    midiIntro:
      'Só é preciso quando outro aparelho troca os patches do pedal, ou quando o pedal toca outro aparelho. O Rigbench funciona com qualquer ajuste daqui.',
    notMapped:
      'Contraste da tela, desligamento automático e MIDI soft thru são ajustados no próprio pedal: EDIT › SYSTEM.',
    gkTitle: 'GK sets: seus instrumentos',
    gkIntro:
      'O pedal guarda dez conjuntos de ajustes de captador, um por instrumento. O set em uso decide como o pedal ouve suas cordas em todo patch que segue o sistema.',
    gkOpen: 'Abrir os GK sets',
  },
  gk: {
    title: 'GK sets',
    intro:
      'Um set por instrumento: qual captador ele tem, o comprimento da escala, com que força cada corda precisa ser tocada. Calibre uma vez e todos os patches rastreiam melhor.',
    back: 'Voltar ao Dispositivo',
    set: (number: number) => `GK set ${number}`,
    unnamed: '(sem nome)',
    inUse: 'Em uso',
    use: 'Usar este set',
    name: 'Nome (8 caracteres)',
    puType: 'Captador',
    scale: 'Comprimento da escala',
    scaleMm: (mm: number) => `${mm} mm`,
    scalePresetOnPedal: 'Um preset escolhido no pedal (ST ou LP)',
    scaleSt: 'ST · 648 mm',
    scaleLp: 'LP · 628 mm',
    puPhase: 'Fase do captador',
    puPhaseHint: 'Se o grave some ao misturar o captador normal, inverta a fase.',
    puDirection: 'Direção do captador',
    s1s2: 'Ordem das chaves S1/S2',
    normalGain: 'Ganho do captador normal',
    sensTitle: 'Sensibilidade por corda',
    sensIntro:
      'Toque cada corda com a maior força que você usará no palco. Suba a sensibilidade até a barra encostar no topo só nessas notas mais fortes — e não mais que isso.',
    string: (number: number) => `Corda ${number}`,
    meterNeedsMidi:
      'As barras escutam as notas que o pedal envia por MIDI, e o Guitar to MIDI está desligado neste pedal. Ligue-o para vê-las se mexer.',
    meterEnable: 'Ligar o Guitar to MIDI',
    meterWaiting: 'Toque uma corda…',
    meterHint:
      'As barras mostram com que força o pedal ouviu a última nota de cada corda, lida das notas MIDI dele. No modo poly todas as cordas dividem uma barra.',
    meterReset: 'Limpar as barras',
    bassLimited:
      'No modo baixo o Rigbench dá nome ao set e escolhe o captador. Escala, posição do captador e sensibilidade são ajustadas no pedal: EDIT › SYSTEM › GK SETTING.',
    patchesFollowing: (count: number) =>
      count === 1 ? '1 slot segue o set em uso.' : `${count} slots seguem o set em uso.`,
    patchesFollowingHint: 'Os outros apontam um GK set próprio na página Master.',
    patchesUnknown: 'Sincronize o pedal para ver quais slots seguem o set em uso.',
    instrumentNote: 'Anotação sua (fica neste computador)',
    instrumentNotePlaceholder: 'SG vermelha com o GK-3',
  },
  wizard: {
    title: 'Configuração de palco',
    intro:
      'Oito passos de um pedal recém-tirado da bag a um rig pronto para o palco. Nada muda no pedal até você aplicar.',
    step: (number: number, total: number) => `Passo ${number} de ${total}`,
    steps: {
      rig: 'Idioma e nome do rig',
      mode: 'Guitarra ou baixo',
      instruments: 'Seus instrumentos',
      output: 'Saída',
      pedals: 'Pedais',
      midi: 'MIDI e USB',
      backup: 'Backup',
      sync: 'Sincronizar tudo',
    },
    status: { ok: 'Feito', warn: 'Pulado', todo: 'A fazer' },
    next: 'Avançar',
    applyAndNext: 'Aplicar e continuar',
    back: 'Voltar',
    skip: 'Continuar assim mesmo',
    finish: 'Ir para o Palco',
    rigName: 'Nome deste rig',
    rigNamePlaceholder: 'Meu rig de sábado',
    rigIntro: 'Escolha o idioma primeiro; todo o resto segue.',
    modeIntro:
      'O pedal está em um de dois modos, e cada um tem seus próprios 297 slots. Confira se bate com o instrumento que você vai ligar.',
    modeNow: (mode: string) => `O pedal está em ${mode}.`,
    instrumentsIntro:
      'Um GK set por instrumento que você leva. Dê um nome, escolha captador e escala, depois calibre as cordas. O set marcado “em uso” é o que o pedal usa para ouvir agora.',
    outputIntro: 'Para onde vai o som hoje?',
    pedalsIntro: 'Confira o que cada pedal faz antes de qualquer patch opinar.',
    midiIntro: 'Pule este passo se só este computador está ligado ao pedal por MIDI.',
    backupIntro:
      'Antes de um show, guarde uma cópia do pedal inteiro neste computador: todos os slots e os ajustes de sistema em um arquivo. Ler tudo leva alguns minutos na primeira vez.',
    backupMinutes: (minutes: number) =>
      minutes <= 1 ? 'Isto demora cerca de um minuto.' : `Isto demora cerca de ${minutes} minutos.`,
    backupStart: 'Ler tudo e salvar o backup',
    backupSave: 'Salvar o arquivo de backup',
    backupSaved: (file: string) => `Backup salvo como ${file}.`,
    backupWaiting: 'Lendo o pedal — o arquivo é salvo quando terminar.',
    syncIntro:
      'O Rigbench agora lê todos os slots, para que o Palco tenha cada nome e cada mapa de pedais à mão. Você pode acompanhar aqui ou seguir em frente: a leitura continua atrás de qualquer tela.',
    syncReady: 'Tudo lido. O rig está pronto.',
    summaryWarn: (steps: string) => `Pulado na configuração: ${steps}.`,
    reopen: 'Abrir a configuração de palco',
  },
  maestro: {
    open: 'Abrir o Maestro',
    title: 'Maestro',
    placeholder: 'Peça uma mudança, ou pergunte como um controle funciona…',
    thinking: 'Pensando…',
    send: 'Enviar',
    stop: 'Parar',
    applyAll: 'Aplicar tudo',
    applyItem: 'Aplicar',
    applied: (count: number) =>
      count === 1 ? 'Aplicado ✓ (1 não gravada)' : `Aplicado ✓ (${count} não gravadas)`,
    discard: 'Descartar',
    revert: 'Desfazer',
    proposal: (intent: string) => (intent ? `Proposta · ${intent}` : 'Proposta'),
    current: 'Agora',
    proposed: 'Proposto',
    rejected: (reason: string) => `Recusado: ${reason}`,
    clampedNote: 'Cortado para caber no campo',
    staleDivider: (note: string) => note,
    cleared: 'Conversa limpa',
    clear: 'Limpar conversa',
    close: 'Fechar',
    sourceCopy: (source: string, mode: string, unsaved: number) =>
      unsaved > 0 ? `cópia de ${source} · ${mode} · 🟠 ${unsaved}` : `cópia de ${source} · ${mode}`,
    needsKey: {
      title: 'Adicione uma chave da API Gemini',
      body: 'O Maestro fala com o Google Gemini com uma chave que você traz. Ela fica só neste navegador.',
      openSettings: 'Abrir ajustes da chave',
    },
    settings: {
      title: 'Ajustes do Maestro',
      key: 'Chave da API Gemini',
      remember: 'Lembrar neste dispositivo',
      test: 'Testar chave',
      testOk: 'A chave funciona',
      forget: 'Esquecer a chave',
      privacy:
        'Restrinja a chave por HTTP referrer à origem deste site, defina um teto de gasto no Google AI Studio e rotacione a chave se ela já vazou. A chave nunca entra no repositório do Rigbench.',
      close: 'Pronto',
    },
    err: {
      badKey: 'O Gemini rejeitou esta chave.',
      rateLimited: 'Limite de uso do Gemini. Espere um pouco e tente de novo.',
      unreachable: 'Não foi possível falar com o Gemini.',
      timeout: 'O Gemini demorou demais.',
      stageLive: 'O Maestro não muda o patch com o Palco em tela cheia.',
      generic: 'Algo deu errado ao falar com o Maestro.',
    },
    voice: {
      label: 'Entrada por voz',
      unsupported: 'A voz precisa do Chrome ou do Edge.',
      listening: 'Ouvindo…',
    },
    loadSlot: {
      confirm: (slot: string, unsaved: number) =>
        unsaved > 0
          ? `Carregar ${slot}? Você tem ${unsaved} alteração(ões) não gravada(s) que serão perdidas.`
          : `Carregar ${slot}?`,
      load: 'Carregar',
      cancel: 'Cancelar',
      loaded: (slot: string) => `Carregado ${slot}.`,
    },
    policy: {
      systemDenied: 'Ajustes de sistema não passam pelo Maestro. Abra Dispositivo.',
      slotDenied: 'O Maestro nunca grava um slot do pedal. Use a Biblioteca para salvar.',
      stageLive: 'A edição pausa no Palco. Saia do Palco para mudar o patch.',
    },
    hint: {
      searchRound: 'Buscando mais parâmetros…',
    },
    stopped: 'Parado.',
  },
  studio: {
    title: 'Estúdio',
    sessionSwitcher: 'Sessão de criação',
    session: {
      system: 'Sistema',
      patch: 'Patch',
      library: 'Biblioteca',
    },
    goStage: 'Ir ao Palco',
    panelsTitle: 'Som',
    custom: 'Personalizado',
    stub: 'Em breve',
    renameHint: 'Renomeie a cópia de trabalho no editor avançado.',
    careHint: 'Faça backup e restaure o sistema do pedal em Dispositivo.',
    modeHint: 'Guitarra ↔ Baixo refaz todos os slots. Mude em Dispositivo com confirmação dupla.',
    openAdvanced: 'Abrir avançado',
    openDevice: 'Abrir Dispositivo',
    advancedEditor: 'Editor avançado',
    advancedGk: 'Conjuntos GK (avançado)',
    applyFailed: 'Esse seletor de som não pôde ser aplicado.',
  },
  librarian: {
    problems: {
      'no-patch-data': 'Este arquivo não contém um patch de GR-55.',
      'bad-checksum': 'Este arquivo está danificado: uma mensagem dele falha na verificação.',
      'out-of-range':
        'Este arquivo está danificado: ele aponta para dados fora de um patch de GR-55.',
    },  },
};
