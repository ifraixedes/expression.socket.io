# expression.socket.io
This simple and micro node_module was born from my needs to get read/write to the fresh session, used in a express (3.0)/connect node web application, in the socket.io events.

I tested with connect 2.7.0, express 3.0.0rc5 and socket.io 0.9.11, but this it is alpha release so, surely, you can find some bugs and improvements.

## Installation

    $ npm install expression.socket.io

## Quick start

Write the boilerplate Express App and socket.io connection, bearing in mind to keep a reference to the used Connect cookie parser and session store.

```js
var settings = require('./settings.js');
var http = require('http');
var express = require('express');
var io = require('socket.io');

var app =  express();
var httpSrv = http.createServer(expressApp);

/** Configure the express app with middleware that your app needs in the correct order, in this example I have only put the two middlewares that the expression.socket.io needs **/

var connect = require('connect');
var cookieParser = express.cookieParser('my session secret');
var sessionStore = new connect.middleware.session.MemoryStore();

app.use(cookieParser);
app.use(express.session({
  store: sessionStore,
  cookie : {
    path : '/',
    httpOnly : true,
    maxAge : null
  }
}));

```
Then setup the expression.socket.io and write your events

```js
var ExpressionSocket = require('expression.socket.io');
var expressionIO = new ExpressionSocket(settings.socketIO, this.sessionStore, this.cookieParser);

expressionIO.sockets.on('connection', function(err, session, socket) {

    socket.sessOn('client says', function(err, session, data) {
      if (err) console.log(err);
      if (!session) {
        console.log('The session has not been got');
      } else {

        /**
            Here you can access to the session from the session argument received in this callback
        **/

        socket.emit('response', 'REPLY SOCKET FROM EXPRESSION.SOCKET.IO');
      }

    });
});

```

## But, how does it work?

The expression.socket.io returns a constructor function (ExpressSocket) that instance objects with one attribute, 'sockets', and one method 'of'.

'sockets' is an object that have three methods, 'authorization', 'on' and 'emit', that wrap the same methods over the socket.io#sockets attribute; in the other hand 'of' method return other object like 'sockets' but with the socket returned by socket.io#of method,which is a namespaced socket.io regarding the name of the namespace is different of empty string (socket.io#sockets is namespaced socket got from of method from a manager instance using empty string).

This two objects don't inherit from socket.io objects only are a wrapper, so other methods, offered over the socket.io#sockets and the socket returned by socket.io#of method, should be used directly from the objects references got from socket.io.

'emit' method provided in these two objects is the case commented above, it doesn't provide anything else that the call to the socket.io#emit, although it has been provided, for offering the main used methods in the more common applications which use socket.io.

