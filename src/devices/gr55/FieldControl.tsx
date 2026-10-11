import { useId, useState, useSyncExternalStore } from 'react';
import { useEnumLabel, useT } from '../../copy';
import type { EnumGroup } from '../../copy';
import {
  AsciiStringField,
  isBooleanField,
  isEnumField,
  isNumericField,
} from '../../protocol/RolandAddressMap';
import type {
  BooleanField,
  EnumField,
  FieldReference,
  FieldType,
  NumericField,
} from '../../protocol/RolandAddressMap';
import type { FieldValue } from './editor';
import { scopeOf } from './changeTracking';

const hex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');

function fieldLabel(description: string): string {
  // The GK mode is already settled by the page; the map repeats it on every such field.
  return description.replace(/\s*\(GK mode:\w+\)$/, '');
}

/**
 * Whatever holds the bytes behind a control: the patch editor, or the pedal-wide
 * settings. A control only reads a field, writes it, and hears when it changed.
 */
export interface FieldHost {
  subscribe(listener: () => void): () => void;
  fieldSnapshot(address: number): string;
  read<T>(field: FieldReference<FieldType<T>>): FieldValue<T>;
  write<T>(field: FieldReference<FieldType<T>>, value: T): void;
}

function ScopeChip({ fieldAddress }: { fieldAddress: number }) {
  const t = useT();
  const scope = scopeOf(fieldAddress);
  const label =
    scope === 'working-copy' ? t('gr55.workspace.workingCopy') : t('gr55.workspace.pedal');
  const hint =
    scope === 'working-copy' ? t('gr55.workspace.workingCopyHint') : t('gr55.workspace.pedalHint');
  return (
    <span
      className={scope === 'working-copy' ? 'scope chip-amber' : 'scope chip-blue'}
      title={hint}
      aria-label={`${label}: ${hint}`}
    >
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  );
}

interface ControlProps<T extends FieldType<unknown>> {
  id: string;
  editor: FieldHost;
  field: FieldReference<T>;
  value: ReturnType<T['decode']>;
  disabled: boolean;
}

function SwitchControl({ id, editor, field, value, disabled }: ControlProps<BooleanField>) {
  const type = field.definition.type;
  const shownOn = value !== type.invertedForDisplay;
  return (
    <span className="control switch">
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={shownOn}
        disabled={disabled}
        onChange={(event) => editor.write(field, event.target.checked !== type.invertedForDisplay)}
      />
      <output htmlFor={id}>{value ? type.trueLabel : type.falseLabel}</output>
    </span>
  );
}

function EnumControl({
  id,
  editor,
  field,
  value,
  disabled,
  enumGroup,
}: ControlProps<EnumField> & { enumGroup?: EnumGroup }) {
  const enumLabel = useEnumLabel();
  const labels = Object.values(field.definition.type.labels);
  return (
    <span className="control">
      <select
        id={id}
        value={labels.indexOf(value)}
        disabled={disabled}
        onChange={(event) => editor.write(field, labels[Number(event.target.value)])}
      >
        {labels.map((label, index) => (
          <option key={index} value={index}>
            {enumGroup ? enumLabel(enumGroup, label) : label}
          </option>
        ))}
      </select>
    </span>
  );
}

function formatNumber(type: NumericField, value: number): string {
  try {
    return type.format(value);
  } catch {
    return String(value);
  }
}

function SliderControl({ id, editor, field, value, disabled }: ControlProps<NumericField>) {
  const type = field.definition.type;
  return (
    <span className="control slider">
      <input
        id={id}
        type="range"
        min={type.min}
        max={type.max}
        step={type.step}
        value={value}
        disabled={disabled}
        onChange={(event) => editor.write(field, Number(event.target.value))}
      />
      <output htmlFor={id}>{formatNumber(type, value)}</output>
    </span>
  );
}

/** A numeric field whose every value has a name, such as an assign target. */
function PickerControl({ id, editor, field, value, disabled }: ControlProps<NumericField>) {
  const type = field.definition.type;
  const values: number[] = [];
  for (let option = type.min; option <= type.max; option += type.step) {
    values.push(option);
  }
  return (
    <span className="control">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => editor.write(field, Number(event.target.value))}
      >
        {!values.includes(value) && <option value={value}>{value}</option>}
        {values.map((option) => (
          <option key={option} value={option}>
            {formatNumber(type, option)}
          </option>
        ))}
      </select>
    </span>
  );
}

/**
 * The decoded name has trailing spaces removed. While the field is focused, keep the
 * draft the user is typing so a space before the next letter is not eaten.
 */
export function shownTextValue(decoded: string, draft: string | null): string {
  return draft ?? decoded;
}

function TextControl({ id, editor, field, value, disabled }: ControlProps<AsciiStringField>) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="control">
      <input
        id={id}
        type="text"
        value={shownTextValue(value, draft)}
        maxLength={field.definition.size}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        onFocus={() => setDraft(value)}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          editor.write(field, next);
        }}
      />
    </span>
  );
}

export interface FieldControlProps {
  editor: FieldHost;
  field: FieldReference;
  readOnly?: boolean;
  /** Translates the values of a curated list; the pedal's own wording is the fallback. */
  enumGroup?: EnumGroup;
  /** Replaces the map's description as the label. */
  label?: string;
  /** Show a numeric field as a list of named values instead of a slider. */
  picker?: boolean;
}

/** The control for one parameter, chosen from the type the address map gives it. */
export function FieldControl({
  editor,
  field,
  readOnly = false,
  picker = false,
  enumGroup,
  label,
}: FieldControlProps) {
  const t = useT();
  const id = useId();
  useSyncExternalStore(editor.subscribe, () => editor.fieldSnapshot(field.address));
  const type = field.definition.type;
  const result = editor.read(field);

  let control;
  if (!result.ok) {
    control = (
      <output className="control unknown">{t('gr55.unknownValue', hex(result.raw))}</output>
    );
  } else {
    const props = { id, editor, value: result.value, disabled: readOnly };
    if (isBooleanField(type)) {
      control = <SwitchControl {...props} field={field as FieldReference<BooleanField>} />;
    } else if (isEnumField(type)) {
      control = (
        <EnumControl {...props} field={field as FieldReference<EnumField>} enumGroup={enumGroup} />
      );
    } else if (isNumericField(type)) {
      const numeric = field as FieldReference<NumericField>;
      control = picker ? (
        <PickerControl {...props} field={numeric} />
      ) : (
        <SliderControl {...props} field={numeric} />
      );
    } else if (type instanceof AsciiStringField) {
      control = <TextControl {...props} field={field as FieldReference<AsciiStringField>} />;
    } else {
      return null;
    }
  }

  return (
    <div className="field">
      <span className="field-head">
        <label htmlFor={id}>{label ?? fieldLabel(field.definition.description)}</label>
        <ScopeChip fieldAddress={field.address} />
      </span>
      {control}
    </div>
  );
}
