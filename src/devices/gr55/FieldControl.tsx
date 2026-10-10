import { useId, useState, useSyncExternalStore } from 'react';
import { en } from '../../copy/en';
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
import type { Gr55Editor } from './editor';

const hex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');

function fieldLabel(description: string): string {
  // The GK mode is already settled by the page; the map repeats it on every such field.
  return description.replace(/\s*\(GK mode:\w+\)$/, '');
}

interface ControlProps<T extends FieldType<unknown>> {
  id: string;
  editor: Gr55Editor;
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

function EnumControl({ id, editor, field, value, disabled }: ControlProps<EnumField>) {
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
            {label}
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
  editor: Gr55Editor;
  field: FieldReference;
  readOnly?: boolean;
  /** Show a numeric field as a list of named values instead of a slider. */
  picker?: boolean;
}

/** The control for one parameter, chosen from the type the address map gives it. */
export function FieldControl({
  editor,
  field,
  readOnly = false,
  picker = false,
}: FieldControlProps) {
  const id = useId();
  useSyncExternalStore(editor.subscribe, () => editor.fieldSnapshot(field.address));
  const type = field.definition.type;
  const result = editor.read(field);

  let control;
  if (!result.ok) {
    control = <output className="control unknown">{en.gr55.unknownValue(hex(result.raw))}</output>;
  } else {
    const props = { id, editor, value: result.value, disabled: readOnly };
    if (isBooleanField(type)) {
      control = <SwitchControl {...props} field={field as FieldReference<BooleanField>} />;
    } else if (isEnumField(type)) {
      control = <EnumControl {...props} field={field as FieldReference<EnumField>} />;
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
      <label htmlFor={id}>{fieldLabel(field.definition.description)}</label>
      {control}
    </div>
  );
}
