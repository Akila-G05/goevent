import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HomePage from '@/app/page';

describe('HomePage Component', () => {
  it('renders the GoEvent hero title and search button', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: /WHAT'S CONCERT/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });
});
