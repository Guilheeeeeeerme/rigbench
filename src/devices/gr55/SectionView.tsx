import { useMemo, useState, useSyncExternalStore } from 'react';
import { en } from '../../copy/en';
import type { FieldReference, NumericField } from '../../protocol/RolandAddressMap';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import { FieldControl } from './FieldControl';
import type { Gr55Editor } from './editor';
import { effectOfFields, memberOf } from './pages';
import type { Section } from './pages';

const ASSIGN_TARGET_DESCRIPTION = 'ASSIGN Target';

function assignsMapFor(editor: Gr55Editor) {
  const maps = RolandGR55SysExConfig.gr55!;
  return editor.gkMode === 'BASS' ? maps.assignsMapBassMode : maps.assignsMapGuitarMode;
}

/** One section of a page: its fields, generated from the address map. */
export function SectionView({
  editor,
  section,
  advanced = true,
}: {
  editor: Gr55Editor;
  section: Section;
  /** The Advanced switch: without it, only the curated essentials show. */
  advanced?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const effects = useMemo(() => effectOfFields(section), [section]);

  const typeField = section.typeKey
    ? (memberOf(section.struct, section.typeKey) as FieldReference)
    : undefined;
  // Re-render when the effect type changes; a no-op subscription when there is none.
  useSyncExternalStore(editor.subscribe, () =>
    typeField ? editor.fieldSnapshot(typeField.address) : '',
  );
  const typeValue = typeField && editor.read(typeField);
  const activeEffect = typeValue?.ok ? String(typeValue.value) : undefined;

  const visibleKeys =
    advanced || section.essentialKeys === undefined
      ? section.keys
      : section.keys.filter((key) => section.essentialKeys!.includes(key));
  // A section with no essentials stays out of the way entirely in Essential mode.
  if (visibleKeys.length === 0) {
    return null;
  }

  const groups: { effect: string | undefined; keys: string[] }[] = [];
  for (const key of visibleKeys) {
    const effect = effects.get(key);
    if (effect != null && effect !== activeEffect && !showAll) {
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && last.effect === effect) {
      last.keys.push(key);
    } else {
      groups.push({ effect, keys: [key] });
    }
  }

  return (
    <section className="section">
      <h2>{section.title}</h2>
      {section.typeKey && (
        <label className="show-all">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
          />
          {en.gr55.showAllEffects}
        </label>
      )}
      {groups.map((group) => (
        <div key={`${group.effect}:${group.keys[0]}`} className="field-group">
          {group.effect && <h3>{group.effect}</h3>}
          <div className="fields">
            {group.keys.map((key) => {
              let field = memberOf(section.struct, key) as FieldReference;
              const isAssignTarget = field.definition.description === ASSIGN_TARGET_DESCRIPTION;
              if (isAssignTarget) {
                // The target is a number; the assigns map knows which parameter each one is.
                field = assignsMapFor(editor).reinterpretTargetField(
                  field as FieldReference<NumericField>,
                );
              }
              return (
                <FieldControl
                  key={key}
                  editor={editor}
                  field={field}
                  picker={isAssignTarget}
                  readOnly={section.readOnlyKeys?.includes(key)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
