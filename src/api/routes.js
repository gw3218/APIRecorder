import { SessionManager } from '../managers/session-manager.js';
import { getStorageManager } from '../storage/database.js';

let sessionManager = null;

/**
 * Setup API routes
 * @param {Express} app - Express app instance
 */
export function setupRoutes(app) {
  // Initialize session manager
  sessionManager = new SessionManager(getStorageManager());

  // Sessions endpoints
  app.get('/api/sessions', async (req, res) => {
    try {
      const sessions = await sessionManager.storageManager.getAllSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/sessions', async (req, res) => {
    try {
      const session = await sessionManager.createSession(req.body);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sessions/:sessionId', async (req, res) => {
    try {
      const session = await sessionManager.storageManager.getSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/sessions/:sessionId/start', async (req, res) => {
    try {
      const { targetUrl } = req.body;
      if (!targetUrl) {
        return res.status(400).json({ error: 'targetUrl is required' });
      }
      const session = await sessionManager.startSession(req.params.sessionId, targetUrl);
      res.json(session);
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('already active') ? 409 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  app.post('/api/sessions/:sessionId/stop', async (req, res) => {
    try {
      const session = await sessionManager.stopSession(req.params.sessionId);
      res.json(session);
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('not active') ? 409 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  // Navigate to a new URL in an active session
  app.post('/api/sessions/:sessionId/navigate', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'url is required' });
      }
      const result = await sessionManager.navigate(req.params.sessionId, url);
      res.json(result);
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('not active') ? 409 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  app.delete('/api/sessions/:sessionId', async (req, res) => {
    try {
      await sessionManager.deleteSession(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Request-Response endpoints
  app.get('/api/sessions/:sessionId/requests', async (req, res) => {
    try {
      const requests = await sessionManager.storageManager.getRequestResponses(req.params.sessionId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Filter management endpoints
  app.get('/api/sessions/:sessionId/filters', async (req, res) => {
    try {
      const filters = sessionManager.getFilters(req.params.sessionId);
      if (filters === null) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(filters);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/sessions/:sessionId/filters', async (req, res) => {
    try {
      const { filters } = req.body;
      if (!filters || typeof filters !== 'object') {
        return res.status(400).json({ error: 'Invalid filters configuration' });
      }

      await sessionManager.updateFilters(req.params.sessionId, filters);
      res.json({ success: true, filters });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
