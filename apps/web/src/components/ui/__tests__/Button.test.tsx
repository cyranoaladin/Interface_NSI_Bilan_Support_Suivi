import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders text and is clickable', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    const btn = screen.getByText('Click me');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });

  it('disabled state prevents clicks', () => {
    const onClick = jest.fn();
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByText('Disabled');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

