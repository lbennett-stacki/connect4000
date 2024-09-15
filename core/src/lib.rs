#![feature(map_many_mut)]

use std::{
    collections::{HashMap, HashSet},
    fmt::{self, Display},
};

pub fn find_connected_groups(
    column_index: &u64,
    coin_index: &u64,
    color: &Color,
    coins: &mut Coins,
) -> Result<HashSet<u64>, GameError> {
    let mut connected = HashSet::new();

    let directions = [
        ("left", -1, 0),
        ("right", 1, 0),
        ("up", 0, 1),
        ("down", 0, -1),
        ("up-left", -1, 1),
        ("up-right", 1, 1),
        ("down-left", -1, -1),
        ("down-right", 1, -1),
    ];

    let coin_index = *coin_index;

    for direction in directions {
        let col_index = *column_index as i32 + direction.1;
        let coin_index = coin_index as i32 + direction.2;

        if col_index < 0 || coin_index < 0 {
            continue;
        }

        let col_index = col_index as u64;
        let coin_index = coin_index as u64;

        let max_col = coins.len() as u64;

        if col_index > max_col {
            continue;
        }

        let col = &coins.get(col_index as usize);
        if col.is_none() {
            continue;
        }
        let col = col.unwrap();

        let coin = col.get(coin_index as usize);

        if coin.is_none() {
            continue;
        }
        let coin = coin.unwrap();

        if coin.color == *color {
            connected.insert(coin.group);
        }
    }

    Ok(connected)
}

#[derive(Debug, Clone, Eq, PartialEq, Hash)]
pub enum Color {
    Orange,
    Blue,
    Red,
    Yellow,
    Purple,
}

impl Color {
    pub fn serialize(&self) -> u8 {
        match self {
            Color::Orange => 1,
            Color::Blue => 2,
            Color::Red => 3,
            Color::Yellow => 4,
            Color::Purple => 5,
        }
    }

