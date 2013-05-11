'use strict';

module.exports = exports;

/**
 *
 * @param {Object} io socket.io reference after call listen
 * @param {Object} sessionStore Connect session store instance
 * @param {Function} cookieParser Connect cookie parser instance
 * @param {Object} [options] to setup the socket. The optional object's properties are:
 *          {
 *            key: cookie name; by default 'connect.sid'
 *            autoErrManager: boolean that if it is 'true', then any error to retrieve the session
 *                   is managed internally; otherwise provide an error parameter to the listen
 *                   callbacks; by default 'false'.
 *            noSessIo: A boolean which if it is true, then the 'authentication' method that deals
 *                  with with session and the sessOn  method won't be applied to the io.sockets, so
  *                 it will an original socket.io but with the possibility to get namespaced sockets
  *                 with the session features.
 *          }
 *
 * @returns {Object} socket.io object (it has been prototyped with new behaviours in some original
 *                       methods and  provided a new ones)
 */
function expressionSocket(io, sessionStore, cookieParser, options) {

  var key = 'connect.sid';
  var autoErrManager = false;
  var noSessIo = false;

  if (options) {
    if ('string' === typeof options.key) {
      key = options.key;
    }

    if (options.autoErrManager === true) {
      autoErrManager = true;
    }

    if (options.noSessIo === true) {
      noSessIo = true;
    }
  }

  var findCookie = function (handshake) {
    return (handshake.secureCookies && handshake.secureCookies[key])
      || (handshake.signedCookies && handshake.signedCookies[key])
      || (handshake.cookies && handshake.cookies[key]) || false;
  };

  var authorization = function (callback) {

    this.__proto__.authorization(function (handshake, fn) {
      cookieParser(handshake, {}, function (parseErr) {

        var cookieId = findCookie(handshake);

        if ((parseErr) || (!cookieId)) {
          if (autoErrManager) {
            fn(parseErr, false);
            return;
          } else {
            callback(parseErr, null, handshake, fn);
          }
        }

        sessionStore.load(cookieId, function (storeErr, session) {

          if (autoErrManager) {
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

  var serverSessOn = function (event, callback) {

    this.on(event, function (socket) {
      cookieParser(socket.handshake, {}, function (parseErr) {

        socket.expressionCookieId = findCookie(socket.handshake);

        if ((parseErr) || (!socket.expressionCookieId)) {
          if (autoErrManager) {
            socket.disconnect();
            return;
          } else {
            socket.clientSessOn = clientSessOn;
            callback(parseErr, null, socket);
          }
        }

        sessionStore.load(socket.expressionCookieId, function (storeErr, session) {

          if (autoErrManager) {
            if ((storeErr) || (!session)) {
              socket.disconnect();
            } else {
              socket.clientSessOn = clientSessOn;
              callback(session, socket);
            }
          } else {
            socket.clientSessOn = clientSessOn;
            callback(storeErr, session, socket);
          }
        });
      });
    });
  };

  var clientSessOn = function (event, callback) {
    var self = this;

    this.on(event, function (data, ackFn) {
      sessionStore.load(self.expressionCookieId, function (storeErr, session) {

        if (autoErrManager) {
          if ((storeErr) || (!session)) {
            self.disconnect();
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


  if (noSessIo === false) {
    io.sockets.sessOn = serverSessOn;
    io.sockets.authorization = authorization;
  }

  io.of = function (namespace, noSession) {

    var nsSockets = this.__proto__.of.call(this, namespace);

    if (noSession === true) {
      return nsSockets;
    }

    nsSockets.sessOn = serverSessOn;
    nsSockets.authorization = authorization;
    return nsSockets;
  };

  return io;

}


module.exports = expressionSocket;
