'use strict';

module.exports = exports;

/**
 *
 * @param {Object} io socket.io reference after call listen
 * @param {Object} sessionStore Connect session store instance
 * @param {Function} cookieParser Connect cookie parser instance
 * @param {Object} [options] to setup the socket. Between them: key (cookie name, by default
 *          connect.sid), autoErrManager (boolean that if it is true, this manages internally the
 *          session error and if the session is not loaded, too; otherwise provide an error parameter
 *          to the listen callbacks, by default false)
 * @returns {Object} socket.io object (it has been prototyped with new bechaviours in some original
 *                       methods and  provided a new ones)
 */
function expressionSocket(io, sessionStore, cookieParser, options) {

  var key = 'connect.sid';
  var autoErrManager = false;

  if (options) {
    if (options.key) {
      key = options.key;
    }

    if (options.autoErrManager) {
      autoErrManager = options.autoErrManager;
    }
  }

  var findCookie = function(handshake) {
    return (handshake.secureCookies && handshake.secureCookies[key])
      || (handshake.signedCookies && handshake.signedCookies[key])
      || (handshake.cookies && handshake.cookies[key]) || false;
  };

  var authorization = function(callback) {

    this.__proto__.authorization(function(handshake, fn) {
      cookieParser(handshake, {}, function(parseErr) {

        var cookieId = findCookie(handshake);

        if ((parseErr) || (!cookieId)) {
          if (autoErrManager) {
            fn(parseErr, false);
            return;
          } else {
            callback(parseErr, null, handshake, fn);
          }
        }

        sessionStore.load(cookieId, function(storeErr, session) {

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

 var serverSessOn = function(event, callback) {

    this.on(event, function(socket) {
      cookieParser(socket.handshake, {}, function(parseErr) {

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

        sessionStore.load(socket.expressionCookieId, function(storeErr, session) {

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

   var clientSessOn = function(event, callback) {
     var self = this;

     this.on(event, function(data, ackFn) {
       sessionStore.load(self.expressionCookieId, function(storeErr, session) {

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


  io.sockets.sessOn = serverSessOn;
  io.sockets.authorization = authorization;

  io.of = function(namespace) {
    var nsSockets = this.__proto__.of.call(this, namespace);

    nsSockets.sessOn = serverSessOn;
    nsSockets.authorization = authorization;

    return nsSockets;
  };

  return io;

}


module.exports = expressionSocket;
