import { LOCALES, setLocale, useLocale, useT } from '../copy';

/** The EN | PT-BR switch. It sits in the corner of every screen and inside the setup checklist. */
export function LocaleSwitch({ inline = false }: { inline?: boolean }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div
      className={inline ? 'locale-switch is-inline' : 'locale-switch'}
      role="group"
      aria-label={t('locale.label')}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === locale}
          onClick={() => setLocale(option)}
        >
          {t(`locale.names.${option}`)}
        </button>
      ))}
    </div>
  );
}
