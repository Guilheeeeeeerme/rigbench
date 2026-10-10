import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { en } from '../../copy/en';
import type { BooleanField, EnumField, FieldReference } from '../../protocol/RolandAddressMap';
import { TEMPORARY_PATCH } from './patchLayout';
import type { Gr55Editor } from './editor';
import { effectChoice } from './stageInfo';

const patch = TEMPORARY_PATCH;

/** Every editable power switch, in the order the chain runs. */
const POWER_FIELDS: { name: string; field: FieldReference<BooleanField> }[] = [
  { name: en.gr55.blocks.amp, field: patch.ampModNs.ampSwitch },
  { name: en.gr55.blocks.mod, field: patch.ampModNs.modSwitch },
  { name: en.gr55.blocks.mfx, field: patch.mfx.mfxSwitch },
  { name: en.gr55.blocks.eq, field: patch.sendsAndEq.eqSwitch },
  { name: en.gr55.blocks.chorus, field: patch.sendsAndEq.chorusSwitch },
  { name: en.gr55.blocks.delay, field: patch.sendsAndEq.delaySwitch },
  { name: en.gr55.blocks.reverb, field: patch.sendsAndEq.reverbSwitch },
];

/** The pedal steps the patch defines; FS1–FS3 are fixed by the hardware. */
const PATCH_PEDALS: { name: string; field: FieldReference<EnumField> }[] = [
  { name: 'CTL1', field: patch.common.ctl.function as FieldReference<EnumField> },
  { name: 'EXP', field: patch.common.expPdlOff.function as FieldReference<EnumField> },
  { name: 'EXP switch', field: patch.common.expSw.function as FieldReference<EnumField> },
];

function switchOn(editor: Gr55Editor, field: FieldReference<BooleanField>): boolean | undefined {
  const result = editor.read(field);
  if (!result.ok) {
    return undefined;
  }
  return result.value !== field.definition.type.invertedForDisplay;
}

function pedalLabel(editor: Gr55Editor, field: FieldReference<EnumField>): string {
  const result = editor.read(field);
  return result.ok ? String(result.value) : en.librarian.notRead;
}

function Pedals({ editor }: { editor: Gr55Editor }) {
  // Keeps the pedal list current without a patch reload.
  useSyncExternalStore(editor.subscribe, () =>
    editor.fieldSnapshot(patch.common.ctl.function?.address ?? 0),
  );
  return (
    <section className="stage-block">
      <h2>{en.stage.pedals}</h2>
      <ul className="stage-pedals">
        {PATCH_PEDALS.map(({ name, field }) => (
          <li key={field.address}>
            {name} — {pedalLabel(editor, field)}
          </li>
        ))}
        <li>FS1 · FS2 · FS3 — {en.stage.fixed}</li>
      </ul>
    </section>
  );
}

function Effects({ editor }: { editor: Gr55Editor }) {
  // Keeps the effect row current without a patch reload.
  useSyncExternalStore(editor.subscribe, () =>
    editor.fieldSnapshot(patch.ampModNs.modSwitch.address),
  );
  return (
    <section className="stage-block">
      <h2>{en.stage.effects}</h2>
      <ul className="stage-effects">
        {POWER_FIELDS.map(({ name, field }) => {
          const on = switchOn(editor, field);
          return (
            <li key={field.address} className={on ? 'on' : 'off'}>
              <span className="dot" aria-hidden="true" />
              {name} <strong>{on ? en.stage.on : en.stage.off}</strong>
              {on && effectChoice(editor, field) && <em>{effectChoice(editor, field)}</em>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The stage: calm, dark, big, and read-only. What sounds, what each pedal step does,
 * and whether the pedal is playing the working copy or a saved slot.
 */
export function Stage({ editor }: { editor: Gr55Editor }) {
  const patchName = useSyncExternalStore(editor.subscribe, () => editor.patchName);
  const changeCount = editor.changeCount;
  return (
    <main className="stage">
      <Link className="stage-back" to="/gr55/patches">
        {en.gr55.navLibrary}
      </Link>
      {changeCount > 0 && (
        <p className="notice stage-notice" role="alert">
          {en.stage.playingCopy}
        </p>
      )}
      <p className="stage-patch">{patchName || en.gr55.unnamed}</p>
      <Pedals editor={editor} />
      <Effects editor={editor} />
      <p className="hint stage-footnote">{en.stage.footnote}</p>
    </main>
  );
}
