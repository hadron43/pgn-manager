import * as ChessJS from "chess.js";
const Chess = typeof ChessJS === "function" ? ChessJS : ChessJS.Chess;
import { ShortMove } from "chess.js";
import * as pgnParser from "pgn-parser";
import type { ParsedPGN, Move, Rav, Header, Result } from "pgn-parser";

import { regeneratePGN } from "./utils";

export const FEN_START_POSITION =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const FEN_EMPTY_POSITION = "8/8/8/8/8/8/8/8";

class PGNManager {
  /** The raw PGN string input */
  private rawPGN: string;

  /** The parsed PGN game object */
  private game: ParsedPGN;

  /** Array of moves in traversal order */
  private sortedMoves: Array<Move>;

  /** Map of moves to their FEN position strings */
  private moveFen: Map<Move, string>;

  /** Map of moves to their parent variations (or null for mainline) */
  private moveParent: Map<Move, Rav | null>;

  /** Map of variations to their parent moves */
  private ravParent: Map<Rav, Move>;

  /** Map of moves to the color of the player who made the move */
  private moveColor: Map<Move, "w" | "b">;

  /**
   * Creates a new PGNManager instance
   * @param pgn - The PGN string to parse and manage
   */
  constructor(pgn: string) {
    this.rawPGN = pgn;
    this.game = pgnParser.parse(pgn + " *")[0];

    this.sortedMoves = [];
    this.moveParent = new Map();
    this.ravParent = new Map();
    this.moveFen = new Map();
    this.moveColor = new Map();

    this.dfOnGame(this.game);
  }

  /**
   * Initializes the game traversal starting from the initial position
   * @param game - The parsed PGN game object
   */
  private dfOnGame = (game: ParsedPGN) => {
    this.sortedMoves = [];

    var chessGame = new Chess(
      game.headers?.find((h) => h.name.toUpperCase() === "FEN")?.value ||
        FEN_START_POSITION
    );

    for (let move of game.moves) {
      this.dfsOnGame(move, game, chessGame);
    }
  };

  /**
   * Performs depth-first traversal of the game moves and variations
   * @param move - The current move being processed
   * @param parent - The parent RAV (variation) containing the move
   * @param chessGame - The chess instance for the current position
   */
  private dfsOnGame = (
    move: Move,
    parent: Rav,
    chessGame: ChessJS.ChessInstance
  ) => {
    this.sortedMoves.push(move);
    this.moveParent.set(move, parent);

    if (move.ravs) {
      for (let rav of move.ravs) {
        this.ravParent.set(rav, move);
        let newVarChessGame = new Chess(chessGame.fen());

        for (let ravMove of rav.moves) {
          this.dfsOnGame(ravMove, rav, newVarChessGame);
        }
      }
    }

    // move only after variations are processed
    if (
      !chessGame.move(move.move, { sloppy: false }) &&
      !chessGame.move(move.move, { sloppy: true })
    )
      console.log("Invalid move: " + move.move);
    this.moveFen.set(move, chessGame.fen());
    this.moveColor.set(move, chessGame.turn() === "w" ? "b" : "w");
  };

  /**
   * Gets the raw PGN string
   * @returns The original PGN string
   */
  public get pgn(): string {
    return this.rawPGN;
  }

  /**
   * Gets the parsed PGN object
   * @returns The parsed PGN game object
   */
  public get parsedPGN(): ParsedPGN {
    return this.game;
  }

  /**
   * Gets the game headers
   * @returns Array of game headers
   */
  public get headers(): Array<Header> {
    if (!this.game || !this.game.headers) return [];
    return this.game.headers;
  }

  /**
   * Gets a move by its number in the sequence
   * @param moveNumber - The 1-based index of the move
   * @returns The move object at the specified position
   */
  public getMove = (moveNumber: number) => {
    let move = this.sortedMoves[moveNumber - 1];
    return move;
  };

  /**
   * Gets the number of a move in the sequence
   * @param move - The move object
   * @returns The 1-based index of the move
   */
  public getMoveNumber = (move: Move) => {
    return this.sortedMoves.indexOf(move) + 1;
  };

