// Conditional definition to work also in the browser
// tests where Freezer is global
if (typeof Freezer == "undefined") {
  var Freezer = require("../build/freezer.js");
  var assert = require("assert");
}

var freezer, data;

var example = {
  a: 1,
  b: { z: 0, y: 1, x: ["A", "B"] },
  c: [1, 2, { w: 3 }],
  d: null,
};

describe("Freezer events test", function () {
  beforeEach(function () {
    freezer = new Freezer(example);
    data = freezer.getData();
  });

  it("Creating a listener", function () {
    var listener = data.b.getListener();
    assert.notEqual(listener.on, undefined);
    assert.notEqual(listener.once, undefined);
    assert.notEqual(listener.off, undefined);
    assert.notEqual(listener.emit, undefined);
  });

  it("Listen to node updates", function (done) {
    var listener = data.b.getListener(),
      count = 0;
    listener.on("update", function (data) {
      assert.equal(data.c, 3);
      assert.equal(freezer.getData().b.c, 3);
      done();
    });

    data.b.set({ c: 3 });
  });

  it("Node updates should return the current and previous node.", function (done) {
    var listener = data.b.getListener(),
      initialB = data.b,
      count = 0;
    listener.on("update", function (state, prevState) {
      assert.equal(state, freezer.getData().b);
      assert.equal(prevState, initialB);
      done();
    });

    data.b.set({ c: 3 });
  });

  it("Listen to multiple node updates", function (done) {
    var listener = data.b.getListener(),
      count = 0;
    freezer.getEventHub().on("update", function (data) {
      assert.equal(data.b.c, 3);
      done();
    });

    freezer.get().b.set({ c: 1 });
    freezer.get().b.set({ c: 2 });
    freezer.get().b.set({ c: 3 });
  });

  it("Events must be asynchronous for all the nodes", function () {
    var triggered = "0",
      handler = function (key) {
        return function (update) {
          triggered += key;
        };
      };
    data.getListener().on("update", handler(2));
    data.c.getListener().on("update", handler(3));
    data.c[2].getListener().on("update", handler(4));
    freezer.getEventHub().on("update", handler(1));

    data.c[2].set({ w: 4 });

    assert.equal(triggered, "0");
  });

  it("Listen to multiple node updates, live mode", function (done) {
    var freezer = new Freezer(example, { live: true }),
      listener = freezer.get().b.getListener(),
      count = 0;
    freezer.getEventHub().on("update", function (data) {
      if (++count == 3) {
        assert.equal(data.b.c, 3);
        done();
      }
    });

    freezer.get().b.set({ c: 1 });
    freezer.get().b.set({ c: 2 });
    freezer.get().b.set({ c: 3 });
  });

  it("Updates should also return previous node in live mode", function (done) {
    var freezer = new Freezer(example, { live: true }),
      listener = freezer.get().b.getListener(),
      count = 0;
    freezer.getEventHub().on("update", function (data, prev) {
      if (++count == 3) {
        assert.equal(data.b.c, 3);
        assert.equal(prevB, prev.b);
        done();
      }
    });

    freezer.get().b.set({ c: 1 });
    var prevB = freezer.get().b.set({ c: 2 });
    freezer.get().b.set({ c: 3 });
  });

  it("Live mode should trigger in all parents synchronously.", function () {
    var freezer = new Freezer(example, { live: true }),
      data = freezer.get(),
      triggered = "",
      handler = function (key) {
        return function (update) {
          triggered += key;
        };
      };
    freezer.getEventHub().on("update", handler(1));
    data.c.getListener().on("update", handler(3));
    data.c[2].getListener().on("update", handler(4));

    data.c[2].set({ w: 4 });

    assert.equal(triggered, "431");
  });

  it("Listen to root updates", function (done) {
    freezer.getEventHub().on("update", function () {
      assert.equal(freezer.getData().b.c, 3);
      done();
    });

    data.b.set({ c: 3 });
  });

  it("Update events should return new and old nodes", function (done) {
    freezer.getEventHub().on("update", function (state, prevState) {
      assert.equal(freezer.getData(), state);
      assert.equal(data, prevState);
      done();
    });

    data.b.set({ c: 3 });
  });

  it("Listen to multiple root updates", function (done) {
    freezer.getEventHub().on("update", function (data) {
      assert.equal(data.b.c, 3);
      assert.equal(freezer.get().b.c, 3);
      done();
    });

    freezer.get().b.set({ c: 1 }).set({ c: 2 }).set({ c: 3 });
  });

  it("Listen to multiple root updates, live mode", function (done) {
    var freezer = new Freezer(example, { live: true }),
      count = 0;
    freezer.getEventHub().on("update", function (data) {
      if (++count == 3) {
        assert.equal(data.b.c, 3);
        assert.equal(freezer.get().b.c, 3);
        done();
      }
    });

    freezer.get().b.set({ c: 1 }).set({ c: 2 }).set({ c: 3 });
  });

  it("Listen to updates adding a duplicate", function (done) {
    var listener = data.c.getListener();

    listener.on("update", function (d) {
      assert.equal(d[2].u, data.b.x);
      assert.equal(freezer.getData().c[2].u, freezer.getData().b.x);
      done();
    });

    data.c[2].set({ u: data.b.x });
  });

  it("Listen to multiple updates", function (done) {
    var listener = data.b.getListener(),
      i = 3;
    listener.on("update", function (data) {
      assert.equal(data.c, i);

      if (i == 6) done();
      else data.set({ c: ++i });
    });

    data.b.set({ c: ++i });
  });

  it("Replace the data should trigger an update", function (done) {
    data.b.set({ c: 3 });

    freezer.getEventHub().on("update", function () {
      assert.deepEqual(freezer.getData(), data);
      done();
    });

    freezer.setData(data);
  });

  it("Unmodified wrappers when replacing the data should preserve the listeners", function (done) {
    data.b.set({ z: 2, y: 3 });
    data.c.shift();

    var updated = freezer.getData(),
      listener = updated.c[1].getListener();
    listener.on("update", function (data) {
      assert.equal(data.u, 10);
      done();
    });

    freezer.setData(data);
    freezer.getData().c[2].set({ u: 10 });
  });

  it("Array chained calls should trigger update with all changes applied", function (done) {
    var listener = data.c.getListener();

    listener.on("update", function (updated) {
      assert.equal(updated[0], 0);
      assert.equal(updated[3], 3);
      done();
    });

    data.c.pop().push(3).unshift(0);
  });

  it("Hash chained calls should trigger update with all changes applied", function (done) {
    var listener = data.b.getListener();

    listener.on("update", function (updated) {
      assert.equal(updated.y, 3);
      assert.equal(updated.x, undefined);
      assert.equal(updated.a, 2);
      done();
    });

    data.b.set({ y: 3 }).remove("x").set({ a: 2 });
  });

  it("Reset of node should trigger an update", function (done) {
    var foobar = { foo: "bar", bar: "foo" };

    freezer.getEventHub().on("update", function (newData) {
      assert.deepEqual(newData.b, foobar);
      done();
    });

    data.b.reset(foobar);
  });

  it("Reset a node with a node", function (done) {
    var updated = data.c.reset(data.b);

    var listener = updated.getListener();

    listener.on("update", function (updated) {
      var result = { z: 0, y: 1, x: ["A", "B"], foo: "bar" },
        data = freezer.getData();
      assert.deepEqual(updated, result);
      assert.equal(updated, data.b);
      assert.equal(updated, data.c);
      done();
    });

    freezer.getData().b.set("foo", "bar");
  });

  it("Removing a listener", function (done) {
    var called = false,
      handler = function (update) {
        if (called) throw new Error("The listener has not been removed");

        called = true;
        assert.equal(update.b, undefined);
        freezer.getEventHub().off("update", handler);
        update.remove("a");
        setTimeout(done, 100);
      };
    freezer.getEventHub().on("update", handler);
    data.remove("b");
  });

  it("Now is synchronous", function () {
    var triggered = 0;

    var handler = function (update, prevState) {
      assert.equal(update.a, 2);
      assert.equal(freezer.get().a, 2);
      assert.equal(data, prevState);
      triggered++;
    };

    freezer.getEventHub().on("update", handler);
    freezer.get().set({ a: 2 }).now();
    freezer.getEventHub().off("update", handler);

    handler = function (update) {
      assert.equal(update.b, undefined);
      assert.equal(freezer.get().b, undefined);
      triggered++;
    };
    freezer.getEventHub().on("update", handler);
    freezer.get().remove("b").now();
    freezer.getEventHub().off("update", handler);

    handler = function (update) {
      assert.equal(update.c[3], 3);
      assert.equal(freezer.get().c[3], 3);
      triggered++;
    };
    freezer.getEventHub().on("update", handler);
    freezer.get().c.push(3).now();
    freezer.getEventHub().off("update", handler);

    handler = function (update) {
      assert.equal(update.c[0], 2);
      assert.equal(freezer.get().c[0], 2);
      assert.equal(update.c.length, 3);
      triggered++;
    };
    freezer.getEventHub().on("update", handler);
    freezer.get().c.shift().now();
    freezer.getEventHub().off("update", handler);

    assert.equal(triggered, 4);
  });

  it("Now must be synchronous for all the nodes", function () {
    var triggered = "",
      handler = function (key) {
        return function (update) {
          triggered += key;
        };
      };
    data.getListener().on("update", handler(2));
    data.c.getListener().on("update", handler(3));
    data.c[2].getListener().on("update", handler(4));
    freezer.getEventHub().on("update", handler(1));

    data.c[2].set({ w: 4 }).now();

    assert.equal(triggered, "4321");
  });

  it("Now must trigger just one event", function (done) {
    freezer.getEventHub().on("update", function (update) {
      // If we get here and call done twice
      // an error will be thrown
      assert.equal(update.a, 10);
      done();
    });
    data.set({ a: 10 }).now();
  });

  it("beforeAll afterAll", function (done) {
    var out = "";
    freezer
      .on("someEvent", function () {
        out += " event ";
      })
      .on("beforeAll", function (eventName, arg1, arg2) {
        out = eventName + arg1 + arg2;
      })
      .on("afterAll", function (eventName, arg1, arg2) {
        out += eventName + arg1 + arg2;
      });

    freezer.getEventHub().emit("someEvent", 1, 2);

    setTimeout(function () {
      assert.equal(out, "someEvent12 event someEvent12");
      done();
    }, 150);
  });

  it("beforeAll afterAll are triggered at update", function (done) {
    var out = "";
    freezer
      .on("update", function () {
        out += " event ";
      })
      .on("beforeAll", function (eventName, update, prevState) {
        assert.equal(update.a, 10);
        assert.equal(prevState, data);
        out = eventName;
      })
      .on("afterAll", function (eventName, update, prevState) {
        assert.equal(update.a, 10);
        assert.equal(prevState, data);
        out += eventName;
      });

    data.set({ a: 10 });

    setTimeout(function () {
      assert.equal(out, "update event update");
      done();
    }, 150);
  });

  it("All the parents of a duplicated node should trigger update", function (done) {
    data.b.set({ u: data.c[2] });

    var bUpdated = false,
      cUpdated = false;
    var l1 = freezer
      .get()
      .b.getListener()
      .on("update", function () {
        bUpdated = true;
      });
    var l2 = freezer
      .get()
      .c.getListener()
      .on("update", function () {
        cUpdated = true;
      });

    freezer.get().b.u.set({ w: 5 });

    setTimeout(function () {
      assert(bUpdated);
      assert(cUpdated);
      done();
    }, 250);
  });

  it("Trigger should return callback return value", function () {
    freezer.on("whatever", function () {
      return "ok";
    });

    assert.equal(freezer.emit("whatever"), "ok");
  });

  it("Trigger should return last callback's return value", function () {
    freezer
      .on("whatever", function () {
        return "no";
      })
      .on("whatever", function () {
        return "ok";
      });

    assert.equal(freezer.emit("whatever"), "ok");
  });

  it("Trigger shouldn't return callback's undefined values", function () {
    freezer
      .on("whatever", function () {
        return "ok";
      })
      .on("whatever", function () {
        // This doesn't return anything
      });

    assert.equal(freezer.emit("whatever"), "ok");
  });

  it("Two different freezer instances shouldn't listen to other's update events", function (done) {
    var f1 = new Freezer({ name: "f1", triggered: 0 }),
      f2 = new Freezer({ name: "f2", triggered: 0 });
    f1.on("update", function (data) {
      assert.equal(data.name, "f1");
      assert.equal(data.triggered, 1);
    });

    f2.on("update", function (data) {
      assert.equal(data.name, "f2");
      assert.equal(data.triggered, 1);
    });

    f1.get().set({ triggered: f1.get().triggered + 1 });
    f2.get().set({ triggered: f2.get().triggered + 1 });

    setTimeout(done, 50);
  });
});
