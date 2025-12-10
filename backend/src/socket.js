let _io = null;

module.exports = function(io) {
  _io = io;
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
  });
};

module.exports.emit = function(event, payload) {
  if (!_io) return console.warn('Socket not initialized — cannot emit', event);
  _io.emit(event, payload);
};