    pub fn deserialize(input: &u8) -> Self {
        match input {
            1 => Color::Orange,
            2 => Color::Blue,
            3 => Color::Red,
            4 => Color::Yellow,
            5 => Color::Purple,
            _ => panic!("invalid color {}", input),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Player {
    pub color: Color,
    pub id: u64,
}

impl Player {
    pub fn coin(&self, group: u64) -> Coin {
        Coin::from_player(self, group)
    }

    pub fn from_color(id: u64, color: Color) -> Self {
        Player { id, color }
    }

    pub fn orange(id: u64) -> Self {
        Player::from_color(id, Color::Orange)
    }

    pub fn blue(id: u64) -> Self {
        Player::from_color(id, Color::Blue)
    }

    pub fn purple(id: u64) -> Self {
        Player::from_color(id, Color::Purple)
    }

    pub fn red(id: u64) -> Self {
        Player::from_color(id, Color::Red)
    }

    pub fn yellow(id: u64) -> Self {
        Player::from_color(id, Color::Yellow)
    }
}

#[derive(Debug, Eq, Clone, PartialEq, Hash)]
pub struct Coin {
    pub color: Color,
    pub group: u64,
}

impl Coin {
    fn from_player(player: &Player, group: u64) -> Self {
        Coin {
            color: player.color.clone(),
            group,
        }
    }
}

impl Display for Coin {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let str = match self.color {
            Color::Red => String::from("🔴"),
            Color::Yellow => String::from("🟡"),
            Color::Orange => String::from("🟠"),
            Color::Purple => String::from("🟣"),
            Color::Blue => String::from("🔵"),
        };

        write!(f, "{}", str)
    }
}

type CoinColumn = Vec<Coin>;
pub type Coins = Vec<CoinColumn>;

#[derive(Default, Debug)]
pub struct Game {
    pub winner_id: Option<u64>,
}

#[derive(Debug)]
pub enum GameError {
    ImSoLazy,
    NoCoinAhead,
    GroupNotFound,
    CannotFindMergeTarget,
    CannotFindAddTarget,
    ColumnOutOfBounds,
    ColumnNotFound,
    CoinNotFound,
    ColumnsAlreadySet,
    CantPlayCoinInEndedGame,
}

type ColumnSet<'a> = HashSet<&'a CoinColumn>;

fn coins_to_column_set(coins: &Coins) -> ColumnSet {
    let mut set = HashSet::new();

    for column in coins {
        set.insert(column);
    }

    set
}

type Position = (u64, u64);

pub type Groups = HashMap<u64, Vec<Position>>;

struct GroupStore {}

impl GroupStore {
    pub fn add(groups: &mut Groups, key: &u64, position: &Position) -> Result<u64, GameError> {
        let group = groups.get_mut(key);

        if group.is_none() {
            groups.insert(*key, Vec::new());
        }

        let group = groups.get_mut(key).unwrap();

        group.push(*position);

        Ok(group.len() as u64)
    }

    pub fn merge(groups: &mut Groups, from: &u64, to: &u64) -> Result<(), GameError> {
        let [from_a, to_a] = groups
            .get_many_mut([from, to])
            .ok_or(GameError::CannotFindMergeTarget)?;

        for item in from_a {
            to_a.push(*item);
        }

        Ok(())
    }
}

pub fn debug_render_game(coins: &Coins) -> Vec<String> {
    let mut coin_index = 0;
    let mut pending_columns = coins_to_column_set(coins);
    let mut render_rows = Vec::new();

    while !pending_columns.is_empty() {
        let mut row = String::new();

        for column in coins {
            let mut char = String::from("⚪️");
            if let Some(coin) = column.get(coin_index) {
                char = coin.to_string();
            } else {
                pending_columns.remove(&column);
            }
            row += format!(" {} ", char).as_str();
        }

        if !pending_columns.is_empty() {
            render_rows.push(row);
        }
        coin_index += 1;
    }

    render_rows
}

pub fn debug_print_game(game: &Game, coins: &Coins, indent: u64) {
    let render_rows = debug_render_game(coins);
    let win_status_label = if game.winner_id.is_some() {
        format!("WINNER! Player {}", game.winner_id.unwrap())
    } else {
        "PLAYING".to_owned()
    };

    let mut axis_label = String::new();
    for n in 1..=coins.len() {
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

impl Game {
    pub fn play_coin(
        &mut self,
        player_id: u64,
        column_index: u64,
        coin: &mut Coin,
        groups: &mut Groups,
        coins: &mut Coins,
    ) -> Result<Option<u64>, GameError> {
        if self.winner_id.is_some() {
            return Err(GameError::CantPlayCoinInEndedGame);
        }

        coin.group = groups.len() as u64;

        let col = coins
            .get_mut(column_index as usize)
            .ok_or(GameError::ImSoLazy)?;
        let coin_index = col.len() as u64;
        col.push(Coin {
            color: coin.color.clone(),
            group: 0,
        });

        let connected_groups =
            find_connected_groups(&column_index, &coin_index, &coin.color, coins)?;

        let mut connected_groups: Vec<u64> = connected_groups.iter().copied().collect();
        connected_groups.sort();

        let mut lowest = connected_groups.first();

        let mut has_rest = false;
        if lowest.is_none() {
            lowest = Some(&coin.group);
        } else if *lowest.unwrap() > 1 {
            has_rest = true;
        }
        let lowest = lowest.unwrap();

        if has_rest {
            let rest = &connected_groups[1..];

            for group in rest {
                GroupStore::merge(groups, group, lowest)?;
            }
        }

        let mut replacement_coin = coin.clone();
        replacement_coin.group = *lowest;

        let column = coins
            .get_mut(column_index as usize)
            .ok_or(GameError::ColumnOutOfBounds)?;

        column.splice(
            (coin_index as usize)..=(coin_index as usize),
            [replacement_coin],
        );

        let group_len = GroupStore::add(groups, lowest, &(column_index, coin_index))?;

        if group_len >= coins.len() as u64 {
            self.winner_id = Some(player_id);
        }

        Ok(self.winner_id)
    }

    pub fn set_columns(&mut self, column_count: u64) -> Result<Coins, GameError> {
        let mut coins = Vec::new();

        for _ in 0..column_count {
            coins.push(Vec::new());
        }

        Ok(coins)
    }
}

#[cfg(test)]
mod test;
