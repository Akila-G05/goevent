import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from '@/app/App';

describe('App Component', () => {
  it('renders the GoEvent branding and hero title', () => {
    render(<App />);
    expect(screen.getByText('GoEvent')).toBeInTheDocument();
    expect(screen.getByText(/Discover & Book Unforgettable Experiences/i)).toBeInTheDocument();
  });
});
