/** Musician-facing label ↔ technical GR-55 parameter name. */
export const TECH_LABELS: Record<string, { musicianEn: string; musicianPt: string; technical: string }> =
  {
    lowVelocityCut: {
      musicianEn: 'Unwanted notes',
      musicianPt: 'Notas indesejadas',
      technical: 'LOW VELOCITY CUT',
    },
    playFeel: {
      musicianEn: 'Playing dynamics',
      musicianPt: 'Dinâmica da pegada',
      technical: 'PLAY FEEL',
    },
    velocityDynamics: {
      musicianEn: 'How easily loud notes fire',
      musicianPt: 'Facilidade de notas fortes',
      technical: 'VELOCITY DYNAMICS',
    },
    chromaticOff: {
      musicianEn: 'Bends follow the string',
      musicianPt: 'Bends seguem a corda',
      technical: 'CHROMATIC OFF',
    },
    outputSelect: {
      musicianEn: 'Where you listen',
      musicianPt: 'Onde você ouve',
      technical: 'OUTPUT SELECT',
    },
    assignTarget: {
      musicianEn: 'Pedal changes to solo sound',
      musicianPt: 'Pedal muda para som de solo',
      technical: 'ASSIGN TARGET',
    },
  };
