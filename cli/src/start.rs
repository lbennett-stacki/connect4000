use std::path::Path;

use connect4000_server::ServerConfig;
use tokio::sync::oneshot;

pub async fn start_server() {
    let (started_tx, started_rx) = oneshot::channel();

    let config = ServerConfig {
        port: 4001,
        cert_path: Path::new("../tls/cert.pem"),
        key_path: Path::new("../tls/key.pem"),
    };

    let server_thread = tokio::spawn(async move {
        println!("\n\n Starting server with config: {:?}", config);
        connect4000_server::start_server(config, started_tx).await;
    });

    started_rx.await.unwrap();

    server_thread.await.unwrap();
}
