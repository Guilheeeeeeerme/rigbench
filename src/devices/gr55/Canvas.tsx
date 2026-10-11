import { useSyncExternalStore, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../copy';
import { TopNav } from './TopNav';
import type { FieldReference, BooleanField } from '../../protocol/RolandAddressMap';
import type { Gr55Editor } from './editor';
import { editorHref } from './pages';
import { TEMPORARY_PATCH } from './patchLayout';

const patch = TEMPORARY_PATCH;

interface ChainBlock {
  title: string;
  hint?: string;
  href: string;
  /** The switch that greys the block out while it is off. */
  power?: FieldReference<BooleanField>;
  wide?: boolean;
}

/** Whether a switch block is sounding, in display terms (mute fields are inverted). */
function blockOn(editor: Gr55Editor, power?: FieldReference<BooleanField>): boolean {
  if (power === undefined) {
    return true;
  }
  const result = editor.read(power);
  if (!result.ok) {
    return true;
  }
  return result.value !== power.definition.type.invertedForDisplay;
}

function ChainBlock({ editor, block }: { editor: Gr55Editor; block: ChainBlock }) {
  const t = useT();
  // Subscribes to the power switch so a block wakes up without a patch reload.
  useSyncExternalStore(editor.subscribe, () =>
    block.power ? editor.fieldSnapshot(block.power.address) : '',
  );
  const on = blockOn(editor, block.power);
  const body: ReactNode = (
    <>
      <span className="canvas-title">{block.title}</span>
      {block.hint && <span className="canvas-hint">{block.hint}</span>}
      {!on && <span className="canvas-off">{t('gr55.blocks.off')}</span>}
    </>
  );
  return (
    <Link
      className={`canvas-block${on ? '' : ' canvas-block-off'}${block.wide ? ' wide' : ''}`}
      to={block.href}
    >
      {body}
    </Link>
  );
}

function ChainRow({ children }: { children: ReactNode }) {
  return <div className="canvas-row">{children}</div>;
}

function Arrow() {
  return (
    <span className="canvas-arrow" aria-hidden="true">
      →
    </span>
  );
}

/**
 * The editor's canvas: the chain from input to output, in real order. Each block
 * opens the inspector of its source, effect, or control domain.
 */
export function Canvas({ editor }: { editor: Gr55Editor }) {
  const t = useT();
  return (
    <div className="canvas">
      <div className="canvas-head">
        <TopNav current="editor" />
        <h1>{t('gr55.blocks.title')}</h1>
        <p className="hint">{t('gr55.blocks.intro')}</p>
      </div>

      <ChainRow>
        <ChainBlock
          editor={editor}
          block={{
            title: t('gr55.blocks.input'),
            hint: t('gr55.blocks.inputHint'),
            href: editorHref('master', 'output'),
          }}
        />
        <Arrow />
        <span className="canvas-stack">
          <ChainRow>
            <ChainBlock
              editor={editor}
              block={{ title: t('gr55.blocks.pcm1'), href: editorHref('pcm1', 'tone') }}
            />
            <ChainBlock
              editor={editor}
              block={{ title: t('gr55.blocks.pcm2'), href: editorHref('pcm2', 'tone') }}
            />
          </ChainRow>
          <ChainRow>
            <ChainBlock
              editor={editor}
              block={{ title: t('gr55.blocks.modeling'), href: editorHref('modeling', 'tone') }}
            />
            <ChainBlock
              editor={editor}
              block={{
                title: t('gr55.blocks.normalPickup'),
                href: editorHref('normal-pickup', 'level'),
                power: patch.common.normalPuMute,
              }}
            />
          </ChainRow>
        </span>
        <Arrow />
        <ChainBlock
          editor={editor}
          block={{
            title: t('gr55.blocks.amp'),
            href: editorHref('amp', 'amp'),
            power: patch.ampModNs.ampSwitch,
          }}
        />
        <Arrow />
        <ChainBlock
          editor={editor}
          block={{
            title: t('gr55.blocks.mod'),
            href: editorHref('mod', 'mod'),
            power: patch.ampModNs.modSwitch,
          }}
        />
        <Arrow />
        <ChainBlock
          editor={editor}
          block={{
            title: t('gr55.blocks.mfx'),
            href: editorHref('mfx', 'mfx'),
            power: patch.mfx.mfxSwitch,
          }}
        />
        <Arrow />
        <span className="canvas-stack">
          <ChainRow>
            <ChainBlock
              editor={editor}
              block={{
                title: t('gr55.blocks.chorus'),
                href: editorHref('chorus', 'chorus'),
                power: patch.sendsAndEq.chorusSwitch,
              }}
            />
            <ChainBlock
              editor={editor}
              block={{
                title: t('gr55.blocks.reverb'),
                href: editorHref('reverb', 'reverb'),
                power: patch.sendsAndEq.reverbSwitch,
              }}
            />
          </ChainRow>
          <ChainRow>
            <ChainBlock
              editor={editor}
              block={{
                title: t('gr55.blocks.delay'),
                href: editorHref('delay', 'delay'),
                power: patch.sendsAndEq.delaySwitch,
              }}
            />
            <ChainBlock
              editor={editor}
              block={{
                title: t('gr55.blocks.eq'),
                href: editorHref('eq', 'eq'),
                power: patch.sendsAndEq.eqSwitch,
              }}
            />
          </ChainRow>
        </span>
        <Arrow />
        <ChainBlock
          editor={editor}
          block={{ title: t('gr55.blocks.master'), href: editorHref('master', 'output') }}
        />
      </ChainRow>

      <span className="canvas-row">
        <ChainBlock
          editor={editor}
          block={{
            title: t('gr55.blocks.control'),
            hint: t('gr55.blocks.controlHint'),
            href: editorHref('assigns', 'assign-1'),
            wide: true,
          }}
        />
      </span>
    </div>
  );
}
