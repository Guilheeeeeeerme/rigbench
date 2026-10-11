/** The routes the GR-55 owns, under /gr55. Studio is craft home once the pedal is set up. */
export const connectRoute = 'conectar';
export const setupRoute = 'configurar';
export const studioRoute = 'estudio';
export const stageRoute = 'palco';
export const setlistRoute = 'agenda';
export const libraryRoute = 'patches';
export const editorRoute = 'editor';
export const deviceRoute = 'dispositivo';
export const gkRoute = 'dispositivo/gk';

const base = '/gr55';
export const setupHref = `${base}/${setupRoute}`;
export const studioHref = `${base}/${studioRoute}`;
export const stageHref = `${base}/${stageRoute}`;
export const setlistHref = `${base}/${setlistRoute}`;
export const libraryHref = `${base}/${libraryRoute}`;
export const editorRootHref = `${base}/${editorRoute}`;
export const deviceHref = `${base}/${deviceRoute}`;
export const gkHref = `${base}/${gkRoute}`;
