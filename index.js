module.exports = exports;

/**
 * Constructor
 * 
 * @param {Object} io socket.io reference after call listen
 * @param {Object} sessionStore Connect session store instance
 * @param {Object} cookieParser Connect cookie parser instance
 * @param {Object} [options] to setup the socket. Between them: key (cookie name, by default
 *          connect.sid), alwaysSession (boolean that provides an on method on the client that
 *          receive the session, if it is true, otherwise add a new method named sessOn, that it
 *          does the same but no override the original on method of the socket, but default false),
 *          autoErrManager (boolean that if it is true, this manages internally the session error
 *          and if the session is not loaded, too; otherwise provide an error parameter to the
 *          listen callbacks, by default false)
 * @returns
 */
function ExpressionSocket(io, sessionStore, cookieParser, options) {
  var self = this;

  this.sessionStore = sessionStore;
  this.cookieParser = cookieParser;

  if (options) {
    this.key = (options.key) ? options.key : 'connect.sid';
    this.sessOn = (options.alwaysSession) ? 'on' : 'sessOn';
    this.autoErrManager = (options.autoErrManager) ? true : false;
  } else {
    this.key = 'connect.sid';
    this.sessOn = 'sessOn';
    this.autoErrManager = false;
  }

  this.sockets = {
    on : function(event, callback) {
      return self.bindOn(event, callback, io.sockets);
    },
    authorization : function(callback) {
      return self.bindAuthorization(callback, io.sockets);
    },
    emit : function() {
      io.sockets.emit.apply(io.sockets, arguments);
    }
  };

  this.of = function(namespace) {
    return {
      on : function(event, callback) {
        return self.bindOn(event, callback, io.of(namespace));
      },
      authorization : function(callback) {
        return self.bindAuthorization(callback, io.of(namespace));
      },
      emit : function() {
        io.of(namespace).emit.apply(io.of(namespace), arguments);
      }
    };
  };

}

ExpressionSocket.prototype.sockets;
ExpressionSocket.prototype.of;

/**
 * 
 * @param event
 * @param callback
 * @param namespace
 * @api private
 */
ExpressionSocket.prototype.bindOn = function(event, callback, namespace) {
  var self = this;

  namespace.on(event, function(socket) {
    self.cookieParser(socket.handshake, {}, function(parseErr) {

      socket.expressionCookieId = self.findCookie(socket.handshake);

      if ((parseErr) || (!socket.expressionCookieId)) {
        if (self.autoErrManager) {
          socket.disconnect();
          return;
        } else {
          callback(parseErr, null, self.bindOnClientSocket(socket));
        }
      }

      self.sessionStore.load(socket.expressionCookieId, function(storeErr, session) {

        if (self.autoErrManager) {
          if ((storeErr) || (!session)) {
            socket.disconnect();
          } else {
            callback(session, self.bindOnClientSocket(socket));
          }
        } else {
          callback(storeErr, session, self.bindOnClientSocket(socket));
        }
      });
    });
  });
};

/**
 * 
 * @param callback
 * @param namespace
 * @api private
 */
ExpressionSocket.prototype.bindAuthorization = function(callback, namespace) {
  var self = this;

  namespace.authorization(function(handshake, fn) {
    self.cookieParser(handshake, {}, function(parseErr) {

      var cookieId = self.findCookie(handshake);

      if ((parseErr) || (!cookieId)) {
        if (self.autoErrManager) {
          fn(parseErr, false);
          return;
        } else {
          callback(parseErr, null, handshake, fn);
        }
      }

      self.sessionStore.load(cookieId, function(storeErr, session) {

        if (self.autoErrManager) {
          if ((storeErr) || (!session)) {
            fn(storeErr, false);
          } else {
            callback(session, handshake, fn);
          }
        } else {
          callback(storeErr, session, handshake, fn);
        }
      });
    });
  });
};

ExpressionSocket.prototype.bindEmit = function(event, message) {

};

/**
 * 
 * @param socket
 * @returns
 */
ExpressionSocket.prototype.bindOnClientSocket = function(socket) {
  var self = this;
  var onMethod = socket.on;

  socket[this.sessOn] = function(event, callback) {
    onMethod.call(socket, event, function(data, ackFn) {
      self.sessionStore.load(socket.expressionCookieId, function(storeErr, session) {

        if (self.autoErrManager) {
          if ((storeErr) || (!session)) {
            socket.disconnect();
          } else {
            if (!data) {
              callback(session);
            } else if (!ackFn) {
              callback(session, data);
            } else {
              callback(session, data, ackFn);
            }
          }
        } else {
          if (!data) {
            callback(storeErr, session);
          } else if (!ackFn) {
            callback(storeErr, session, data);
          } else {
            callback(storeErr, session, data, ackFn);
          }
        }
      });
    });
  };

  return socket;

};

/**
 * 
 * @param handshake
 * @returns {String}
 * @api private
 */
ExpressionSocket.prototype.findCookie = function(handshake) {
  return(handshake.secureCookies && handshake.secureCookies[this.key])
      || (handshake.signedCookies && handshake.signedCookies[this.key])
      || (handshake.cookies && handshake.cookies[this.key]) || false;
};

module.exports = ExpressionSocket;
