use join::join_server;
use local::run_local;
use start::start_server;

mod join;
mod local;
mod start;
mod utils;

#[tokio::main]
async fn main() {
    env_logger::init();

    let args: Vec<String> = std::env::args().collect();

    if args.len() <= 1 || (args[1] != "local" && args[1] != "server") {
        panic!("Provide a run target. Either `local` or `server`");
    }

    let target = &args[1];
    let action = &args.get(2);

    if target == "local" {
        run_local();
    } else if action.is_none() {
        panic!("Provide a server type. Either `serve` or `join`");
    }

    let action = action.unwrap();

    if action == "serve" {
        start_server().await;
    } else if action == "join" {
        join_server().await;
    }
}
