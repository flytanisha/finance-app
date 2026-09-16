/**
 * Shared MSW server instance used by setup.ts and any test that needs to
 * override handlers for a specific scenario.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
