import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

// Start the MSW service worker substitute before all tests in this suite.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset any request handlers added during individual tests so they don't
// bleed into subsequent ones.
afterEach(() => server.resetHandlers());

// Clean up after the test suite finishes.
afterAll(() => server.close());