The client socket received in the 'connection' event (socket.io#on('connection', cb)), is a prototyped socket.io#Socket instance with a method named 'sessOn' or with the 'on' method overridden, depending of the options provided in the expression.socket.io constructor (see the next sections), so all the socket.io#Socket methods are available, excepts the 'on' method if it has been overridden.

'sessOn' (or overridden 'on') callback receives one or two (depending of the expression.socket.io constructuro options) new parameters more than the original socket.io#Socket#on callback function; this new parameters are in the first positions, and after that/those, the parameters that the callback receive depending of the registered event listener.


## Using this module deeper

### Constructor

The constructor (ExpressionSocket function) receive four parameters, the three firsts are required, which are the socket.io reference after the call to listen, the Connect session store instance and the Connect cookie parser instance.

The fourth is optional, an is an object that can carry the next properties:

* key: Cookie name, by default 'connect.sid' is used
* alwaysSession: Boolean that if it is true then the socket.io#socket 'on' method will be overridden, otherwise the socket will have a new method named 'sessOn' that it will be used for register events tha the access to the session is required
* autoErrManager: boolean that if it is true, then the session access errors will be managed internally before to call the provided callback, aborting the call to it if one error happens, otherwise the callbacks will receive as first parameters an error parameter or null if there wasn't any error; by default it is false.

```js

var options = {
 key: 'mysessionname.sess',
 alwaysSession: true,
 autoErrManager: true
};

var ExpressionSocket = require('expression.socket.io');
var expressionIO = new ExpressionSocket(settings.socketIO, this.sessionStore, this.cookieParser, options);

```

### The sockets object and namespaced sockets

The callbacks receive one or two parameters more than the original callbacks that socket.io requests; if the autoErrManager has not been provided or false was specified, then the first parameter is an error object provided by cookie parser or session store or null if there wasn't any error or there was but they didn't provide an error object, in that case the second parameter, the session, it will be null or undefined.

If the autoErrManager was true, then the callback will be called if the session has been got and it will be provided to the callback as the first parameter.

#### on method (on 'connection' event)

The 'sockets' property and the socket got from the 'of' method from ExpressionSocket instance provides an 'on' and an 'authorization' methods like the socket.io but providing to the callback function access to the session; these two methods follow the convenction number of parameters provided to the callbacks, commented above.

The 'authorization' method is used to check the data provided by the client in the handshake process and assessing it to authorize or unauthorize the client connection (https://github.com/LearnBoost/socket.io/wiki/Authorizing); this method wrap the original socket.io 'authorization' method for providing to the callback access to the session.

```js

expressionIO.sockets.authorization(function(err, session, handshake, fn) {

    // This is an example, sure that you would like to check some stored values in the session

    if ((err) || (!session)) {
      fn(err, false);
    } else {
      fn(err, true);
    }
});

```

The 'on' method, which is usually used to manage the client connection, 'connection' event, follow the same convection number parameters (see the code example of the next section).

#### The client socket

The one or two parameters provided to the callbacks apply to the client socket (socket received in the on 'connection' event callback) in the callbacks specified in the events registered using the 'sessOn' method, or 'on' method if the alwaysSession options was true; note that this method checks if the specified callback has, moreover this/theses new parameter/s, zero, one or two parameters more, depending of the event registered.

The third parameter is usually a acknowledgement function if the client message requires it.

NOTE: That if you change the session data, then you will need to call the session#save method to save the changes.

The access to the session has a performance impact, so if you don't need to access to the session in some events, then don't specify the alwaysSession or put in false in the constructor options, and use the 'on' method which it is the original method provided by socket.io#socket.


```js
expressionIO.sockets.on('connection', function(err, session, socket) {

    socket.sessOn('get session data', function(err, session, data, ackFn) {

      if (err) console.log(err);
      if (!session) {
        console.log('The session has not been got');
      } else {

        console.log('The message recevied is: ' + data);
        ackFn('Server acknowledge');

        // Example, it would be need to check if the session has the user object and its name.

        socket.emit('response', 'server replies (socket 1) - user name:' + session.user.name);

        session.socket: 'I am the socket 1';
        session.save();

      }
    });

    socket.on('no session', function(data, ackFn) {
      ackFn('No session acknowledge - SOCKET');
      socket.emit('response', 'REPLY SOCKET from no session event');
    });
});

```
# Acknowledgements and Why I developed this module

I would like to thank to the people who wrote in some blogs how to grant to socket.io the access to the Connect/Express session, between others, Daniel Baulig (http://www.danielbaulig.de/socket-ioexpress/) and Robert Martin (http://notjustburritos.tumblr.com/post/22682186189/socket-io-and-express-3); and also to Wagner Camarao (https://github.com/functioncallback/session.socket.io) and Peter Klaesson (https://github.com/alphapeter/socket.io-express) for providing some modules in the same scope with it.

But it there are two modules which does it, why did I build it? Well, I have developed it, because I needed to access to the Express session but not only in the state that it is, when the client connects, but also when the client sends some messages, and I couldn't get it, with the modules that I found.


# LICENSE

License
(The MIT License)

Copyright (c) 2012 Ivan Fraixedes Cugat <ivan@fraicu.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
