let openConnections = 0;

module.exports = {
  incrementConnectionCount: function() {
    openConnections++;
  },

  decrementConnectionCount: function() {
    openConnections--;
  },

  getOpenConnectionCount: function() {
    return openConnections;
  }
};