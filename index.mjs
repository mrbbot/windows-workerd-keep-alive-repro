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

const user1 = await spawnWorkerd("user.capnp", "0", { MESSAGE: "one" });
const proxy = await spawnWorkerd("proxy.capnp", "0", { TARGET: user1.url.href });

const res1 = await fetch(proxy.url);
console.log(await res1.text());

await user1.kill();
const user2 = await spawnWorkerd("user.capnp", user1.url.port, { MESSAGE: "two" });

const res2 = await fetch(proxy.url);
console.log(await res2.text());

await user2.kill();
await proxy.kill();