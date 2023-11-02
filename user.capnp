using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    ( name = "main", worker = .worker ),
  ],
  sockets = [
    ( name = "http", http = (), service = "main" ),
  ]
);

const worker :Workerd.Worker = (
  modules = [
    ( name = "index.mjs",
      esModule =
        `export default {
        `  fetch(request, env, ctx) {
        `    return new Response(env.MESSAGE);
        `  }
        `}
    )
  ],
  bindings = [
    ( name = "MESSAGE", fromEnvironment = "MESSAGE" )
  ],
  compatibilityDate = "2023-10-01",
);
