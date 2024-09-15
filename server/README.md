# connect4000 WebTransport Server

http3 game server supporting QUIC and WebTransport to stream game operations and state

- [Server Design](#server-design)
- [Flows](#flows)
  - [Join game](#join-game)
  - [Play coin](#play-coin)
- [Communication protocol](#communication-protocol)
  - [Payload types](#payload-types)
  - [Commands](#commands)
    - [Play coin](#play-coin)
  - [Views](#views)
    - [Snapshot](#snapshot)
    - [Joined](#joined)

## Server Design

The server is built in rust, using the `wtransport` crate to handle the WebTransport http3 specifics.

The server is stateful, keeping track of a single game's state in memory and the connected clients player states.

The server is multi-threaded on top of tokio, handling multiple clients concurrently.

Each client can open 1 bidirectional stream channel with the server.
The client and server then exchange streamed binary data that follows the connect4000 [binary communication protocol](#communication-protocol).

The client creates and sends "commands" to the server, which the server will use to mutate game state.
The server can also send "views" to the client, which are binary stream representations of game state.

## Flows

### Join game

1. Client connects to server
1. Server a handshake view
1. Server sends a `Joined` view
   a. Includes player id and color
1. Server sends a `Snapshot` view
   a. A continuous stream of the full game snapshot state

### Play coin

1. Client sends a `PlayCoin` command to server
1. Server a handshake view
1. Server sends a `Joined` view
1. Server sends a `Snapshot` view

## Communication protocol

### Payload types

```yaml
Joined: 0
Snapshot: 1
PlayCoin: 2
```

### Commands

#### Play coin

```yaml
Header: # 1 byte:
  type: 2 # 1 byte
Body: 0 # 8 bytes - The u64 column index to play the coin into
```

### Views

#### Snapshot

```yaml
Header: # 25 bytes
  type: 1 # 1 byte
  winner_id: 0 # 8 bytes
  columns: 2 # 8 bytes
  rows: 2 # 8 bytes
Body: # (column_count * row_count) bytes
```

> Note: The body of the Snapshot view is a binary representation of the game.
>
> This is a dense grid as a 2D array of bytes, where each byte represents an empty space, or a coin.
>
> Starting with byte 0, we have the 1st space in the first column. All bytes up to byte `row_count` are spaces in the first column.
> If we needed to read all of the coins in the 3rd column, we would start at byte `row_count _ 2` and read `row_count` bytes from there.
>
> Any non-zero byte represents a coin instead of an empty space.

#### Joined

```yaml
Header: # 1 byte
  type: 0 # 1 byte
Body: # 9 bytes
  player_id: 0 # 8 bytes
  color: 0 # 1 byte
```
