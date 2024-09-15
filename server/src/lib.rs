use connect4000_core::{debug_print_game, Coin, Coins, Color, Game, GameError, Groups, Player};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot, RwLock};
use wtransport::Identity;
use wtransport::{SendStream, ServerConfig as WTransportServerConfig};

pub use wtransport::{ClientConfig, Endpoint};

fn handle_play_coin(
    game: &mut Game,
    coins: &mut Coins,
    groups: &mut Groups,
    player: &Player,
    input: u64,
) -> Result<(), GameError> {
    if input as usize > coins.len() {
        return Err(GameError::ColumnOutOfBounds);
    }

    game.play_coin(
        player.id,
        input,
        &mut player.coin(groups.len() as u64),
        groups,
        coins,
    )?;

    debug_print_game(game, coins, 3);

    Ok(())
}

fn create_game() -> (Game, Coins, Groups) {
    let mut game = Game::default();

    let coins = game.set_columns(4).unwrap();
    let groups: Groups = HashMap::new();

    (game, coins, groups)
}

fn vec_to_u64(vec: Vec<u8>) -> u64 {
    let bytes: [u8; 8] = vec.try_into().unwrap();
    u64::from_be_bytes(bytes)
}

#[derive(Debug)]
pub enum Command {
    PlayCoin(u64),
    Closed,
}

impl Command {
    fn deserialize(binary: Vec<u8>) -> Self {
        if binary.is_empty() {
            return Command::Closed;
        }

        let op = binary.first().unwrap();

        match op {
            2 => {
                let rest = binary.get(1..9).unwrap().to_vec();
                Command::PlayCoin(vec_to_u64(rest))
            }
            fallthrough => {
                panic!("invalid command: {}", fallthrough);
            }
        }
    }

    pub fn serialize(&self) -> Vec<u8> {
        match self {
            Command::Closed => vec![],
            Command::PlayCoin(column_index) => {
                let mut buffer = vec![2];
                let mut column = column_index.to_be_bytes().to_vec();
                buffer.append(&mut column);
                buffer
            }
        }
    }
}

#[derive(Debug)]
pub struct JoinedViewData {
    player_id: u64,
    color: u8,
}

#[derive(Debug)]
pub struct SnapshotViewData<'a> {
    snapshot: &'a mut Vec<u8>,
    winner_id: Option<u64>,
    col_count: u64,
    row_count: u64,
}

#[derive(Debug)]
pub enum View<'a> {
    Snapshot(SnapshotViewData<'a>),
    Joined(JoinedViewData),
}

impl<'a> View<'a> {
    fn serialize(view: View) -> Vec<u8> {
        match view {
            View::Joined(JoinedViewData { player_id, color }) => {
                let mut buffer = vec![0];
                let mut vec = player_id.to_be_bytes().to_vec();
                vec.push(color);
                buffer.append(&mut vec);
                buffer
            }
            View::Snapshot(SnapshotViewData {
                snapshot,
                winner_id,
                col_count,
                row_count,
            }) => {
                let mut buffer = vec![1];
                let winner_id: u64 = winner_id.unwrap_or(0);
                buffer.extend_from_slice(&winner_id.to_be_bytes());
                buffer.extend_from_slice(&col_count.to_be_bytes());
                buffer.extend_from_slice(&row_count.to_be_bytes());
                buffer.append(snapshot);
                buffer
            }
        }
    }
}

#[derive(Debug)]
enum Actions {
    Snapshot(oneshot::Sender<(Vec<u8>, Option<u64>, u64, u64)>),
    PlayCoin(u64, u64),
    Join(oneshot::Sender<(Vec<u8>, Color)>),
}

fn serialize_coin_column(column: &[Coin]) -> Vec<u8> {
    let mut result = Vec::new();

    for coin in column.iter() {
        result.push(coin.color.serialize());
    }

    result
}

fn serialize_coins(coins: &Coins) -> (Vec<u8>, u64, u64) {
    let mut data = Vec::new();

    let number_of_columns: u64 = coins.len() as u64;
    let number_of_rows: u64 = coins.iter().fold(0, |acc, column| {
        if column.len() > acc {
            column.len()
        } else {
            acc
        }
    }) as u64;

    for column_index in 0..number_of_columns {
        let v: Vec<Coin> = Vec::new();
        let column = coins.get(column_index as usize).unwrap_or(&v);
        let mut column_result = serialize_coin_column(column);
        if column_result.len() > number_of_rows as usize {
            panic!("invalid column serialize");
        }
        column_result.resize(number_of_rows as usize, 0);
        data.append(&mut column_result);
    }

    (data, number_of_columns, number_of_rows)
}

#[derive(Debug)]
pub struct ServerConfig<'a> {
    pub port: u16,
    pub cert_path: &'a Path,
    pub key_path: &'a Path,
}

