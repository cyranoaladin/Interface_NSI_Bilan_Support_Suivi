import { render, screen } from '@testing-library/react';
import { Card, CardContent, CardHeader } from '../Card';

describe('Card', () => {
  it('renders children content', () => {
    render(<Card><CardHeader>Header</CardHeader><CardContent>Body</CardContent></Card>);
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});

