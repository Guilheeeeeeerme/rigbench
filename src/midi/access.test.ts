import { detectSupport } from './access';

const chrome =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36';
const firefox = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0';

describe('detectSupport', () => {
  test('Chrome on a secure origin goes straight through', () => {
    expect(detectSupport({ isSecureContext: true, hasWebMidi: true, userAgent: chrome })).toEqual({
      kind: 'ok',
      needsSysexPermissionNotice: false,
    });
  });

  test('Firefox opens with the SysEx permission notice', () => {
    expect(detectSupport({ isSecureContext: true, hasWebMidi: true, userAgent: firefox })).toEqual({
      kind: 'ok',
      needsSysexPermissionNotice: true,
    });
  });

  test('a browser without Web MIDI is blocked', () => {
    expect(
      detectSupport({ isSecureContext: true, hasWebMidi: false, userAgent: 'Safari' }).kind,
    ).toBe('no-web-midi');
  });

  test('an insecure origin is reported as such even when the API is missing', () => {
    expect(
      detectSupport({ isSecureContext: false, hasWebMidi: false, userAgent: chrome }).kind,
    ).toBe('insecure-context');
  });
});
