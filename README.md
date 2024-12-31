# PGN Manager 📦♟️

A powerful TypeScript/JavaScript library for managing chess PGN (Portable Game Notation) files with support for variations and game traversal.

[![NPM Package](https://img.shields.io/npm/v/pgn-manager.svg)](https://www.npmjs.com/package/pgn-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![npm downloads](https://img.shields.io/npm/dm/pgn-manager.svg)](https://www.npmjs.com/package/pgn-manager)


## Features ✨
- Parse PGN strings into manageable objects
- Navigate through main lines and variations
- Access FEN positions for any move
- Handle game headers
- Traverse moves forward and backward
- Full TypeScript support

## Installation 🚀

```console
npm install pgn-manager
```

## Usage 💻

```typescript
import PGNManager from 'pgn-manager';

// Initialize with a PGN string
const pgn = `1. e4 e5 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 *`;
const manager = new PGNManager(pgn);

// Get the first move
const firstMove = manager.getFirstMove();

// Navigate through moves
const nextMove = manager.nextMove(firstMove);
const prevMove = manager.previousMove(nextMove);

// Get FEN position for a move
const fen = manager.getMoveFen(firstMove);

// Access game headers
const headers = manager.headers;
```

## API Reference 📚

### Constructor
- `new PGNManager(pgn: string)`: Creates a new PGN manager instance

### Properties
- `pgn`: Get the raw PGN string
- `parsedPGN`: Get the parsed PGN object
- `headers`: Get game headers array

### Methods
- `getMove(moveNumber: number)`: Get move by number
- `getMoveNumber(moveOrMoveId: Move | number)`: Get number for a move
- `nextMove(moveOrMoveId: Move | number)`: Get next move in the sequence
- `previousMove(moveOrMoveId: Move | number)`: Get previous move
- `hasNextMove(moveOrMoveId: Move | number)`: Check if move has a next move
- `getFirstMove()`: Get the first move of the game
- `getLastMove()`: Get the last move of the game
- `getMoveFen(moveOrMoveId: Move | number)`: Get FEN position after move
- `getParentRav(moveOrMoveId: Move | number)`: Get parent variation for move
- `getMoveColor(moveOrMoveId: Move | number)`: Gets the color of the player who made the move ("w" for white or "b" for black)

## Examples 🎯

### Traversing Main Line

```typescript
const manager = new PGNManager("1. e4 e5 2. Nf3 Nc6 3. Bb5 *");
let move = manager.getFirstMove();

while (manager.hasNextMove(move)) {
  console.log(move.move);
  move = manager.nextMove(move);
}
```

### Working with Variations

```typescript
const manager = new PGNManager("1. e4 e5 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 *");
const move = manager.getMove(2); // Get second move
const variation = manager.getParentRav(move);

if (variation) {
  console.log("Move is part of a variation!");
}
```

## Contributing 🤝
Contributions are welcome! Feel free to submit issues and pull requests.

## License 📄
MIT License - feel free to use this in your projects!