  /**
   * Gets the next move in the sequence
   * @param moveOrId - The current move object or move number
   * @returns The next move in the sequence
   * @throws Error if there are no moves in the game
   */
  public nextMove = (moveOrId: Move | number | undefined): Move => {
    let move: Move | undefined;
    if (typeof moveOrId === "number") {
      move = this.getMove(moveOrId);
    } else {
      move = moveOrId;
    }

    if (!move) {
      if (this.sortedMoves.length == 0) {
        throw Error("No moves in game");
      }
      return this.sortedMoves[0];
    }

    if (
      move == this.game.moves[this.game.moves.length - 1] ||
      move === this.sortedMoves[this.sortedMoves.length - 1]
    ) {
      return move;
    }

    let parentRav = this.moveParent.get(move);
    let tempNextMove = this.getMove(this.getMoveNumber(move) + 1);

    if (parentRav) {
      let indexInParent = parentRav.moves.indexOf(move);
      if (indexInParent == parentRav.moves.length - 1) {
        let superParent = this.ravParent.get(parentRav);
        if (superParent) {
          tempNextMove = this.nextMove(superParent);
        }
      } else {
        tempNextMove = parentRav.moves[indexInParent + 1];
      }
    }

    return tempNextMove;
  };

  /**
   * Checks if there is a next move available
   * @param moveOrId - The current move object or move number
   * @returns True if there is a next move, false otherwise
   */
  public hasNextMove = (moveOrId: Move | number): boolean => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    return !move || this.nextMove(move) !== move;
  };

  /**
   * Gets the previous move in the sequence
   * @param moveOrId - The current move object or move number
   * @returns The previous move or undefined if at the start
   * @throws Error if there are no moves or if the move parameter is invalid
   */
  public previousMove = (moveOrId: Move | number): Move | undefined => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;

    if (!move) {
      if (this.sortedMoves.length == 0) {
        throw Error("No moves in game");
      }
      throw Error("Invalid 'move' parameter while getting previous move");
    }

    let currentMoveNumber = this.getMoveNumber(move);
    if (currentMoveNumber == 0) {
      return undefined;
    }

    let parentRav = this.moveParent.get(move);
    let tempPrevMove = this.getMove(currentMoveNumber - 1);
    if (parentRav) {
      let indexInParent = parentRav.moves.indexOf(move);
      if (indexInParent == 0) {
        let superParent = this.ravParent.get(parentRav);
        if (superParent) {
          tempPrevMove = superParent;
        }
      } else {
        tempPrevMove = parentRav.moves[indexInParent - 1];
      }
    }

    return tempPrevMove;
  };

  /**
   * Gets the first move in the game
   * @returns The first move
   * @throws Error if there are no moves in the game
   */
  public getFirstMove = () => {
    if (this.sortedMoves.length == 0) {
      throw Error("No moves in game");
    }
    return this.sortedMoves[0];
  };

  /**
   * Gets the last move in the game
   * @returns The last move
   * @throws Error if there are no moves in the game
   */
  public getLastMove = () => {
    if (this.sortedMoves.length == 0) {
      throw Error("No moves in game");
    }
    return this.game.moves[this.game.moves.length - 1];
  };

  /**
   * Gets the FEN string for a specific move
   * @param moveOrId - The move object or move number
   * @returns The FEN string representing the position after the move
   * @throws Error if the move parameter is invalid
   */
  public getMoveFen = (moveOrId: Move | number): string => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move || !this.moveFen.has(move)) {
      throw Error("Invalid 'move' parameter while getting fen");
    }
    let moveFen = this.moveFen.get(move);
    return moveFen ? moveFen : FEN_EMPTY_POSITION;
  };

  /**
   * Gets the parent RAV (variation) for a move
   * @param moveOrId - The move object or move number
   * @returns The parent RAV or null if the move is in the main line
   * @throws Error if the move parameter is invalid
   */
  public getParentRav = (moveOrId: Move | number): Rav | null => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move || !this.moveParent.has(move)) {
      throw Error("Invalid 'move' parameter while getting parent rav");
    }
    let parentRav = this.moveParent.get(move);
    return parentRav ? parentRav : null;
  };

  /**
   * Gets the color of the player who made the move
   * @param moveOrId - The move object or move ID number
   * @returns "w" for white or "b" for black
   * @throws Error if the move parameter is invalid
   */
  public getMoveColor = (moveOrId: Move | number): "w" | "b" => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move || !this.moveColor.has(move)) {
      throw Error("Invalid 'move' parameter while getting move color");
    }
    return this.moveColor.get(move);
  };

  /***
   * Pushes a new move into the game
   * @param moveId - The ID of the move to push
   * @param newMove - The move object to add
   * @param result - The result of the game after this move (default is "*")
   * @returns The newly created move object
   * @throws Error if the move parameter is invalid
   */
  public pushMove = (
    moveId: number,
    newMove: ShortMove,
    result: Result = "*"
  ): Move => {
    let chess: ChessJS.ChessInstance;
    let parentRav: Rav;
    let current: Move | null = null;

    // 1) Initialize ChessJS & parentRav
    if (moveId === 0) {
      parentRav = this.parsedPGN;
      const fenHdr = this.headers.find((h) => h.name.toLowerCase() === "fen");
      const startFen = fenHdr ? fenHdr.value : FEN_START_POSITION;
      chess = new Chess(startFen);
    } else {
      current = this.getMove(moveId);
      if (!current) throw new Error("Invalid moveId while pushing a new move!");
      parentRav = this.moveParent.get(current) || this.parsedPGN;
      chess = new Chess(this.getMoveFen(current));
    }

    // 2) Play the move (strict → sloppy)
    const played =
      chess.move(newMove, { sloppy: false }) ||
      chess.move(newMove, { sloppy: true });
    if (!played) throw new Error("Invalid move");

    const san = chess.history().slice(-1)[0];
    const nextColor = chess.turn() === "w" ? "b" : "w";

    // 3) Build the Move object
    const moveObj: Move = {
      move: san,
      ravs: undefined,
      move_number: current
        ? this.getMoveColor(current) === "w"
          ? current.move_number
          : current.move_number + 1
        : 1,
      comments: [],
    };

    // 4) Insert into your data structures
    if (!current) {
      // --- BRAND-NEW MAINLINE: variation of first move if exists ---
      const first = parentRav.moves[0];
      if (first) {
        // create a new RAV off the first move
        const newRav: Rav = { moves: [moveObj], result };
        if (!first.ravs) first.ravs = [];
        first.ravs.push(newRav);

        // bookkeeping
        this.moveParent.set(moveObj, newRav);
        this.ravParent.set(newRav, first);
      } else {
        // no first move yet → push into mainline
        parentRav.moves.push(moveObj);
        this.moveParent.set(moveObj, parentRav);
      }
    } else {
      // existing‐move branch (continuation or variation off next move)
      const parentVariation =
        parentRav.moves[parentRav.moves.length - 1] !== current;
      if (parentVariation) {
        // new variation off the next move
        const anchor = this.nextMove(current) || current;
        if (!anchor.ravs) anchor.ravs = [];
        const newRav: Rav = { moves: [moveObj], result };
        anchor.ravs.push(newRav);

        this.moveParent.set(moveObj, newRav);
        this.ravParent.set(newRav, anchor);
      } else {
        // simple continuation
        parentRav.moves.push(moveObj);
        this.moveParent.set(moveObj, parentRav);
      }
    }

    // 5) Update FEN, color, PGN, and callbacks
    this.moveFen.set(moveObj, chess.fen());
    this.moveColor.set(moveObj, nextColor);
    this.rawPGN = regeneratePGN(this.game, this.moveColor);
    this.dfOnGame(this.game);

    return moveObj;
  };

  /**
   * Delete a move and all subsequent moves in its variation from the game
   * @param moveId - The ID of the move to delete from
   * @throws Error if the move parameter is invalid
   */
  public deleteMove = (moveId: number): void => {
    const move = this.getMove(moveId);
    if (!move) {
      throw Error("Invalid move");
    }

    // delete the move and subsequent moves from the game
    const parentRav = this.getParentRav(move);
    const index = parentRav.moves.indexOf(move);
    const deletedMoves = parentRav.moves.splice(index);

    // collect all moves and variations that need cleanup
    const movsToClean = [];
    const ravsToClean = [];

    for (const deletedMove of deletedMoves) {
      movsToClean.push(deletedMove);
      if (deletedMove.ravs) {
        for (const rav of deletedMove.ravs) {
          ravsToClean.push(rav);
        }
      }
    }

    // Sort moves by their moveId in decreasing order
    movsToClean.sort((a, b) => this.getMoveNumber(b) - this.getMoveNumber(a));

    // clean up all maps at once
    movsToClean.forEach((move) => {
      this.moveParent.delete(move);
      this.moveFen.delete(move);
      this.moveColor.delete(move);
    });

    ravsToClean.forEach((rav) => {
      this.ravParent.delete(rav);
    });

    // update the PGN and rebuild internal state
    this.rawPGN = regeneratePGN(this.game, this.moveColor);
    this.dfOnGame(this.game);
  };
}

export default PGNManager;
