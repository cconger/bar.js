define(function() {
  var activeQueue = null;
  var Queue = function(scope, functions, result) {
    this.scope = scope;
    this.functions = functions;
    this.lastResult = new Value(result);
    this.waitingForCallback = false;
    this.dependentQueue = null;
  };

  var Value = function(val) {
    this.value = val;
  };

  var next = function (queue, overrideValue) {
    activeQueue = queue;
    var fn = queue.functions.shift();
    while(fn) {
      var res = fn.call(queue.scope, function() {
        var oldRes = overrideValue || queue.lastResult;
        return oldRes && oldRes.value;
      });

      if (res === YIELD) {
        queue.waitingForCallback = true;
        break;
      } else if (res instanceof Queue) {
        res.dependentQueue = queue;
        if (res.waitingForCallback) {
          break;
        } else {
          overrideValue = res.lastResult
        }
      } else {
        queue.lastResult = new Value(res);
        next(queue);
      }

      var fn = queue.functions.shift();
    }
    if(!fn) {
      if (queue.dependentQueue) {
        next(queue.dependentQueue, queue.lastResult || overrideValue)
      }
    }

    return queue;
  };

  var defaultDataProcessor = function(data) {
    return data;
  };

  var callback = function(dataProcessor) {
    var myQueue = activeQueue;
    dataProcessor = dataProcessor || defaultDataProcessor;


    return function() {
      if (!myQueue.waitingForCallback) {
        console.warn("Tried to resume a queue more than once");
      }
      var res = dataProcessor.apply(myQueue.scope, arguments);
      //This assumes that there is not a coroutine in the data processor
      myQueue.waitingForCallback = false;
      next(myQueue, new Value(res));
    }
  };

  var YIELD = {yield:true};

  var serial = function(scope, functions) {
    var queue = new Queue(scope, functions);
    return next(queue);
  };

  return {
    callback: callback,
    YIELD: YIELD,
    serial: serial
  };
});
