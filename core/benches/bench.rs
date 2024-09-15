#![feature(test)]
extern crate test;
use std::collections::HashMap;

use connect4000_core::{Coins, Game, Groups, Player};
use test::Bencher;

struct BenchPayload {
    counter: usize,
    game: Game,
    player: Player,
    coins: Coins,
    groups: Groups,
}

fn setup(column_count: usize) -> BenchPayload {
    let counter = 0;

    let mut game = Game::default();
    let player = Player::red();

    let coins: Coins = game.set_columns(column_count).unwrap();
    let groups: Groups = HashMap::new();

    BenchPayload {
        counter,
        game,
        player,
        coins,
        groups,
    }
}

fn run(column_count: usize, payload: &mut BenchPayload) {
    let mut coin = payload.player.coin(payload.groups.len());
    let column_index = payload.counter % column_count;
    let _ = payload.game.play_coin(
        column_index,
        &mut coin,
        &mut payload.groups,
        &mut payload.coins,
    );
}

#[bench]
fn bench_horizontal_4_columns(b: &mut Bencher) {
    let column_count = 4;
    let mut payload = setup(column_count);

    b.iter(|| {
        run(column_count, &mut payload);
    });
}

#[bench]
fn bench_vertical_4_columns(b: &mut Bencher) {
    let column_count = 4;
    let mut payload = setup(column_count);

    b.iter(|| {
        run(1, &mut payload);
    });
}

#[bench]
fn bench_horizontal_1_million_columns(b: &mut Bencher) {
    let column_count = 1_000_000;
    let mut payload = setup(column_count);

    b.iter(|| {
        run(column_count, &mut payload);
    });
}

#[bench]
fn bench_vertical_1_million_columns(b: &mut Bencher) {
    let column_count = 1_000_000;
    let mut payload = setup(column_count);

    b.iter(|| {
        run(1, &mut payload);
    });
}

#[bench]
fn bench_horizontal_10_million_columns(b: &mut Bencher) {
    let column_count = 10_000_000;
    let mut payload = setup(column_count);

    b.iter(|| {
        run(column_count, &mut payload);
    });
}

#[bench]
fn bench_vertical_10_million_columns(b: &mut Bencher) {
    let column_count = 10_000_000;
    let mut payload = setup(column_count);

    b.iter(|| {
        run(1, &mut payload);
    });
}

#[bench]
fn bench_horizontal_1_billion_columns(b: &mut Bencher) {
    let column_count = 1_000_000_000;
    let mut payload = setup(column_count);

    b.iter(|| {
        run(column_count, &mut payload);
    });
}

#[bench]
fn bench_vertical_1_billion_columns(b: &mut Bencher) {
    let column_count = 1_000_000_000;
    let mut payload = setup(column_count);

    b.iter(|| {
        run(1, &mut payload);
    });
}
