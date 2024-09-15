use connect4000_core::{debug_print_game, Coins, Color, Game, Groups, Player};
use std::collections::HashMap;

use crate::{join::get_user_column_input, utils::clear_screen};

fn render_game(game: &Game, coins: &Coins, color: &Color) {
    clear_screen();
    debug_print_game(game, coins, 10);
    println!("Press 1,2,3 or 4 to drop your coin.");
    println!("Your coin color: {:?}", color);
}

pub fn run_local() {
    let mut game = Game::default();

    let player_a = Player::orange(1);
    let player_b = Player::blue(2);

    let mut coins = game.set_columns(4).unwrap();
    let mut groups: Groups = HashMap::new();

    while game.winner_id.is_none() {
        render_game(&game, &coins, &player_a.color);

        let input = get_user_column_input();

        if input > coins.len() as u64 {
            continue;
        }

        game.play_coin(
            player_a.id,
            input,
            &mut player_a.coin(groups.len() as u64),
            &mut groups,
            &mut coins,
        )
        .unwrap();

        render_game(&game, &coins, &player_b.color);

        if game.winner_id.is_none() {
            game.play_coin(
                player_b.id,
                1,
                &mut player_b.coin(groups.len() as u64),
                &mut groups,
                &mut coins,
            )
            .unwrap();
        }
    }
}
