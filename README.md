# Bar.js

#### Take your cereal bowl of callbacks and turn them into a serial bar(.js)

## About
Bar.js is a simple control flow library to straighten out your callback nested code.  Its inspired by coroutines as a way to create small processes that can be consumed by other coroutines.  Functions can be defined that return a coroutine, which allows them to be consumed by other coroutines.

## Examples

Here's a simple example for doing a simple network request.
```js
function GetUserNameForId(userId) {
  return bar.Serial([
    function() {
      userId = userId || "cconger";

      var githubUserUrl = "https://github.com/users" + userId;
      
      return MakeNetworkConnection(githubUserUrl);
    },
    function(res) {
      res = res();
      console.log("Name", res.name);
      return res.name;
    }
  ]);
};
```

This expects there to be another coroutine defined called MakeNetworkConnection which opens the network connection and gives you the JSON parsed result.

We can go ahead and build that below.

First let me show you how you wrap conventional async functions.  Here we'll wrap setTimeout as an example of a simple async function. 
```js
function DelayedGreeting() {
  return bar.Serial([
    function() {
      setTimeout(Bar.callback(), 2000);
      return Bar.YIELD;
    },
    function(res) {
      res = res();

      console.log("Hello, world!");
    }
  ]);
}
```
Here we're passing Bar.callback() as an argument to SetTimeout.  It's pretty simple.  Arguments that get passed to Bar.callback will be proxied across to the results passed to the following function.

Below we'll use a node library called [request](https://github.com/mikeal/request) to implement MakeNetworkConnection.
```js

var request = require('request');

function MakeNetworkConnection(url) {
  return bar.Serial([
    function() {
      request(url, Bar.callback(function(error, response, body) { return body; }));
      return Bar.YIELD;
    }
  ]);
};

```
Here we pass an argument to Bar.callback which allows us to give a function which processes the data and returns the value.  This way we can do default values or other small processing things locally to make the API of your routine clean to be consumed by others. In our case, we use it to just pass the body of the response along.  However usually we would want to be able to handle errors and other response irregularlites.


## Tests
Run tests:

```
npm install jasmine-node
jasmine-node spec/
```

## Future
TODO:
 * Add .map
 * Add .forever and .BREAK for main looping functions
 * Add CoffeeScript Wrapper
 * Write better docs
 * Write more tests

