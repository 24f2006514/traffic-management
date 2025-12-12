const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const alertsRouter = require('./routes/alerts');
const trafficRouter = require('./routes/traffic');
const emergencyRoutesRouter = require('./routes/emergencyRoutes');
const routeRouter = require('./routes/route');
const authRouter = require('./routes/auth');
const env = require('./config/env');

// Initialize database
require('./db/database');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// attach socket instance to app so controllers can emit events
app.set('io', io);

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/route', routeRouter);

// Protected routes
app.use('/alerts', alertsRouter);
app.use('/traffic', trafficRouter);
app.use('/emergency-routes', emergencyRoutesRouter);

require('./socket')(io);

const PORT = env.PORT || 3000;
server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
