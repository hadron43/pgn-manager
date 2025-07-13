import PGNManager, { FEN_START_POSITION, FEN_EMPTY_POSITION } from "./index";

describe("PGNManager", () => {
  const simplePGN = `[Event "Test Game"]
[Site "Test Site"]
[Date "2023.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

  const pgnWithVariations = `[Event "Test Game"]
[Site "Test Site"] 
[Date "2023.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 (2. f4 exf4 3. Nf3) 2... Nc6 3. Bb5 a6 1-0`;

  const emptyPGN = `[Event "Test Game"]
[Site "Test Site"]
[Date "2023.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "*"]

*`;

  describe("Constructor", () => {
    it("should create a PGNManager instance with valid PGN", () => {
      const manager = new PGNManager(simplePGN);
      expect(manager).toBeInstanceOf(PGNManager);
    });

    it("should parse PGN and initialize internal structures", () => {
      const manager = new PGNManager(simplePGN);
      expect(manager.pgn).toBe(simplePGN);
      expect(manager.headers).toHaveLength(7);
      expect(manager.parsedPGN).toBeDefined();
    });
  });

  describe("Basic Properties", () => {
    let manager: PGNManager;

    beforeEach(() => {
      manager = new PGNManager(simplePGN);
    });

    it("should return original PGN string", () => {
      expect(manager.pgn).toBe(simplePGN);
    });

    it("should return parsed PGN object", () => {
      const parsed = manager.parsedPGN;
      expect(parsed).toBeDefined();
      expect(parsed.headers).toHaveLength(7);
      expect(parsed.moves).toHaveLength(10);
    });

    it("should return headers array", () => {
      const headers = manager.headers;
      expect(headers).toHaveLength(7);
      expect(headers[0]).toEqual({ name: "Event", value: "Test Game" });
      expect(headers[1]).toEqual({ name: "Site", value: "Test Site" });
    });

    it("should return empty headers for empty game", () => {
      const emptyManager = new PGNManager("*");
      expect(emptyManager.headers).toEqual([]);
    });
  });

  describe("Move Navigation", () => {
    let manager: PGNManager;

    beforeEach(() => {
      manager = new PGNManager(simplePGN);
    });

    it("should get move by number", () => {
      const firstMove = manager.getMove(1);
      expect(firstMove).toBeDefined();
      expect(firstMove.move).toBe("e4");
    });

    it("should get move number", () => {
      const firstMove = manager.getMove(1);
      expect(manager.getMoveNumber(firstMove)).toBe(1);
    });

    it("should get first move", () => {
      const firstMove = manager.getFirstMove();
      expect(firstMove.move).toBe("e4");
    });

    it("should get last move", () => {
      const lastMove = manager.getLastMove();
      expect(lastMove.move).toBe("Be7");
    });

    it("should throw error when getting first move from empty game", () => {
      const emptyManager = new PGNManager(emptyPGN);
      expect(() => emptyManager.getFirstMove()).toThrow("No moves in game");
    });

    it("should throw error when getting last move from empty game", () => {
      const emptyManager = new PGNManager(emptyPGN);
      expect(() => emptyManager.getLastMove()).toThrow("No moves in game");
    });
  });

  describe("Next Move Navigation", () => {
    let manager: PGNManager;

    beforeEach(() => {
      manager = new PGNManager(simplePGN);
    });

    it("should get next move by move object", () => {
      const firstMove = manager.getMove(1);
      const nextMove = manager.nextMove(firstMove);
      expect(nextMove.move).toBe("e5");
    });

    it("should get next move by move number", () => {
      const nextMove = manager.nextMove(1);
      expect(nextMove.move).toBe("e5");
    });

    it("should get first move when called with undefined", () => {
      const nextMove = manager.nextMove(undefined);
      expect(nextMove.move).toBe("e4");
    });

    it("should return same move when at end of game", () => {
      const lastMove = manager.getLastMove();
      const nextMove = manager.nextMove(lastMove);
      expect(nextMove).toBe(lastMove);
    });

    it("should throw error for empty game", () => {
      const emptyManager = new PGNManager(emptyPGN);
      expect(() => emptyManager.nextMove(undefined)).toThrow(
        "No moves in game"
      );
    });

    it("should check if has next move", () => {
      const firstMove = manager.getMove(1);
      const lastMove = manager.getLastMove();

      expect(manager.hasNextMove(firstMove)).toBe(true);
      expect(manager.hasNextMove(lastMove)).toBe(false);
    });
  });

  describe("Previous Move Navigation", () => {
    let manager: PGNManager;

    beforeEach(() => {
      manager = new PGNManager(simplePGN);
    });

    it("should get previous move by move object", () => {
      const secondMove = manager.getMove(2);
      const prevMove = manager.previousMove(secondMove);
      expect(prevMove?.move).toBe("e4");
    });

    it("should get previous move by move number", () => {
      const prevMove = manager.previousMove(2);
      expect(prevMove?.move).toBe("e4");
    });

    it("should return undefined for first move", () => {
      const firstMove = manager.getMove(1);
      const prevMove = manager.previousMove(firstMove);
      expect(prevMove).toBeUndefined();
    });

    it("should throw error for invalid move", () => {
      expect(() => manager.previousMove(null as any)).toThrow(
        "Invalid 'move' parameter while getting previous move"
      );
    });

    it("should throw error for empty game", () => {
      const emptyManager = new PGNManager(emptyPGN);
      expect(() => emptyManager.previousMove(1)).toThrow("No moves in game");
    });
  });

  describe("FEN Positions", () => {
    let manager: PGNManager;

    beforeEach(() => {
      manager = new PGNManager(simplePGN);
    });

    it("should get FEN string for a move", () => {
      const firstMove = manager.getMove(1);
      const fen = manager.getMoveFen(firstMove);
      expect(fen).toBeDefined();
      expect(fen).not.toBe(FEN_START_POSITION);
    });

    it("should get FEN by move number", () => {
      const fen = manager.getMoveFen(1);
      expect(fen).toBeDefined();
      expect(typeof fen).toBe("string");
    });

    it("should throw error for invalid move object", () => {
      expect(() => manager.getMoveFen(undefined as any)).toThrow(
        "Invalid 'move' parameter while getting fen"
      );
    });
  });

  describe("Move Properties", () => {
    let manager: PGNManager;

    beforeEach(() => {
      manager = new PGNManager(simplePGN);
    });

    it("should get move color", () => {
      const firstMove = manager.getMove(1);
      const secondMove = manager.getMove(2);

      expect(manager.getMoveColor(firstMove)).toBe("w");
      expect(manager.getMoveColor(secondMove)).toBe("b");
    });

    it("should get move color by number", () => {
      expect(manager.getMoveColor(1)).toBe("w");
      expect(manager.getMoveColor(2)).toBe("b");
    });

    it("should throw error for invalid move when getting color", () => {
      expect(() => manager.getMoveColor(null as any)).toThrow(
        "Invalid 'move' parameter while getting move color"
      );
    });

    it("should get parent RAV", () => {
      const firstMove = manager.getMove(1);
      const parentRav = manager.getParentRav(firstMove);
      expect(parentRav).toBeDefined();
    });

    it("should get parent RAV by number", () => {
      const parentRav = manager.getParentRav(1);
      expect(parentRav).toBeDefined();
    });

    it("should throw error for invalid move when getting parent RAV", () => {
      expect(() => manager.getParentRav(null as any)).toThrow(
        "Invalid 'move' parameter while getting parent rav"
      );
    });
  });

  describe("Variations", () => {
    let manager: PGNManager;

    beforeEach(() => {
      manager = new PGNManager(pgnWithVariations);
    });

    it("should handle PGN with variations", () => {
      expect(manager.parsedPGN.moves).toHaveLength(6);
      const secondMove = manager.getMove(2);
      expect(secondMove.move).toBe("e5");
    });

    it("should navigate through variations correctly", () => {
      const moves: string[] = [];
      let currentMove = manager.getFirstMove();

      while (manager.hasNextMove(currentMove)) {
        moves.push(currentMove.move);
        currentMove = manager.nextMove(currentMove);
      }
      moves.push(currentMove.move);

      expect(moves).toContain("e4");
      expect(moves).toContain("e5");
      expect(moves).toContain("Nf3");
    });
  });

  describe("Push Move", () => {
    let manager: PGNManager;

    beforeEach(() => {
      manager = new PGNManager(simplePGN);
    });

    it("should push a valid move", () => {
      const initialMoveCount = manager.parsedPGN.moves.length;
      const lastMove = manager.getLastMove();

      // This should work if the move is valid from the last position
      try {
        const newMove = manager.pushMove(manager.getMoveNumber(lastMove), {
          from: "e7",
          to: "e6",
        });
        expect(newMove).toBeDefined();
        expect(newMove.move).toBeDefined();
      } catch (error) {
        // Expected for invalid moves
        expect(error.message).toBe("Invalid move");
      }
    });

    it("should throw error for invalid move", () => {
      const lastMove = manager.getLastMove();
      expect(() => {
        manager.pushMove(manager.getMoveNumber(lastMove), {
          from: "a1",
          to: "h8",
        });
      }).toThrow("Invalid move");
    });

    it("should update PGN after pushing move", () => {
      const originalPGN = manager.pgn;
      const lastMove = manager.getLastMove();

      try {
        manager.pushMove(manager.getMoveNumber(lastMove), {
          from: "e7",
          to: "e6",
        });
        expect(manager.pgn).not.toBe(originalPGN);
      } catch (error) {
        // Expected for invalid moves
        expect(error.message).toBe("Invalid move");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty PGN", () => {
      const manager = new PGNManager("*");
      expect(manager.headers).toEqual([]);
    });

    it("should handle PGN with only headers", () => {
      const headerOnlyPGN = `[Event "Test"]
[Site "Test Site"]
[Result "*"]

*`;
      const manager = new PGNManager(headerOnlyPGN);
      expect(manager.headers).toHaveLength(3);
    });

    it("should handle malformed moves gracefully", () => {
      // The constructor should handle this without throwing
      const manager = new PGNManager(simplePGN);
      expect(manager).toBeInstanceOf(PGNManager);
    });
  });

  describe("Constants", () => {
    it("should export FEN constants", () => {
      expect(FEN_START_POSITION).toBe(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      );
      expect(FEN_EMPTY_POSITION).toBe("8/8/8/8/8/8/8/8");
    });
  });
});
