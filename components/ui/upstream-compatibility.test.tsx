import { render, screen } from '@testing-library/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

describe('upstream-compatible UI updates', () => {
  it('uses Radix disabled-data selectors for menu and select items', () => {
    render(
      <>
        <DropdownMenu open>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Disabled menu item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Select open>
          <SelectTrigger>Open select</SelectTrigger>
          <SelectContent>
            <SelectItem disabled value="disabled">
              Disabled select item
            </SelectItem>
          </SelectContent>
        </Select>
      </>
    );

    expect(screen.getByText('Disabled menu item').className).toContain(
      'data-[disabled]:pointer-events-none'
    );
    expect(
      (screen.getByText('Disabled select item').parentElement as HTMLElement)
        .className
    ).toContain('data-[disabled]:pointer-events-none');
  });
});
