import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GeocachingLocationField from './GeocachingLocationField';

const mapMock = vi.hoisted(() => ({
  props: undefined as
    | {
        onTargetChange: (latitude: number, longitude: number) => void;
      }
    | undefined,
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockGeocachingMap(props: {
      onTargetChange: (latitude: number, longitude: number) => void;
    }) {
      mapMock.props = props;
      return (
        <div>
          <button
            type="button"
            onClick={() => props.onTargetChange(47.6151234, 7.6643214)}
          >
            Kartenposition setzen
          </button>
          <p>Teststatus: Kartenkacheln nicht verfügbar</p>
        </div>
      );
    },
}));

describe('GeocachingLocationField', () => {
  beforeEach(() => {
    mapMock.props = undefined;
  });

  it('shows accessible text inputs and the default radius', () => {
    render(<GeocachingLocationField value={{}} onChange={vi.fn()} />);

    const latitude = screen.getByRole('textbox', { name: 'Breitengrad*' });
    const longitude = screen.getByRole('textbox', { name: 'Längengrad*' });
    const radius = screen.getByRole('textbox', { name: 'Näherungsradius*' });

    expect(latitude).toHaveAttribute('type', 'text');
    expect(latitude).toHaveAttribute('inputmode', 'decimal');
    expect(longitude).toHaveAttribute('type', 'text');
    expect(longitude).toHaveAttribute('inputmode', 'decimal');
    expect(radius).toHaveAttribute('type', 'text');
    expect(radius).toHaveAttribute('inputmode', 'numeric');
    expect(radius).toHaveValue('10');
    expect(screen.getByText('Angabe in Metern.')).toBeInTheDocument();
  });

  it('emits valid manual coordinates as numbers', () => {
    const onChange = vi.fn();
    render(<GeocachingLocationField value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Breitengrad*' }), {
      target: { value: '47.615123' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Längengrad*' }), {
      target: { value: '7.664321' },
    });

    expect(onChange).toHaveBeenNthCalledWith(1, {
      target_latitude: 47.615123,
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      target_longitude: 7.664321,
    });
  });

  it('parses comma decimals and surrounding whitespace without rewriting the draft', () => {
    const onChange = vi.fn();
    render(<GeocachingLocationField value={{}} onChange={onChange} />);
    const latitude = screen.getByRole('textbox', { name: 'Breitengrad*' });

    fireEvent.change(latitude, { target: { value: ' 47,615123 ' } });

    expect(latitude).toHaveValue(' 47,615123 ');
    expect(onChange).toHaveBeenLastCalledWith({
      target_latitude: 47.615123,
    });
  });

  it.each(['47.', '-', '1e2', 'Infinity', '47.1.2', '47,1.2', '', '91'])(
    'keeps invalid coordinate draft %j visible and clears the parent value',
    (draft) => {
      const onChange = vi.fn();
      render(
        <GeocachingLocationField
          value={{ target_latitude: 47.6 }}
          onChange={onChange}
        />
      );
      const latitude = screen.getByRole('textbox', { name: 'Breitengrad*' });

      fireEvent.change(latitude, { target: { value: draft } });

      expect(latitude).toHaveValue(draft);
      expect(onChange).toHaveBeenLastCalledWith({
        target_latitude: undefined,
      });
    }
  );

  it('clears a preceding valid coordinate when its draft becomes invalid', () => {
    const onChange = vi.fn();
    render(
      <GeocachingLocationField
        value={{ target_latitude: 47.6 }}
        onChange={onChange}
      />
    );
    const latitude = screen.getByRole('textbox', { name: 'Breitengrad*' });

    fireEvent.change(latitude, { target: { value: '47.61' } });
    fireEvent.change(latitude, { target: { value: '47.' } });

    expect(onChange).toHaveBeenNthCalledWith(1, { target_latitude: 47.61 });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      target_latitude: undefined,
    });
  });

  it('formats map-originated coordinates to six decimal places', () => {
    const onChange = vi.fn();
    render(
      <GeocachingLocationField
        value={{ proximity_radius: 10 }}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Kartenposition setzen' })
    );

    expect(screen.getByRole('textbox', { name: 'Breitengrad*' })).toHaveValue(
      '47.615123'
    );
    expect(screen.getByRole('textbox', { name: 'Längengrad*' })).toHaveValue(
      '7.664321'
    );
    expect(onChange).toHaveBeenLastCalledWith({
      proximity_radius: 10,
      target_latitude: 47.6151234,
      target_longitude: 7.6643214,
    });
  });

  it.each(['', '1.', 'Infinity', '0', '-1', '1.5', 'abc'])(
    'keeps invalid radius draft %j visible and clears the parent value',
    (draft) => {
      const onChange = vi.fn();
      render(
        <GeocachingLocationField
          value={{ proximity_radius: 10 }}
          onChange={onChange}
        />
      );
      const radius = screen.getByRole('textbox', {
        name: 'Näherungsradius*',
      });

      fireEvent.change(radius, { target: { value: draft } });

      expect(radius).toHaveValue(draft);
      expect(onChange).toHaveBeenLastCalledWith({
        proximity_radius: undefined,
      });
    }
  );

  it('emits positive integer radii and clears a later invalid draft', () => {
    const onChange = vi.fn();
    render(
      <GeocachingLocationField
        value={{ proximity_radius: 10 }}
        onChange={onChange}
      />
    );
    const radius = screen.getByRole('textbox', { name: 'Näherungsradius*' });

    fireEvent.change(radius, { target: { value: '25' } });
    fireEvent.change(radius, { target: { value: '2.5' } });

    expect(onChange).toHaveBeenNthCalledWith(1, { proximity_radius: 25 });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      proximity_radius: undefined,
    });
  });

  it('links field errors without disabling the coordinate fallback', () => {
    const onChange = vi.fn();
    render(
      <GeocachingLocationField
        value={{}}
        errors={{
          target_latitude: 'Breitengrad fehlt',
          proximity_radius: 'Radius fehlt',
        }}
        onChange={onChange}
      />
    );
    const latitude = screen.getByRole('textbox', { name: 'Breitengrad*' });
    const radius = screen.getByRole('textbox', { name: 'Näherungsradius*' });

    expect(latitude).toHaveAttribute('aria-invalid', 'true');
    expect(latitude).toHaveAttribute(
      'aria-describedby',
      'geocaching-target_latitude-error'
    );
    expect(radius).toHaveAttribute('aria-invalid', 'true');
    expect(radius.getAttribute('aria-describedby')).toContain(
      'geocaching-proximity_radius-error'
    );
    expect(screen.getByText('Breitengrad fehlt')).toBeInTheDocument();

    fireEvent.change(latitude, { target: { value: '47.61' } });
    expect(onChange).toHaveBeenCalled();
    expect(
      screen.getByText('Teststatus: Kartenkacheln nicht verfügbar')
    ).toBeInTheDocument();
  });

  it('shows non-blocking radius and indoor GPS guidance', () => {
    render(
      <GeocachingLocationField
        value={{ proximity_radius: 10 }}
        onChange={vi.fn()}
      />
    );
    const radius = screen.getByRole('textbox', { name: 'Näherungsradius*' });

    fireEvent.change(radius, { target: { value: '5' } });
    expect(screen.getByText(/Unter 10 Metern/)).toBeInTheDocument();
    expect(radius).toHaveAttribute('aria-invalid', 'false');

    fireEvent.change(radius, { target: { value: '1001' } });
    expect(screen.getByText(/ungewöhnlich groß/)).toBeInTheDocument();
    expect(screen.getByText(/In Gebäuden/)).toBeInTheDocument();
  });
});
