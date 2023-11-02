import assert from "node:assert";
import events from "node:events";
import childProcess from "node:child_process";
import workerd from "workerd";

function spawnWorkerd(configPath, port, env = {}) {
  return new Promise((resolve) => {
    const workerdProcess = childProcess.spawn(
      workerd.default,
      ["serve", "--verbose", "--control-fd=3", `--socket-addr=http=127.0.0.1:${port}`, configPath],
      { env, stdio: ["inherit", "inherit", "inherit", "pipe"] }
    );
    const exitPromise = events.once(workerdProcess, "exit");
    workerdProcess.stdio[3].on("data", (chunk) => {
      const message = JSON.parse(chunk.toString().trim());
      assert.strictEqual(message.event, "listen");
      resolve({
        url: new URL(`http://127.0.0.1:${message.port}`),
        async kill() {
          workerdProcess.kill("SIGKILL");
          await exitPromise;
        }
      });
    });
  })
}

// Start user worker and proxy worker on random ports
const user1 = await spawnWorkerd("user.capnp", "0", { MESSAGE: "one" });
const proxy = await spawnWorkerd("proxy.capnp", "0");

// Send request to user worker through proxy worker
const res1 = await fetch(proxy.url, { headers: { Target: user1.url.href } });
console.log({ res1: await res1.text() }); // "one"

// Restart user worker on same port
await user1.kill();
const user2 = await spawnWorkerd("user.capnp", user1.url.port, { MESSAGE: "two" });

// Send request to new user worker through proxy worker
const res2 = await fetch(proxy.url, { headers: { Target: user1.url.href } });
console.log({ res2: await res2.text() }); // Internal Server Error, expected "two"

// Send another request to new user worker through proxy worker, now succeeds
const res3 = await fetch(proxy.url, { headers: { Target: user1.url.href } });
console.log({ res3: await res3.text() }); // "two"

await user2.kill();
await proxy.kill();