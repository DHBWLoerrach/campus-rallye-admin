import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RallyeHeaderCode from './RallyeHeaderCode';

describe('RallyeHeaderCode', () => {
  it('shows the code when the rallye is ready', () => {
    render(<RallyeHeaderCode status="ready" rallyeCode="join42" />);
    expect(screen.getByText('join42')).toBeInTheDocument();
  });

  it('shows the code when the rallye is running', () => {
    render(<RallyeHeaderCode status="running" rallyeCode="join42" />);
    expect(screen.getByText('join42')).toBeInTheDocument();
  });

  it('prompts when a ready rallye has no code yet', () => {
    render(<RallyeHeaderCode status="ready" rallyeCode="" />);
    expect(screen.getByText('Noch kein Rallye-Code')).toBeInTheDocument();
  });

  it('renders nothing in draft', () => {
    const { container } = render(
      <RallyeHeaderCode status="draft" rallyeCode="join42" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing once ended', () => {
    const { container } = render(
      <RallyeHeaderCode status="ended" rallyeCode="join42" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
