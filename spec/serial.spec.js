var Bar = require("../bar.js");

describe("Bar.serial", function() {
  describe("Synchronous Functions", function() {
    it("executed in order", function() {
      var val = 0;
      var time = Date.now();
      Bar.serial({}, [
        function() {
          expect(++val).toBe(1);
          expect(Date.now() >= time).toBe(true);
          time = Date.now();
          return val;
        },
        function(res) {
          res = res();
          expect(++val).toBe(2);
          expect(Date.now() >= time).toBe(true);
          return val;
        }
      ]);
    });

    it("executed all functions", function() {
      var val = 0;
      Bar.serial({}, [
        function() {
          expect(++val).toBe(1);
          return val;
        },
        function(res) {
          res = res();
          expect(++val).toBe(2);
          return val;
        }
      ]);

      expect(++val).toBe(3);
    });

    it("appropriately binds context", function() {
      var context = {
        foo: 0,
        addFoo: function(val) { return val + this.foo }
      };
      Bar.serial(context, [
        function() {
          expect(this.foo).toBe(0);
          this.foo = 1;
          var res = this.addFoo(10);
          expect(res).toBe(11);
        }
      ]);
    });

    it("executes nested routines in order", function() {
      var val = 0;
      Bar.serial({}, [
        function() {
          expect(++val).toBe(1);
          return;
        },
        function() {
          return Bar.serial({}, [
            function() {
              expect(++val).toBe(2);
              return;
            },
            function() {
              expect(++val).toBe(3);
              return;
            }
          ]);
        },
        function() {
          expect(++val).toBe(4);
          return;
        }
      ]);
    });

    it("executes routines called from another function", function() {
      var val = {count: 0};

      var fn = function(val) {
        return Bar.serial({}, [
          function() {
            expect(++val.count).toBe(2);
          },
          function() {
            expect(++val.count).toBe(3);
          }
        ]);
      };

      Bar.serial({}, [
        function() {
          expect(++val.count).toBe(1);
        },
        function() {
          return fn(val);
        },
        function() {
          expect(++val.count).toBe(4);
        }
      ]);
    });

    it("values are passed between functions", function() {
      Bar.serial({}, [
        function() {
          var val = 0;
          expect(++val).toBe(1);
          return val;
        },
        function(res) {
          res = res();
          expect(++res).toBe(2);
          return {message: true};
        },
        function(res) {
          res = res();
          expect(res.message).toBe(true);
        }
      ]);
    });

    it("values are passed between functions", function() {
      Bar.serial({}, [
        function() {
          var val = 0;
          expect(++val).toBe(1);
          return val;
        },
        function(res) {
          res = res();
          expect(++res).toBe(2);
          return {message: true};
        },
        function(res) {
          res = res();
          expect(res.message).toBe(true);
        }
      ]);
    });

    it("values are passed between nested routines", function() {
      Bar.serial({}, [
        function() {
          var val = 0;
          expect(++val).toBe(1);
          return val;
        },
        function(res) {
          res = res();
          return Bar.serial({}, [
            function() {
              expect(++res).toBe(2);
              return res;
            },
            function(res) {
              res = res();
              expect(++res).toBe(3);
              return res;
            }
          ]);
        },
        function(res) {
          res = res();
          expect(++res).toBe(4);
          return res;
        }
      ]);
    });

    it("executes all nested routines", function() {
      var val = 0;
      var terminator = jasmine.createSpy();

      Bar.serial({}, [
        function() {
          expect(++val).toBe(1);
          return val;
        },
        function(res) {
          res = res();
          return Bar.serial({}, [
            function() {
              expect(++val).toBe(2);
            }
          ]);
        },
        function(res) {
          res = res();
          terminator();
          ++val;
        }
      ]);

      waitsFor(function() {
        return terminator.callCount > 0;
      }, 200);
      runs(function() {
        expect(val).toBe(3);
      });
    });
  });

  describe("Asynchronous Functions", function() {
    it("executed in order", function() {
      var val = 0;
      var terminator = jasmine.createSpy();

      Bar.serial({}, [
        function() {
          expect(++val).toBe(1);
          setTimeout(Bar.callback(), 100);
          return Bar.YIELD;
        },
        function(res) {
          res = res();
          terminator();
          ++val;
        }
      ]);

      expect(++val).toBe(2);
      waitsFor(function() {
        return terminator.callCount > 0;
      }, 200);
      runs(function() {
        expect(val).toBe(3);
      });
    });

    it("sends passed value through callback", function() {
      var val = 0;
      var terminator = jasmine.createSpy();

      Bar.serial({}, [
        function() {
          expect(++val).toBe(1);
          setTimeout(Bar.callback(function(){return "hi";}), 100);
          return Bar.YIELD;
        },
        function(res) {
          res = res();
          expect(res).toBe("hi");
          terminator();
          ++val;
        }
      ]);

      expect(++val).toBe(2);
      waitsFor(function() {
        return terminator.callCount > 0;
      }, 200);
      runs(function() {
        expect(val).toBe(3);
      });
    });

    it("executed in order with function", function() {
      var terminator = jasmine.createSpy();
      var unit = function(a) {return a;};
      var unitSpy = jasmine.createSpy(unit);
      var val = 0;

      var sleep = function() {
        return Bar.serial({}, [
          function() {
            setTimeout(Bar.callback(), 100);
            return Bar.YIELD;
          }
        ]);
      };

      Bar.serial({}, [
        function() {
          expect(++val).toBe(1);
          return sleep();
        },
        function() {
          expect(++val).toBe(3);
          terminator();
        }
      ]);

      expect(++val).toBe(2);

      waitsFor(function() {
        return terminator.callCount > 0;
      }, 200);
      runs(function() {
        expect(val).toBe(3);
      });
    });

    it("excutes in order when objects define routines", function() {
      var terminator = jasmine.createSpy();
      var unit = function(a) {return a;};
      var unitSpy = jasmine.createSpy(unit);
      var val = 0;

      var Sleeper = function() {
        this.name = "Sleeper";
      };
      Sleeper.prototype.sleep = function() {
        return Bar.serial(this, [
          function() {
            setTimeout(Bar.callback(), 100);
            expect(this.name).toBe("Sleeper")
            return Bar.YIELD;
          }
        ]);
      }

      var mySleeper = new Sleeper();

      Bar.serial({}, [
        function() {
          expect(++val).toBe(1);
          return mySleeper.sleep();
        },
        function() {
          expect(++val).toBe(3);
          terminator();
        }
      ]);

      expect(++val).toBe(2);

      waitsFor(function() {
        return terminator.callCount > 0;
      }, 200);
      runs(function() {
        expect(val).toBe(3);
      });
    });

    it("executed in order nested", function() {
      var val = 0;
      var terminator = jasmine.createSpy();

      Bar.serial({}, [
        function() {
          expect(++val).toBe(1);
          setTimeout(Bar.callback(), 100);
          return Bar.YIELD;
        },
        function(res) {
          return Bar.serial({}, [
            function() {
              expect(++val).toBe(3);
              return val;
            },
          ]);
        },
        function(res) {
          res = res();
          expect(++val).toBe(4);
          terminator();
        }
      ]);

      expect(++val).toBe(2);
      waitsFor(function() {
        return terminator.callCount > 0;
      }, 200);
      runs(function() {
        expect(val).toBe(4);
      });
    });
  });
});
