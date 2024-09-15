use std::collections::HashMap;

use crate::{debug_print_game, debug_render_game, Game, Player};

#[test]
fn test_check_wins_horizontal() {
    let mut game = Game::default();
    let player = Player::red(1);

    let column_count = 8;
    let mut coins = game.set_columns(column_count).unwrap();

    let mut groups = HashMap::new();

    for column_index in 0..column_count {
        let mut coin = player.coin(groups.len() as u64);
        let winner_id = game
            .play_coin(player.id, column_index, &mut coin, &mut groups, &mut coins)
            .unwrap();

        let has_winner = winner_id.is_some();

        if column_index == column_count - 1 {
            assert!(has_winner);
        } else {
            assert!(!has_winner);
        };
    }

    debug_print_game(&game, &coins, 0);
}

#[test]
fn test_check_wins_vertical() {
    let mut game = Game::default();
    let player = Player::red(1);

    let column_count = 8;
    let mut coins = game.set_columns(column_count).unwrap();

    let mut groups = HashMap::new();

    for column_index in 0..column_count {
        let mut coin = player.coin(groups.len() as u64);
        let winner_id = game
            .play_coin(1, 0, &mut coin, &mut groups, &mut coins)
            .unwrap();

        let has_winner = winner_id.is_some();

        if column_index == column_count - 1 {
            assert!(has_winner);
        } else {
            assert!(!has_winner);
        };
    }

    debug_print_game(&game, &coins, 0);
}

#[test]
fn test_check_wins_diagonal() {
    let mut game = Game::default();
    let player = Player::red(1);
    let orange_player = Player::orange(2);
    let purple_player = Player::purple(3);

    let column_count = 8;
    let mut coins = game.set_columns(column_count).unwrap();

    let mut groups = HashMap::new();

    for column_index in 0..(column_count - 1) {
        let mut coin = player.coin(groups.len() as u64);
        let fill_count = column_index;
        for _i in 0..fill_count {
            let mut other_player = orange_player.clone();
            if column_index % 2 == 0 {
                other_player = purple_player.clone();
            }
            let mut other_coin = other_player.coin(groups.len() as u64);
            let winner_id = game
                .play_coin(
                    other_player.id,
                    column_index,
                    &mut other_coin,
                    &mut groups,
                    &mut coins,
                )
                .unwrap();

            let has_winner = winner_id.is_some();

            debug_render_game(&coins);
            assert!(!has_winner);
        }

        let winner_id = game
            .play_coin(player.id, column_index, &mut coin, &mut groups, &mut coins)
            .unwrap();
        let has_winner = winner_id.is_some();
        debug_print_game(&game, &coins, 0);

        if column_index == column_count - 1 {
            assert!(has_winner);
        } else {
            assert!(!has_winner);
        };
    }
}
