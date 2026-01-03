import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChangesGuard } from './use-unsaved-changes-guard';

vi.mock('next/navigation', () => ({
  usePathname: () => '/test',
  useSearchParams: () => ({ toString: () => '' }),
}));

function TestComponent({
  isDirty,
  message,
}: {
  isDirty: boolean;
  message: string;
}) {
  useUnsavedChangesGuard(isDirty, message);
  return (
    <div>
      <a href="/other-page">Navigate</a>
      <a href="#section">Anchor</a>
      <a href="/other-page" target="_blank" rel="noreferrer">
        New Tab
      </a>
      <a href="/other-page" download>
        Download
      </a>
    </div>
  );
}

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks link click when dirty and user cancels', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<TestComponent isDirty={true} message="Unsaved changes" />);

    const link = screen.getByRole('link', { name: 'Navigate' });
    fireEvent.click(link);

    expect(confirmSpy).toHaveBeenCalledWith('Unsaved changes');
    confirmSpy.mockRestore();
  });

  it('allows link click when dirty and user confirms', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<TestComponent isDirty={true} message="Unsaved changes" />);

    const link = screen.getByRole('link', { name: 'Navigate' });
    fireEvent.click(link);

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('does not prompt when form is clean', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<TestComponent isDirty={false} message="Unsaved changes" />);

    fireEvent.click(screen.getByRole('link', { name: 'Navigate' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('allows navigation with meta key without prompting', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<TestComponent isDirty={true} message="Unsaved changes" />);

    const link = screen.getByRole('link', { name: 'Navigate' });
    fireEvent.click(link, { metaKey: true });

    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('allows navigation with ctrl key without prompting', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<TestComponent isDirty={true} message="Unsaved changes" />);

    const link = screen.getByRole('link', { name: 'Navigate' });
    fireEvent.click(link, { ctrlKey: true });

    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('allows anchor links without prompting', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<TestComponent isDirty={true} message="Unsaved changes" />);

    fireEvent.click(screen.getByRole('link', { name: 'Anchor' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('allows links with target="_blank" without prompting', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<TestComponent isDirty={true} message="Unsaved changes" />);

    fireEvent.click(screen.getByRole('link', { name: 'New Tab' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('allows download links without prompting', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<TestComponent isDirty={true} message="Unsaved changes" />);

    fireEvent.click(screen.getByRole('link', { name: 'Download' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
