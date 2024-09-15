use connect4000_core::{debug_render_game, Coin, Coins, Color};
use connect4000_server::{ClientConfig, Command, Endpoint};

use crate::utils::clear_screen;

pub fn get_user_column_input() -> u64 {
    let mut input = String::new();
    std::io::stdin().read_line(&mut input).unwrap();
    let input = input.trim().parse::<u64>();

    if input.is_err() {
        panic!("Invalid column input!");
    }

    input.unwrap() - 1
}

fn debug_print_snapshot(snapshot: &[u8], indent: usize) {
    let mut new_coins = Coins::default();

    let winner_id = u64::from_be_bytes(snapshot.get(1..9).unwrap().try_into().unwrap());

    let number_of_columns = u64::from_be_bytes(snapshot.get(9..17).unwrap().try_into().unwrap());

    let number_of_rows = u64::from_be_bytes(snapshot.get(17..25).unwrap().try_into().unwrap());

    let has_winner = winner_id != 0;

    let header_offset = 25;

    for column_index in 0..number_of_columns {
        let mut new_column = Vec::new();

        for row_index in 0..number_of_rows {
            let index = (column_index * number_of_rows) + row_index;
            let coin = snapshot.get(header_offset + index as usize).unwrap();
            let coin = *coin;
            if coin == 0 {
                continue;
            }
            new_column.push(Coin {
                color: Color::deserialize(&coin),
                group: 0,
            });
        }
        new_coins.push(new_column);
    }

    let render_rows = debug_render_game(&new_coins);

    let win_status_label = if has_winner {
        format!("WINNER! Player {}", winner_id)
    } else {
        "PLAYING".to_owned()
    };

    let mut axis_label = String::new();
    for n in 1..=new_coins.len() {
        axis_label += format!("  {} ", n).as_str();
    }

    let breaker = (0..(axis_label.len() / 2))
        .map(|_| "--")
        .collect::<String>();

    let indentation = (0..indent).map(|_| ' ').collect::<String>();

    println!();
    println!("{}{}", indentation, win_status_label);
    println!("{}{}", indentation, breaker);
    println!("{}{}", indentation, axis_label);
    println!("{}{}", indentation, breaker);
    for row in render_rows {
        println!("{}{}", indentation, row);
    }

    println!();
}

fn render_snapshot(snapshot: &[u8]) {
    clear_screen();
    debug_print_snapshot(snapshot, 10);
    println!("Press 1,2,3 or 4 to drop your coin.");
}

pub async fn join_server() {
    let port = 4001;

    let config = ClientConfig::builder()
        .with_bind_default()
        .with_no_cert_validation()
        .build();

    println!("Connecting to server..");
    let connection = Endpoint::client(config)
        .unwrap()
        .connect(format!("https://localhost:{}", port))
        .await
        .unwrap();
    println!("Connected to server!");

    let (mut socket_tx, mut socket_rx) = connection.open_bi().await.unwrap().await.unwrap();

    let mut joined_buffer = vec![0; 1 + 8 + 1];
    socket_rx.read(&mut joined_buffer).await.unwrap().unwrap();
    let payload_type = joined_buffer.first().unwrap();
    if *payload_type != 0 {
        panic!("invalid joined payload type: {:?}", payload_type);
    }
    let player_id = joined_buffer.get(1..9).unwrap();
    let player_id = u64::from_be_bytes(player_id.try_into().unwrap());
    let color = joined_buffer.get(9).unwrap();
    let color = Color::deserialize(color);

    println!("Your player id is{:?}#{:?}", player_id, color);

    tokio::spawn(async move {
        loop {
            let size = u8::MAX as usize;
            let mut snapshot_buffer = vec![0; size];
            socket_rx.read(&mut snapshot_buffer).await.unwrap().unwrap();

            render_snapshot(snapshot_buffer.as_slice());
        }
    });

    loop {
        let input = get_user_column_input();

        socket_tx
            .write_all(&Command::PlayCoin(input).serialize())
            .await
            .unwrap();
    }
}
