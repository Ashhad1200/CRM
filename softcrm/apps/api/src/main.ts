import { loadConfig } from './config/index.js';
import { createApp, startServer } from './server.js';

// Load and validate config first
loadConfig();

// Create Express app with middleware stack
const app = createApp();

// Start HTTP server
startServer(app);
