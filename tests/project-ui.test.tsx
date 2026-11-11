// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { addModule } from '../src/core/modules';
import { serializeProject } from '../src/core/project';
import i18n from '../src/i18n';
import { useStore } from '../src/store';

const st = () => useStore.getState();
const seed = () =>
  act(() =>
    useStore.setState({
      settings: { ...DEFAULT_SETTINGS, wallLength: 2500 },
      modules: addModule(addModule([], 'base', 'a'), 'wall', 'w'),
      step: 0,
      started: true,
      selectedId: null,
    }),
  );
const fileOf = (text: string) => new File([text], 'p.json', { type: 'application/json' });
const importFile = (text: string) => fireEvent.change(screen.getByTestId('import-input'), { target: { files: [fileOf(text)] } });

let blob: Blob | undefined;
let filename = '';
const readText = (b: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(b);
  });

beforeEach(async () => {
  localStorage.clear();
  blob = undefined;
  URL.createObjectURL = vi.fn((b: Blob) => ((blob = b), 'blob:test'));
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    filename = this.download;
  });
  useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], step: 0, started: true, selectedId: null });
  await i18n.changeLanguage('sr');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('project export / import', () => {
  it('export downloads the project as JSON', async () => {
    seed();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Izvezi projekat' }));
    expect(filename).toBe('kerfly-project.json');
    const data = JSON.parse(await readText(blob!));
    expect(data).toMatchObject({ app: 'kerfly', version: 1, settings: { wallLength: 2500 } });
    expect(data.modules.map((m: { id: string }) => m.id).sort()).toEqual(['a', 'w']);
  });

  it('import replaces settings and modules and clears the selection', async () => {
    seed();
    act(() => st().select('a'));
    const incoming = serializeProject({
      settings: { ...DEFAULT_SETTINGS, units: 'in', gap: 2 },
      modules: addModule([], 'sink', 'z'),
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    importFile(incoming);
    await waitFor(() => expect(st().modules.map((m) => m.id)).toEqual(['z']));
    expect(st().settings).toMatchObject({ units: 'in', gap: 2 });
    expect(st().selectedId).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(JSON.parse(localStorage.getItem('kerfly.project')!).modules[0].id).toBe('z'); // saved too
  });

  it('asks before replacing a non-empty project; declining keeps it', async () => {
    seed();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    importFile(serializeProject({ settings: DEFAULT_SETTINGS, modules: addModule([], 'sink', 'z') }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith('Uvoz zamenjuje trenutni projekat. Nastaviti?'));
    expect(st().modules.map((m) => m.id).sort()).toEqual(['a', 'w']);
  });

  it('an empty project is replaced without asking', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    render(<App />);
    importFile(serializeProject({ settings: DEFAULT_SETTINGS, modules: addModule([], 'sink', 'z') }));
    await waitFor(() => expect(st().modules).toHaveLength(1));
    expect(confirm).not.toHaveBeenCalled();
  });

  it('an invalid file shows an error and changes nothing', async () => {
    seed();
    render(<App />);
    importFile('{"settings":{"t":"abc"},"modules":[]}');
    expect((await screen.findByRole('alert')).textContent).toBe('Fajl projekta nije ispravan (settings.t).');
    expect(st().modules).toHaveLength(2);
    importFile('not json at all');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('(json)'));
    expect(st().settings.wallLength).toBe(2500);
  });

  it('the error is translated, and goes away after a good import', async () => {
    await i18n.changeLanguage('en');
    render(<App />);
    importFile('[]');
    expect((await screen.findByRole('alert')).textContent).toBe('The project file is not valid (root).');
    importFile(serializeProject({ settings: DEFAULT_SETTINGS, modules: [] }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});

describe('corner cabinets notice', () => {
  it('shown in the builder and in the report, in both languages', async () => {
    seed();
    render(<App />);
    act(() => st().setStep(1));
    expect(screen.getByRole('note').textContent).toBe('Ugaoni elementi nisu podržani u ovoj verziji.');
    act(() => st().setStep(2));
    expect(screen.getByRole('note').textContent).toBe('Ugaoni elementi nisu podržani u ovoj verziji.');
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('note').textContent).toBe('Corner cabinets are not supported in this version.');
  });
});

describe('units everywhere', () => {
  it('inches: edge banding and wall trim are shown in feet, slide lengths in inches', () => {
    seed();
    act(() => {
      st().addModule('drawer');
      st().setSettings({ units: 'in' });
      st().setStep(2);
    });
    render(<App />);
    const text = document.body.textContent!;
    expect(text).toMatch(/\d+(\.\d)? ft/);
    expect(text).not.toMatch(/\d+ m\b/);
    expect(text).toContain('Vođice fioka 21.65 in (parova)');
    expect(text).not.toContain(' mm');
  });

  it('millimeters: meters and mm', () => {
    seed();
    act(() => {
      st().addModule('drawer');
      st().setStep(2);
    });
    render(<App />);
    const text = document.body.textContent!;
    expect(text).toMatch(/\d+ m(?!m)/);
    expect(text).toContain('Vođice fioka 550 mm (parova)');
    expect(text).not.toContain(' ft');
    expect(text).not.toContain(' in');
  });

  it.each([0, 1, 2])('step %i in inches shows no millimeters', (step) => {
    seed();
    act(() => {
      st().addModule('drawer');
      st().updateModule('a', { W: 603, doors: 1 });
      st().setSettings({ units: 'in' });
      st().setStep(step);
    });
    render(<App />);
    if (step === 1) fireEvent.click(screen.getByRole('button', { name: /Donji element · 23\.74/ })); // opens the card too
    expect(document.body.textContent).not.toMatch(/\d\s?mm\b/);
  });
});

describe('project menu', () => {
  const menu = () => document.querySelector('details.project-menu') as HTMLDetailsElement;

  it('is a closed dropdown with the two actions inside, and an icon button named Projekat', () => {
    render(<App />);
    expect(menu().open).toBe(false);
    expect(screen.getByLabelText('Projekat').tagName).toBe('SUMMARY');
    const panel = menu().querySelector('.project-panel')!;
    expect(within(panel as HTMLElement).getByRole('button', { name: 'Izvezi projekat' })).toBeTruthy();
    expect(within(panel as HTMLElement).getByRole('button', { name: 'Uvezi projekat' })).toBeTruthy();
  });

  it('exporting closes the menu', () => {
    render(<App />);
    menu().open = true;
    fireEvent.click(screen.getByRole('button', { name: 'Izvezi projekat' }));
    expect(menu().open).toBe(false);
  });

  it('Escape and a tap outside close it; a tap inside does not', () => {
    render(<App />);
    menu().open = true;
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Uvezi projekat' }));
    expect(menu().open).toBe(true);
    fireEvent.pointerDown(document.body);
    expect(menu().open).toBe(false);
    menu().open = true;
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(menu().open).toBe(false);
  });

  it('a good import closes the menu; a bad file keeps it open and shows the error outside it', async () => {
    render(<App />);
    menu().open = true;
    importFile('not json');
    const alert = await screen.findByRole('alert');
    expect(menu().open).toBe(true);
    expect(menu().contains(alert)).toBe(false); // the message does not hide inside the closed menu
    importFile(serializeProject({ settings: DEFAULT_SETTINGS, modules: addModule([], 'sink', 'z') }));
    await waitFor(() => expect(menu().open).toBe(false));
    expect(st().modules.map((m) => m.id)).toEqual(['z']);
  });

  it('is translated', async () => {
    await i18n.changeLanguage('en');
    render(<App />);
    expect(screen.getByLabelText('Project').tagName).toBe('SUMMARY');
  });
});
