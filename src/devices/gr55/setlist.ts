import type { GkMode } from './editor';
import { USER_PATCH_COUNT } from './patchLayout';

/** One song of the show: a name of the musician's own, and the slot that plays it. */
export interface Song {
  id: string;
  title: string;
  mode: GkMode;
  userPatchNumber: number;
  /** Names the musician gave the cuts of this song's patch, by cut key ("assign-3"). */
  cuts: Record<string, string>;
}

export interface Setlist {
  name: string;
  songs: Song[];
}

const SETLIST_KEY = 'rigbench.gr55.setlist';
const FILE_FORMAT = 'rigbench-gr55-setlist';
const FILE_VERSION = 1;

export class SetlistFileError extends Error {}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newSong(title: string, mode: GkMode, userPatchNumber: number): Song {
  return { id: newId(), title, mode, userPatchNumber, cuts: {} };
}

/** Keeps only what is a well-formed song; anything else in the data is dropped. */
function sanitize(data: unknown): Setlist {
  const source = (data ?? {}) as { name?: unknown; songs?: unknown };
  const songs: Song[] = [];
  for (const entry of Array.isArray(source.songs) ? source.songs : []) {
    const song = entry as Partial<Song>;
    const slot = song?.userPatchNumber;
    if (
      typeof song?.title !== 'string' ||
      typeof slot !== 'number' ||
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot >= USER_PATCH_COUNT
    ) {
      continue;
    }
    const cuts: Record<string, string> = {};
    for (const [key, label] of Object.entries(song.cuts ?? {})) {
      if (typeof label === 'string' && label.trim() !== '') {
        cuts[key] = label;
      }
    }
    songs.push({
      id: typeof song.id === 'string' && song.id ? song.id : newId(),
      title: song.title,
      mode: song.mode === 'BASS' ? 'BASS' : 'GUITAR',
      userPatchNumber: slot,
      cuts,
    });
  }
  return { name: typeof source.name === 'string' ? source.name : '', songs };
}

export function loadSetlist(): Setlist {
  try {
    return sanitize(JSON.parse(localStorage.getItem(SETLIST_KEY) ?? 'null'));
  } catch {
    return { name: '', songs: [] };
  }
}

export function saveSetlist(setlist: Setlist): void {
  try {
    localStorage.setItem(SETLIST_KEY, JSON.stringify(setlist));
  } catch {
    // Without storage the setlist still holds for this visit.
  }
}

/** The setlist as a file another musician can open. */
export function exportSetlist(setlist: Setlist): string {
  return JSON.stringify({ format: FILE_FORMAT, version: FILE_VERSION, ...setlist }, null, 2);
}

/** Reads a setlist file. Throws SetlistFileError when it is not one. */
export function importSetlist(text: string): Setlist {
  let data: { format?: unknown };
  try {
    data = JSON.parse(text) as { format?: unknown };
  } catch {
    throw new SetlistFileError('not JSON');
  }
  if (!data || data.format !== FILE_FORMAT) {
    throw new SetlistFileError('not a setlist');
  }
  return sanitize(data);
}

/** The songs with one moved to another place in the order. */
export function moveSong(songs: readonly Song[], from: number, to: number): Song[] {
  if (from === to || from < 0 || from >= songs.length || to < 0 || to >= songs.length) {
    return [...songs];
  }
  const next = [...songs];
  const [song] = next.splice(from, 1);
  next.splice(to, 0, song);
  return next;
}

/**
 * Whether going from one song to another makes the pedal change patches. The pedal is
 * silent for about a second when it does; songs that share a slot switch with no gap.
 */
export function changesPatch(from: Song | undefined, to: Song | undefined): boolean {
  return Boolean(from && to && from.userPatchNumber !== to.userPatchNumber);
}

/** How many times playing the songs in order makes the pedal change patches. */
export function patchChangeCount(songs: readonly Song[]): number {
  let count = 0;
  for (let index = 1; index < songs.length; index++) {
    if (changesPatch(songs[index - 1], songs[index])) {
      count++;
    }
  }
  return count;
}