pub async fn start_server(config: ServerConfig<'_>, start_tx: oneshot::Sender<()>) {
    let identity = Identity::load_pemfiles(config.cert_path, config.key_path)
        .await
        .unwrap();

    let config = WTransportServerConfig::builder()
        .with_bind_default(config.port)
        .with_identity(&identity)
        .keep_alive_interval(Some(Duration::from_secs(3)))
        .build();
    let server = Endpoint::server(config).unwrap();

    let size = u8::MAX as usize;
    let (game_action_tx, mut game_action_rx) = mpsc::channel(size);

    start_tx.send(()).unwrap();

    // Game action thread, receive events from other threads to read/write game state
    tokio::spawn(async move {
        let mut game_data = create_game();
        let mut players: HashMap<u64, Player> = HashMap::new();

        loop {
            let action = game_action_rx.recv().await;
            if action.is_none() {
                panic!("action is none");
            }
            let action = action.unwrap();
            match action {
                Actions::PlayCoin(column, player_id) => {
                    log::info!("player dropped coin - {} - {}", player_id, column);

                    let player = players.get(&player_id).unwrap();

                    let _ = handle_play_coin(
                        &mut game_data.0,
                        &mut game_data.1,
                        &mut game_data.2,
                        player,
                        column,
                    );
                }
                Actions::Snapshot(view_tx) => {
                    log::info!("snapshot requested");

                    let (snapshot, col_count, row_count) = serialize_coins(&game_data.1);
                    view_tx
                        .send((snapshot, game_data.0.winner_id, col_count, row_count))
                        .unwrap();
                }
                Actions::Join(view_tx) => {
                    let player_id = (players.len() as u64) + 1;

                    log::info!("player joined - {}", player_id);

                    let next_index = player_id % 2;

                    let player = match next_index {
                        0 => Player::orange(player_id),
                        1 => Player::blue(player_id),
                        _ => panic!("invalid player gen index"),
                    };
                    players.insert(player_id, player.clone());

                    let player_id_bytes = player_id.to_be_bytes().to_vec();

                    view_tx.send((player_id_bytes, player.color)).unwrap();
                }
            }
        }
    });

    let broadcast_channels: Arc<RwLock<Vec<Arc<RwLock<SendStream>>>>> =
        Arc::new(RwLock::new(Vec::new()));

    //  Main loop, keep accepting new connections
    loop {
        let tx = game_action_tx.clone();

        let incoming_session = server.accept().await;

        let my_broadcast_channels = broadcast_channels.clone();
        // Start a thread for each new session
        tokio::spawn(async move {
            let command = incoming_session.await.unwrap();
            let connection = command.accept().await.unwrap();
            let (socket_tx, mut socket_rx) = connection.accept_bi().await.unwrap();
            let sock_tx = Arc::new(RwLock::new(socket_tx));

            // Register for broadcasting
            my_broadcast_channels.write().await.push(sock_tx.clone());

            // Game action - Join game
            let (join_view_tx, join_view_rx) = oneshot::channel();
            tx.send(Actions::Join(join_view_tx)).await.unwrap();
            let join_view = join_view_rx.await.unwrap();
            let color = join_view.1;
            let player_id = vec_to_u64(join_view.0);

            // View - Joined game
            sock_tx
                .write()
                .await
                .write_all(&View::serialize(View::Joined(JoinedViewData {
                    player_id,
                    color: color.serialize(),
                })))
                .await
                .unwrap();

            // View - Snapshot
            let (view_tx, view_rx) = oneshot::channel();
            tx.send(Actions::Snapshot(view_tx)).await.unwrap();
            let mut snapshot = view_rx.await.unwrap();
            sock_tx
                .write()
                .await
                .write_all(&View::serialize(View::Snapshot(SnapshotViewData {
                    snapshot: &mut snapshot.0,
                    winner_id: snapshot.1,
                    col_count: snapshot.2,
                    row_count: snapshot.3,
                })))
                .await
                .unwrap();

            let my_broadcast_channels = my_broadcast_channels.clone();
            // Command thread, ingests http3 streams, creating actions to pass to worker threads
            // and views to reply with
            tokio::spawn(async move {
                loop {
                    let size = u8::MAX as usize;
                    let mut buffer = vec![0; size];
                    log::debug!("Waiting to read from stream... {}", size);
                    socket_rx.read(&mut buffer).await.unwrap();

                    log::debug!("Read from stream! Attempting to deserialize into command...");

                    let command = Command::deserialize(buffer.to_vec());

                    log::debug!("Deserialized into command! {:?}", command);

                    match command {
                        Command::PlayCoin(column) => {
                            tx.send(Actions::PlayCoin(column, player_id)).await.unwrap();

                            let (view_tx, view_rx) = oneshot::channel();
                            tx.send(Actions::Snapshot(view_tx)).await.unwrap();
                            let mut snapshot = view_rx.await.unwrap();

                            let serialized = View::serialize(View::Snapshot(SnapshotViewData {
                                snapshot: &mut snapshot.0,
                                winner_id: snapshot.1,
                                col_count: snapshot.2,
                                row_count: snapshot.3,
                            }));

                            for broadcast in my_broadcast_channels.read().await.iter() {
                                broadcast
                                    .write()
                                    .await
                                    .write_all(&serialized)
                                    .await
                                    .unwrap();
                            }
                        }
                        Command::Closed => {
                            println!("The client has closed the socket....");
                        }
                    };
                }
            })
            .await
            .unwrap()
        });
    }
}

// #[cfg(test)]
// mod test;
