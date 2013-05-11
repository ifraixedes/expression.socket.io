# expression.socket.io

This simple and micro node_module was born from my needs to get read/write to the fresh session, used in a express (3.0)/connect node web application, in the socket.io events.

I tested with connect 2.7.3, express 3.1.0 and socket.io 0.9.13, but this it is a beta release becasuse I didn't execute any test framework and in the present time, it is used in the private beta release of iWaz.at (http://www.iwaz.at).

## Installation

    $ npm install expression.socket.io

## Quick start

Write the boilerplate Express App and socket.io connection, bearing in mind to keep a reference to the used Connect cookie parser and session store.

```js
var http = require('http');
var express = require('express');

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

var io = require('socket.io');
var expressionSocketIo = require('expression.socket.io');

expressionSocketIo(io, sessionStore, cookieParser);

// In this line our socket.io is ready to get the session as parameter in authentication callback
// and event listeners registered with the new available sessOn method

io.sockets.sessOn('connection', function(err, session, socket) {

    socket.sessOn('client says', function(err, session, data) {
        if (err) {
            console.log(err);
            return;
        }

        if (!session) {
            console.log('The session has not been got');
        } else {

        //Here you can access to the session from the session argument received in this callback

        socket.emit('response', 'REPLY SOCKET FROM EXPRESSION.SOCKET.IO');
      }

    });
});

```

## But, how does it work?

The expression.socket.io is just a function that wrap the original 'authorization' socket.io method to provide to the
callback received like parameter with the fresh express user's session, besides the usual error paremeter of the node convention callbacks.

It also attaches to the socket a new one method 'sessOn', to register event listeners which we need access to user's
session to perform some action tha our uses cases require.

This two commented tweaks apply in the same way for the namespaced sockets, so socket.io#of method returns a socket
with those tweaks, unless 'true' value has been passed as second parameter, the first one is the namespace id required by the original socket.io#of method.

In all the rest, socket.io is the same as if expression.socket.io hadn't been applied.


## Using this module deeper

### The function parameters

Expression.socket.io receives four parameters, the first three are required, the last one is an object of options and each option no specified, a default value is used.

1. io: The socket.io object, returned by socket.io#listen.
2. session store: The connect's session store used in your web application.
3. cookie parser: The express' (connect) cookie parser function used in your web application.
4. options: It's an optional object that it may have the next properties:
    * key: The cookie name, by default 'connect.sid'
    * autoErrManager: boolean that if it is 'true', then any error to retrieve the session is managed internally; otherwise provide an error parameter to the listen callbacks; by default 'false'.
    * noSessIo: A boolean which if it is true, then the 'authentication' method that deals with with session and the 'sessOn'  method won't be applied to the io.sockets, so it will an original socket.io but with the possibility to get namespaced sockets with the session features.

The functions returns the socket.io object received like first parameter, to allow the chaining.


```js

var options = {
 key: 'mysessionname.sess',
 autoErrManager: true,
 noSessIo: true
};

var expressionSocketIo = require('expression.socket.io');
var expressionIo = expressionSocketIo(io, sessionStore, cookieParser, options);

```

### The sockets object and namespaced sockets

The callbacks receive one or two parameters more than the original callbacks that socket.io requests; if the autoErrManager has not been provided or false was specified, then the first parameter is an error object provided by cookie parser or session store or null if there wasn't any error or there was one but they didn't provide an error object, in that case the second parameter, the session, it will be null or undefined.

If the autoErrManager was true, then the callback will be called if the session has been got and it will be provided to the callback as the first parameter, the following parameters are the parameters of the original socket.io's methods.


#### authorization method (when session is applied)

The 'authorization' method is used to check the data provided by the client in the handshake process and to evalute if the client is authorized or not connection (https://github.com/LearnBoost/socket.io/wiki/Authorizing).

```js

io.sockets.authorization(function(err, session, handshake, fn) {

    // This is an example, sure that you would like to check some stored values in the session

    if ((err) || (!session)) {
      fn(err, false);
    } else {
      fn(err, true);
    }
});

```

#### onSess method (on 'connection' event)

'onSess' method is used as the original 'on' method with the difference that the callback receive the session like parameter.


```js

io.sockets.sessOn('connection', function(err, session, socket) {

    socket.sessOn('client says', function(err, session, data) {
        if (err) {
            console.log(err);
            return;
        }

        if (!session) {
            console.log('The session has not been got');
        } else {

        //Here you can access to the session from the session argument received in this callback

        socket.emit('response', 'REPLY SOCKET FROM EXPRESSION.SOCKET.IO');
      }

    });
});

```

#### The client socket

The clients' socket as the server's socket has the 'sessOn', which receive two parameters more at the beginning followed by the socket.io's original parameters, so one or two depending if the client emitter expects and acknowledgement.

NOTE: That if you change the session data, then you will need to call the session#save method to persist the new changes.
Also, bear in mind that the access to the session has a performance impact, so if you don't need to access to the session in some events, then use the original 'on' method.


```js
io.sockets.on('connection', function(err, session, socket) {

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

# Main difference between this release and 0.0.x

* The session socket is the same socket.io instance object returned by socket.io#listen, so all the functionalities plus the session features are available on it. The order release was a wrapper object, so some features, like use session in rooms weren't possible.

* The module is just a function, rather than a Constructor.

# Acknowledgements and Why I developed this module

I would like to appreciate to the people who wrote in some blogs how to grant to socket.io the access to the Connect/Express session, between others, Daniel Baulig (http://www.danielbaulig.de/socket-ioexpress/) and Robert Martin (http://notjustburritos.tumblr.com/post/22682186189/socket-io-and-express-3); and also to Wagner Camarao (https://github.com/functioncallback/session.socket.io) and Peter Klaesson (https://github.com/alphapeter/socket.io-express) for providing some modules in the same scope with it.

But it there are two modules which does it, why did I build it? Well, I have developed it, because I needed to access to the Express session but not only in the state that it is, when the client connects, but also when the client sends some messages, and as I couldn't get the fresh session with the modules that I found.


# LICENSE

License
(The MIT License)

Copyright (c) 2013 Ivan Fraixedes Cugat <ifcdev@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
