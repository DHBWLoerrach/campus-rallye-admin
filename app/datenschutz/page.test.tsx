import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DatenschutzPage from './page';

describe('DatenschutzPage', () => {
  it('covers users who receive access through the email whitelist', () => {
    const { container } = render(<DatenschutzPage />);

    expect(container).toHaveTextContent('E-Mail-Whitelist');
    expect(container).toHaveTextContent('Projekte und Studienarbeiten');
    expect(container).not.toHaveTextContent(
      'Studierende, externe Teilnehmende und Teams erhalten keinen Zugriff auf diese Verwaltungsanwendung'
    );
  });
});
