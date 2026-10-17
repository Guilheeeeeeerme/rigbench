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
    cancel: 'Cancelar',
    noReply:
      'Nada respondeu nestas portas. Confira se o pedal está ligado e se as duas portas são dele.',
    wrongDevice: 'O dispositivo nestas portas respondeu, mas não é um GR-55.',
    simulate: 'Usar um pedal simulado',
    lost: 'A conexão com o pedal falhou.',
  },
  gr55: {
    reading: (done: number, total: number) => `Lendo o patch do pedal… ${done}/${total}`,
    search: {
      placeholder: 'Encontre qualquer parâmetro deste patch…',
    },
    navPatch: 'Patch',
    bankChatHint:
      'O chat nesta página pode ajustar tudo deste banco — as três teclas, CTL, expression e o patch que está soando.',
    bankMode: {
      advanced: 'Avançado',
    },
    toneDeck: {
      title: 'Timbres e mix',
      noTone: 'Sem timbre',
    },
    tonePicker: {
      close: 'Fechar',
      search: 'Buscar timbres',
      searchPlaceholder: 'Buscar timbres…',
      recent: 'Recentes',
      all: 'Todos os timbres',
      empty: 'Nenhum timbre corresponde a essa busca.',
      typeToSearch: (count: number) =>
        `Mostrando uma página de ${count} timbres — digite para buscar o resto.`,
      pcm1Title: 'Timbre PCM 1',
      pcm2Title: 'Timbre PCM 2',
      modelingTitle: 'Timbre de modelagem',
    },
    simple: {
      applyFailed: (reason: string) => `Não foi possível aplicar esse perfil (${reason}).`,
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      saving: 'Trabalhando…',
    },
    mvp: {
      title: 'Gerador de patch GR-55',
      activePatch: 'Patch ativo',
      soundingAs: 'Soando como',
      soundingHint: 'Gere um patch inicial completo; o ajuste fino fica na pedaleira.',
      save: 'Gravar na GR-55',
      saveBusy: 'Gravando…',
      saveOk: 'Gravado e verificado no slot USER.',
      saveFail: (reason: string) => `Não foi possível gravar (${reason}).`,
      slotChanged: 'A pedaleira mudou de patch. Recarregado — nada foi sobrescrito.',
      jobsLabel: 'O que você quer fazer?',
      jobSetup: 'Configurar instrumento',
      jobSetupBlurb: 'Guitarra / GK / saída — separado do som',
      jobChoose: 'Escolher um som',
      jobChooseBlurb: 'Ritmo → função → som → aplicar',
      jobShape: 'Ajustar este som',
      jobShapeBlurb: 'Pitch, CTL, problemas leves',
      setupLead:
        'Escolha o instrumento físico (seed opcional de calibração) e aplique uma vez. Isso não muda o patch musical — só SYSTEM / GK, com confirmação.',
      chooseLead:
        'Selecione ritmo → função musical → som e aplique. Cada escolha monta um patch inicial completo — não é editor de fine-tuning. O polimento final é na GR-55.',
      shapeLead:
        'Ajustes leves da sessão no patch que já está tocando. Para outro ritmo ou função, volte a Escolher.',
      replaceCallout:
        'Aplicar substitui o patch temporário inteiro (fontes, FX, CTL/EXP). Não grava GK SENS nem PU TYPE. Metal não deve ficar sob o sax.',
      shapeCallout: 'Quer outro estilo? Escolher um som — Ajustar não é o catálogo.',
      shapeNeedSound: 'Aplique um som primeiro; depois ajuste aqui.',
      sectionFeel: 'Tocabilidade',
      sectionPitch: 'Pitch',
      sectionControls: 'Controles',
      sectionTrouble: 'Ajustes',
      sectionAdvanced: 'Avançado (escape)',
      pitchShift: 'Pitch (semitons)',
      pitchZero: '0 — sem deslocamento',
      pitchSemitones: (value: string) => `${value} semitons`,
      pitchCorrection: 'Correção de pitch (Chromatic)',
      pitchCorrectionHint:
        'Separada do pitch em semitons. O padrão segue o perfil do som; sua escolha aqui é mantida ao substituir um som.',
      pickInstrument: 'Seu instrumento',
      pickOutput: 'Onde você ouve',
      pickFamily: 'Família',
      familyAll: 'Todas as famílias',
      pickRhythm: 'Ritmo',
      pickRole: 'Função musical',
      pickPreset: 'Som',
      chooseInstrumentHint: (name: string) =>
        `Recomendações filtradas para “${name}” (do Setup). Aplicar som nunca muda o GK.`,
      incompatibleInstrument: 'Não recomendado para o seu instrumento',
      replaceSound: 'Aplicar na GR-55',
      applyInstrument: 'Aplicar configuração do instrumento',
      systemWarnTitle: 'Isso muda ajustes do pedal inteiro',
      systemWarnBody:
        'Instrumento, sensibilidade e saída ficam em SYSTEM / GK sets. Afetam outros patches que usam o mesmo GK set. Continuar?',
      replaceWarnTitle: 'Aplicar este patch inicial?',
      replaceWarnBody: (name: string) =>
        `Limpa o patch temporário e monta “${name}” do zero — fontes, amp, FX e CTL/EXP do patch. SYSTEM/GK ficam intactos. Pitch e sua correção de pitch são mantidos. A memória USER só muda quando você Gravar.`,
      systemScope: 'SYSTEM / GK',
      patchScope: 'Patch temporário',
      bassModeWarn:
        'Modo baixo exige Guitar/Bass = BASS na pedaleira e religar. Bancos de patch separados.',
      piezoConfirm: 'Confirme a marca do piezo se o tracking falhar',
      pickCalibration: 'Seed opcional de velocidade do GK',
      gkSetNameHint: (name: string) =>
        `Vai nomear o GK set ativo como “${name}” (não sobrescreve outros sets a menos que aquele esteja selecionado).`,
      caimbeGhostHint:
        'Ouvindo notas fantasmas? Depois do setup, abra Ajustar este som → Ajustes → Notas fantasmas para um check de 5 min de SENS + LVC (use o medidor da pedaleira — este app não lê níveis ao vivo).',
      priorityBadge: 'Recomendado',
      statusApproximation: 'Aproximação — não é instrumento nativo da GR-55',
      statusImplemented: 'Ponto de partida curado (não testado em hardware)',
      statusDocumented: 'Capacidade documentada do hardware',
      statusHardware: 'Testado em hardware',
      technique: 'Dica de execução',
      ctlLabel: 'Pedal CTL',
      expLabel: 'Pedal de expressão',
      expSwLabel: 'Chave EXP',
      feelCalibrate:
        'A SENS por corda é guiada pelo medidor da própria pedaleira. Este app não lê níveis ao vivo via MIDI — ajuste a SENS olhando o display da GR-55.',
      feelRefineHint:
        'Toque e níveis finais ficam na GR-55. Use Setup para seeds de GK; Troubleshooting só quando as notas falharem.',
      applyFix: 'Tentar correção sugerida',
      collapse: 'Recolher',
      expand: 'Expandir',
      priorityBalance: 'Equilíbrio',
    },
    advanced: {
      title: 'Avançado',
      showAll: 'Mostrar todos os parâmetros',
      pages: 'Seções do patch',
    },
    exit: 'Sair',
    sync: 'Sincronizar',
    syncBusy: 'Sincronizando…',
    syncHint:
      'Recarrega o que o pedal tem gravado. Em um USER slot, substitui as edições temporárias pelo patch salvo.',
    authorityApp: 'Confiando no app',
    authorityPedal: 'Espelhando o pedal',
    patchSlotUnknown: 'Desconhecido / não é slot de usuário',
    workspace: {
      workingCopy: 'Cópia de trabalho',
      workingCopyHint:
        'Este é o patch que o pedal está tocando agora. Ele só existe enquanto este patch está selecionado: o pedal o descarta quando você troca de patch.',
      pedal: 'Sistema',
      pedalHint: 'Ajuste de sistema, do pedal inteiro. O mesmo para todos os patches.',
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
      revertConfirm: (count: number) =>
        `Desfazer ${count === 1 ? 'a 1 alteração não gravada' : `todas as ${count} alterações não gravadas`} e voltar ` +
        'a como estava no pedal? Enquanto isso o pedal segue tocando o patch gravado.',
      saveHint: (slot: string) => `Este patch veio de ${slot}. Gravar o devolve para lá.`,
      saveNoSlot:
        'Este patch veio da tela do pedal ou de um arquivo, então não há slot onde gravar. Use Gravar como… para guardá-lo em um slot.',
      advanced: 'Avançado',
    },
    blocks: {
      intro:
        'Como o som percorre este patch. Clique em um bloco para ajustar seus parâmetros; blocos acinzentados estão desligados.',
      assignCables: 'Cabos: ao pisar em um pedal',
    },
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
    onOff: 'Ligado / desligado',
    on: 'Ligado',
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
      STACK: 'Amp stack, entrada de guitarra',
      'JC-120 RETURN': 'Amp JC-120, entrada return',
      'COMBO RETURN': 'Amp combo, entrada return',
      'STACK RETURN': 'Amp stack, entrada return',
      'B-AMP WITH TWEETER': 'Amp de baixo com tweeter',
      'B-AMP NO TWEETER': 'Amp de baixo sem tweeter',
    },
    guitarOut: {
      OFF: 'Nada',
      'NORMAL PU': 'O captador normal',
      BOTH: 'Os dois',
    },
    polarity: {
      REVERSE: 'Invertida',
    },
    midiMode: {
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
};
