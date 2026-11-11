// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { rowModules } from '../src/core/modules';
import i18n from '../src/i18n';
import { useStore } from '../src/store';

const st = () => useStore.getState();
const lower = () => rowModules(st().modules, 'lower');
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const type = (label: string, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });

beforeEach(async () => {
  localStorage.clear();
  useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], step: 1, started: true, selectedId: null });
  await i18n.changeLanguage('sr');
});
afterEach(cleanup);

describe('BuilderStep', () => {
  it('add buttons create modules in the right row and select the new one', () => {
    render(<App />);
    click('+ Donji element');
    click('+ Zidni element');
    expect(st().modules.map((m) => [m.type, m.row])).toEqual([['base', 'lower'], ['wall', 'upper']]);
    expect(st().selectedId).toBe(st().modules[1].id);
    expect(screen.getByRole('region', { name: 'Zidni element' })).toBeTruthy();
  });

  it('card edits dimensions (in the selected units), doors and shelves', () => {
    render(<App />);
    click('+ Donji element');
    expect((screen.getByLabelText('Širina') as HTMLInputElement).value).toBe('600');
    type('Širina', '700');
    type('Broj vrata', '2');
    type('Broj polica', '3');
    type('Broj vrata', '5'); // invalid: max 2
    expect(st().modules[0]).toMatchObject({ W: 700, doors: 2, shelves: 3 });
    act(() => st().setSettings({ units: 'in' }));
    type('Dubina', '20');
    expect(st().modules[0].D).toBeCloseTo(508, 10);
  });

  it('card only shows fields that apply to the type', () => {
    render(<App />);
    click('+ Sudopera');
    expect(screen.queryByLabelText('Broj polica')).toBeNull();
    expect(screen.getByLabelText('Broj vrata')).toBeTruthy();
    click('+ Fiokar');
    expect(screen.queryByLabelText('Broj vrata')).toBeNull();
    expect(screen.getByLabelText('Visina fronta fioke 3')).toBeTruthy();
  });

  it('move left/right is limited to the row edges', () => {
    render(<App />);
    click('+ Donji element');
    click('+ Sudopera');
    click('+ Fiokar');
    const [a, b, c] = lower().map((m) => m.id);
    act(() => st().select(a));
    fireEvent.click(screen.getByRole('button', { name: /Pomeri levo/ }) as HTMLElement); // disabled: no-op
    expect(lower().map((m) => m.id)).toEqual([a, b, c]);
    click(/Pomeri desno/);
    expect(lower().map((m) => m.id)).toEqual([b, a, c]);
    click(/Pomeri desno/);
    expect(lower().map((m) => m.id)).toEqual([b, c, a]);
    expect((screen.getByRole('button', { name: /Pomeri desno/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('duplicate selects the copy, delete closes the card', () => {
    render(<App />);
    click('+ Fiokar');
    const original = st().modules[0];
    click('Dupliraj');
    expect(st().modules).toHaveLength(2);
    expect(st().selectedId).toBe(st().modules[1].id);
    expect(st().modules[1].drawers).toEqual(original.drawers);
    click('Obriši');
    expect(st().modules).toHaveLength(1);
    expect(st().selectedId).toBeNull();
    expect(screen.queryByRole('region', { name: 'Fiokar' })).toBeNull();
  });

  it('drawers: adding/removing a front rebalances heights to fill H', () => {
    render(<App />);
    click('+ Fiokar');
    click('Dodaj fioku');
    expect(st().modules[0].drawers).toEqual([177, 177, 177, 177]);
    click('Ukloni fioku');
    click('Ukloni fioku');
    expect(st().modules[0].drawers).toEqual([357, 357]);
    type('Visina fronta fioke 1', '140');
    expect(screen.getByText(/Zbir fronti i fuga: 503 mm/)).toBeTruthy();
  });

  it('tall: door split is optional', () => {
    render(<App />);
    click('+ Visoki element');
    type('Visina donjih vrata (podela)', '900');
    expect(st().modules[0].doorSplitH).toBe(900);
    type('Visina donjih vrata (podela)', '');
    expect(st().modules[0].doorSplitH).toBeUndefined();
  });

  it('lower row sum vs wall length', () => {
    render(<App />);
    click('+ Donji element');
    click('+ Sudopera');
    expect(screen.getByRole('status').textContent).toBe('Donji red: 1400 mm');
    act(() => st().setSettings({ wallLength: 1500 }));
    expect(screen.getByRole('status').textContent).toContain('Donji red: 1400 mm / zid: 1500 mm — do dužine zida fali 100 mm');
    act(() => st().setSettings({ wallLength: 1000 }));
    expect(screen.getByRole('status').textContent).toContain('prekoračuje dužinu zida za 400 mm');
    act(() => st().setSettings({ wallLength: 1420 }));
    expect(screen.getByRole('status').textContent).toContain('odgovara dužini zida');
  });

  it('wall cabinets do not count towards the lower row', () => {
    render(<App />);
    click('+ Zidni element');
    expect(screen.getByRole('status').textContent).toBe('Donji red: 0 mm');
  });
});

describe('KitchenElevation', () => {
  it('draws every module with width dimensions; click selects and opens the card', () => {
    render(<App />);
    click('+ Donji element');
    click('+ Sudopera');
    click('+ Zidni element');
    act(() => st().select(null));
    for (const m of st().modules) expect(screen.getByTestId(`elev-${m.id}`)).toBeTruthy();
    const svg = screen.getByRole('group', { name: 'Prednji prikaz kuhinje' });
    expect([...svg.querySelectorAll('.dim text')].map((n) => n.textContent)).toEqual(['600', '800', '600']);

    fireEvent.click(screen.getByTestId(`elev-${st().modules[1].id}`));
    expect(st().selectedId).toBe(st().modules[1].id);
    expect(screen.getByRole('region', { name: 'Sudopera' })).toBeTruthy();
    expect(screen.getByTestId(`elev-${st().modules[1].id}`).getAttribute('aria-pressed')).toBe('true');
  });

  it('keyboard: Enter selects', () => {
    render(<App />);
    click('+ Donji element');
    act(() => st().select(null));
    fireEvent.keyDown(screen.getByTestId(`elev-${st().modules[0].id}`), { key: 'Enter' });
    expect(st().selectedId).toBe(st().modules[0].id);
  });

  it('shows dimensions in inches', () => {
    render(<App />);
    click('+ Donji element');
    act(() => st().setSettings({ units: 'in' }));
    const svg = screen.getByRole('group', { name: 'Prednji prikaz kuhinje' });
    expect(svg.querySelector('.dim text')!.textContent).toBe('23.62');
  });

  it('tall cabinet is drawn over both rows; details show doors, split and drawers', () => {
    render(<App />);
    click('+ Visoki element');
    click('+ Fiokar');
    act(() => st().updateModule(st().modules[0].id, { doors: 2, doorSplitH: 900 }));
    const [tall, drawer] = st().modules;
    expect(screen.getByTestId(`elev-${tall.id}`).querySelectorAll('.detail')).toHaveLength(2); // door split + 2 doors
    expect(screen.getByTestId(`elev-${drawer.id}`).querySelectorAll('.detail')).toHaveLength(2); // 3 drawers
    const order = [...screen.getByRole('group', { name: 'Prednji prikaz kuhinje' }).querySelectorAll('.mod')].map((g) => g.getAttribute('data-testid'));
    expect(order).toEqual([`elev-${drawer.id}`, `elev-${tall.id}`]); // tall last = on top
  });

  it('hint instead of a drawing when there are no modules', () => {
    render(<App />);
    expect(screen.queryByRole('group', { name: 'Prednji prikaz kuhinje' })).toBeNull();
    expect(screen.getByText('Dodaj prvi element dugmadima iznad.')).toBeTruthy();
  });
});
