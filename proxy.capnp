using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    ( name = "main", worker = .worker ),
    ( name = "internet", network = ( allow = ["private", "public"] ) ),
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
        `    return fetch(env.TARGET);
        `  }
        `}
    )
  ],
  bindings = [
    ( name = "TARGET", fromEnvironment = "TARGET" )
  ],
  compatibilityDate = "2023-10-01",
);
