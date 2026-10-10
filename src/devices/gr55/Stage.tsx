import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { t, useT } from '../../copy';
import type { BooleanField, EnumField, FieldReference } from '../../protocol/RolandAddressMap';
import { TEMPORARY_PATCH } from './patchLayout';
import type { Gr55Editor } from './editor';
import { effectChoice } from './stageInfo';

const patch = TEMPORARY_PATCH;

/** Every editable power switch, in the order the chain runs. */
const POWER_FIELDS: { name: string; field: FieldReference<BooleanField> }[] = [
  { name: t('gr55.blocks.amp'), field: patch.ampModNs.ampSwitch },
  { name: t('gr55.blocks.mod'), field: patch.ampModNs.modSwitch },
  { name: t('gr55.blocks.mfx'), field: patch.mfx.mfxSwitch },
  { name: t('gr55.blocks.eq'), field: patch.sendsAndEq.eqSwitch },
  { name: t('gr55.blocks.chorus'), field: patch.sendsAndEq.chorusSwitch },
  { name: t('gr55.blocks.delay'), field: patch.sendsAndEq.delaySwitch },
  { name: t('gr55.blocks.reverb'), field: patch.sendsAndEq.reverbSwitch },
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
  return result.ok ? String(result.value) : t('librarian.notRead');
}

function Pedals({ editor }: { editor: Gr55Editor }) {
  const t = useT();
  // Keeps the pedal list current without a patch reload.
  useSyncExternalStore(editor.subscribe, () =>
    editor.fieldSnapshot(patch.common.ctl.function?.address ?? 0),
  );
  return (
    <section className="stage-block">
      <h2>{t('stage.pedals')}</h2>
      <ul className="stage-pedals">
        {PATCH_PEDALS.map(({ name, field }) => (
          <li key={field.address}>
            {name} — {pedalLabel(editor, field)}
          </li>
        ))}
        <li>FS1 · FS2 · FS3 — {t('stage.fixed')}</li>
      </ul>
    </section>
  );
}

function Effects({ editor }: { editor: Gr55Editor }) {
  const t = useT();
  // Keeps the effect row current without a patch reload.
  useSyncExternalStore(editor.subscribe, () =>
    editor.fieldSnapshot(patch.ampModNs.modSwitch.address),
  );
  return (
    <section className="stage-block">
      <h2>{t('stage.effects')}</h2>
      <ul className="stage-effects">
        {POWER_FIELDS.map(({ name, field }) => {
          const on = switchOn(editor, field);
          return (
            <li key={field.address} className={on ? 'on' : 'off'}>
              <span className="dot" aria-hidden="true" />
              {name} <strong>{on ? t('stage.on') : t('stage.off')}</strong>
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
  const t = useT();
  const patchName = useSyncExternalStore(editor.subscribe, () => editor.patchName);
  const changeCount = editor.changeCount;
  return (
    <main className="stage">
      <Link className="stage-back" to="/gr55/patches">
        {t('gr55.navLibrary')}
      </Link>
      {changeCount > 0 && (
        <p className="notice stage-notice" role="alert">
          {t('stage.playingCopy')}
        </p>
      )}
      <p className="stage-patch">{patchName || t('gr55.unnamed')}</p>
      <Pedals editor={editor} />
      <Effects editor={editor} />
      <p className="hint stage-footnote">{t('stage.footnote')}</p>
    </main>
  );
}
