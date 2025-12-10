const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const alertsRouter = require('./routes/alerts');
const trafficRouter = require('./routes/traffic');
const env = require('./config/env');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// attach socket instance to app so controllers can emit events
app.set('io', io);

app.use('/alerts', alertsRouter);
app.use('/traffic', trafficRouter);

require('./socket')(io);

const PORT = env.PORT || 3000;
server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
