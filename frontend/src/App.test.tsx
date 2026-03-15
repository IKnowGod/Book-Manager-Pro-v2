import { render } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// Mock the API client to prevent network requests during tests
vi.mock('./api/client', () => ({
  api: {
    books: { list: vi.fn().mockResolvedValue([]) },
  },
}));

describe('App', () => {
  it('renders without crashing', () => {
    // App includes its own BrowserRouter, so we just render it directly
    render(<App />);

    // This is a minimal test to ensure test infrastructure works without crashing
    expect(document.body).toBeInTheDocument();
  });
});
