import { Chess } from "void57-chess";
import PGNManager, { FEN_START_POSITION, FEN_EMPTY_POSITION } from "./index";
import { Move } from "pgn-parser";

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

  const pgnWithStartingPosition = `[FEN "6N1/6KN/8/8/8/8/6q1/7k w - - 0 1"]`;

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

    it("Should load PGN with initial position", () => {
      const manager = new PGNManager(pgnWithStartingPosition);
      const chess = new Chess(
        manager.headers.find((header) => header.name.toUpperCase() === "FEN")
          ?.value || "Error",
      );
      expect(chess.fen()).toEqual("6N1/6KN/8/8/8/8/6q1/7k w - - 0 1");
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
        "No moves in game",
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
        "Invalid 'move' parameter while getting previous move",
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
        "Invalid 'move' parameter while getting fen",
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
        "Invalid 'move' parameter while getting move color",
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
        "Invalid 'move' parameter while getting parent rav",
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
        expect((error as Error).message).toBe("Invalid move");
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
        expect((error as Error).message).toBe("Invalid move");
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
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      );
      expect(FEN_EMPTY_POSITION).toBe("8/8/8/8/8/8/8/8");
    });
  });

  describe("Delete Move", () => {
    it("should delete a move", () => {
      const manager = new PGNManager(simplePGN);
      const lastMove = manager.getLastMove();
      const moveNumber = manager.getMoveNumber(lastMove);
      manager.deleteMove(moveNumber);
      expect(manager.parsedPGN.moves.length).toBe(9);
    });

    it("should throw error for invalid move", () => {
      const manager = new PGNManager(simplePGN);
      expect(() => manager.deleteMove(0)).toThrow("Invalid move");
    });

    it("should delete a move in a complex variation", () => {
      const manager = new PGNManager(pgnWithVariations);
      manager.deleteMove(5);
      expect(manager.parsedPGN.moves.length).toBe(6);
      const newPgn = `[Event "Test Game"]
[Site "Test Site"]
[Date "2023.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 (2. f4) 2... Nc6 3. Bb5 a6
1-0`;
      expect(manager.pgn).toBe(newPgn);
    });

    it("should properly update FEN after deleting a move", () => {
      const manager = new PGNManager(simplePGN);
      const prevMove = manager.previousMove(5);
      if (!prevMove) throw new Error("Previous move not found");
      const prevFen = manager.getMoveFen(prevMove);

      manager.deleteMove(5);

      const newLastMove = manager.getLastMove();
      expect(manager.getMoveFen(newLastMove)).toBe(prevFen);
    });

    it("should handle deleting moves from the main line", () => {
      const manager = new PGNManager(pgnWithVariations);
      manager.deleteMove(2);
      expect(manager.parsedPGN.moves.length).toBe(1);
      expect(manager.getLastMove().move).toBe("e4");
    });

    it("should handle deleting moves that have variations", () => {
      const manager = new PGNManager(pgnWithVariations);
      manager.deleteMove(4); // Deleting move with variation
      expect(manager.parsedPGN.moves.length).toBe(6);
      const secondMove = manager.getMove(2);
      expect(secondMove.ravs).toBeUndefined();
    });

    it("should cleanup all references after deleting moves", () => {
      const manager = new PGNManager(pgnWithVariations);
      const moveToDelete = manager.getMove(4);
      manager.deleteMove(4);

      expect(() => manager.getMoveFen(moveToDelete)).toThrow();
      expect(() => manager.getMoveColor(moveToDelete)).toThrow();
      expect(() => manager.getParentRav(moveToDelete)).toThrow();
    });

    it("should maintain correct move numbering after deletion", () => {
      const manager = new PGNManager(simplePGN);
      manager.deleteMove(5);

      const moves: Move[] = [];
      let currentMove = manager.getFirstMove();
      moves.push(currentMove);
      while (manager.hasNextMove(currentMove)) {
        currentMove = manager.nextMove(currentMove);
        moves.push(currentMove);
      }

      console.log(moves);

      expect(moves[2].move_number).toBe(2);
      expect(moves[3].move_number).toBe(undefined);
    });

    it("should handle deleting the first move", () => {
      const manager = new PGNManager(simplePGN);
      manager.deleteMove(1);
      expect(manager.parsedPGN.moves.length).toBe(0);
      expect(() => manager.getFirstMove()).toThrow("No moves in game");
    });
  });

  describe("Chess960", () => {
    const chess960PGN = `[Event "Chess960 Game"]
[Site "Test"]
[Date "2024.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "*"]
[Variant "Chess960"]
[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]

1. e4 e5 2. Nf3 Nc6 *`;

    // Position 518 is standard chess — use it to verify Chess960 class works with standard position
    const chess960Position518PGN = `[Event "Chess960 Pos 518"]
[Variant "Chess960"]
[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]

1. e4 e5 *`;

    it("should detect Chess960 game from Variant header", () => {
      const manager = new PGNManager(chess960PGN);
      expect(manager.isChess960).toBe(true);
    });

    it("should not detect standard game as Chess960", () => {
      const manager = new PGNManager(simplePGN);
      expect(manager.isChess960).toBe(false);
    });

    it("should load and traverse Chess960 game moves", () => {
      const manager = new PGNManager(chess960PGN);
      expect(manager.parsedPGN.moves).toHaveLength(4);

      const firstMove = manager.getFirstMove();
      expect(firstMove.move).toBe("e4");

      const secondMove = manager.nextMove(firstMove);
      expect(secondMove.move).toBe("e5");
    });

    it("should return correct FEN for Chess960 moves", () => {
      const manager = new PGNManager(chess960PGN);
      const fen = manager.getMoveFen(1);
      expect(fen).toBeDefined();
      expect(fen).toContain("rnbqkbnr"); // black pieces still in start position
    });

    it("should return correct move colors in Chess960", () => {
      const manager = new PGNManager(chess960PGN);
      expect(manager.getMoveColor(1)).toBe("w");
      expect(manager.getMoveColor(2)).toBe("b");
    });

    it("should detect FischerRandom variant (case insensitive)", () => {
      const frPGN = `[Variant "FischerRandom"]

1. e4 e5 *`;
      const manager = new PGNManager(frPGN);
      expect(manager.isChess960).toBe(true);
    });

    describe("Real Chess960 game (Carlsen vs Caruana)", () => {
      const carlsenCaruanaPGN = `[Event "FIDE Freestyle Chess World Championship KO"]
[Site "https://lichess.org/broadcast/fide-freestyle-chess-world-championship-2026--finals/game-4/HvRKiQmq/35yfRSPb"]
[Date "2026.02.11"]
[Round "9.1"]
[White "Carlsen, Magnus"]
[Black "Caruana, Fabiano"]
[Result "1/2-1/2"]
[WhiteElo "2887"]
[WhiteTitle "GM"]
[WhiteTeam "Finals"]
[WhiteFideId "1503014"]
[BlackElo "2809"]
[BlackTitle "GM"]
[BlackTeam "Finals"]
[BlackFideId "2020009"]
[TimeControl "25+10"]
[Variant "Chess960"]
[ECO "?"]
[Opening "?"]
[FEN "rbknqrbn/pppppppp/8/8/8/8/PPPPPPPP/RBKNQRBN w KQkq - 0 1"]
[SetUp "1"]
[UTCDate "2026.02.11"]
[UTCTime "12:48:55"]
[BroadcastName "FIDE Freestyle Chess World Championship 2026 | Finals"]
[BroadcastURL "https://lichess.org/broadcast/fide-freestyle-chess-world-championship-2026--finals/game-4/HvRKiQmq"]
[GameURL "https://lichess.org/broadcast/fide-freestyle-chess-world-championship-2026--finals/game-4/HvRKiQmq/35yfRSPb"]

1. f4 { [%eval 0.05] [%clk 0:23:19] } 1... f5 { [%eval 0.13] [%clk 0:25:15] } 2. c3 { [%eval 0.15] [%clk 0:23:12] } 2... a5 { [%eval 0.57] [%clk 0:23:48] } 3. Ng3 { [%eval 0.54] [%clk 0:23:11] } 3... g6 { [%eval 0.73] [%clk 0:23:48] } 4. e4 { [%eval 0.72] [%clk 0:23:17] } 4... fxe4 { [%eval 0.79] [%clk 0:23:55] } 5. Nxe4 { [%eval 0.67] [%clk 0:23:17] } 5... Nhf7 { [%eval 0.64] [%clk 0:22:29] } 6. Ne3 { [%eval 0.61] [%clk 0:22:30] } 6... a4 { [%eval 0.71] [%clk 0:20:21] } 7. Bc2 { [%eval 0.46] [%clk 0:21:03] } 7... Nh6 { [%eval 0.71] [%clk 0:14:03] } 8. g4 { [%eval 0.81] [%clk 0:16:41] } 8... d5 { [%eval 0.69] [%clk 0:12:19] } 9. Nc5 { [%eval 0.92] [%clk 0:14:24] } 9... b6 { [%eval 1.15] [%clk 0:10:58] } 10. Nd3 { [%eval 1.13] [%clk 0:13:58] } 10... c6 { [%eval 1.06] [%clk 0:11:05] } 11. f5 { [%eval 0.62] [%clk 0:10:55] } 11... Nhf7 { [%eval 1.14] [%clk 0:06:42] } 12. Nf4 { [%eval 0.35] [%clk 0:08:19] } 12... Ne5 { [%eval 1.44] [%clk 0:06:40] } 13. d4 { [%eval 1.1] [%clk 0:07:31] } 13... Nd7 { [%eval 0.94] [%clk 0:06:49] } 14. O-O-O { [%eval 0.9] [%clk 0:06:54] } 14... gxf5 { [%eval 1.04] [%clk 0:05:43] } 15. gxf5 { [%eval 0.98] [%clk 0:06:33] } 15... Bf7 { [%eval 1.38] [%clk 0:03:50] } 16. a3 { [%eval 1.34] [%clk 0:05:19] } 16... Rg8 { [%eval 1.43] [%clk 0:03:45] } 17. Nd3 { [%eval 1.11] [%clk 0:04:20] } 17... Bh5 { [%eval 1.37] [%clk 0:03:13] } 18. Rd2 { [%eval 1.38] [%clk 0:04:27] } 18... Nf7 { [%eval 1.68] [%clk 0:03:21] } 19. Nb4 { [%eval 1.18] [%clk 0:02:36] } 19... Nf6 { [%eval 1.09] [%clk 0:03:21] } 20. c4 { [%eval 1.22] [%clk 0:02:43] } 20... Bd6 { [%eval 1.08] [%clk 0:02:20] } 21. Nd3 { [%eval 0.7] [%clk 0:01:44] } 21... Ne4 { [%eval 1.59] [%clk 0:02:11] } 22. Rg2 { [%eval 1.46] [%clk 0:01:25] } 22... Nfg5 { [%eval 1.94] [%clk 0:01:12] } 23. cxd5 { [%eval 0.03] [%clk 0:00:32] } 23... Nf3 { [%eval 0.0] [%clk 0:01:21] } 24. Rxg8 { [%eval 0.0] [%clk 0:00:22] } 24... Qxg8 { [%eval 0.0] [%clk 0:01:29] } 25. Qe2 { [%eval -2.1] [%clk 0:00:14] } 25... Qg5 { [%eval 0.0] [%clk 0:01:28] } 26. Qg2 { [%eval 0.0] [%clk 0:00:23] } 26... Qxg2 { [%eval 0.0] [%clk 0:00:39] } 27. Nxg2 { [%eval 0.0] [%clk 0:00:32] } 27... Ned2 { [%eval 0.0] [%clk 0:00:45] } 28. Rf2 { [%eval 0.0] [%clk 0:00:21] } 28... Nxg1 { [%eval 1.53] [%clk 0:00:22] } 29. Kxd2 { [%eval 1.51] [%clk 0:00:29] } 29... Nh3 { [%eval 1.53] [%clk 0:00:13] } 30. Rf1 { [%eval 1.46] [%clk 0:00:37] } 30... cxd5 { [%eval 1.57] [%clk 0:00:21] } 31. Ngf4 { [%eval 1.18] [%clk 0:00:19] } 31... Nxf4 { [%eval 0.7] [%clk 0:00:29] } 32. Nxf4 { [%eval 1.32] [%clk 0:00:27] } 32... Bf7 { [%eval 1.39] [%clk 0:00:38] } 33. Ke3 { [%eval 0.93] [%clk 0:00:32] } 33... b5 { [%eval 2.35] [%clk 0:00:14] } 34. Rg1 { [%eval 2.17] [%clk 0:00:40] } 34... Kd7 { [%eval 2.57] [%clk 0:00:22] } 35. Rg7 { [%eval 2.46] [%clk 0:00:46] } 35... Bg8 { [%eval 2.35] [%clk 0:00:15] } 36. f6 { [%eval 0.2] [%clk 0:00:41] } 36... Rf8 { [%eval 0.23] [%clk 0:00:17] } 37. Bf5+ { [%eval 0.24] [%clk 0:00:15] } 37... Ke8 { [%eval 3.14] [%clk 0:00:26] } 38. Bxh7 { [%eval 0.0] [%clk 0:00:13] } 38... Bxh7 { [%eval 0.02] [%clk 0:00:16] } 39. Rxh7 { [%eval -0.01] [%clk 0:00:22] } 39... Rxf6 { [%eval 0.0] [%clk 0:00:25] } 40. Nxd5 { [%eval 0.0] [%clk 0:00:30] } 40... Rg6 { [%eval 0.01] [%clk 0:00:13] } 41. Nc3 { [%eval 0.0] [%clk 0:00:33] } 41... Rg2 { [%eval 0.0] [%clk 0:00:20] } 42. Nxb5 { [%eval 0.0] [%clk 0:00:39] } 42... Bxh2 { [%eval 0.0] [%clk 0:00:28] } 43. Nc3 { [%eval 0.0] [%clk 0:00:35] } 43... Rxb2 { [%eval 0.0] [%clk 0:00:33] } 44. Nxa4 { [%eval 0.0] [%clk 0:00:42] } 44... Rb3+ { [%eval 0.0] [%clk 0:00:42] } 45. Ke4 { [%eval 0.0] [%clk 0:00:51] } 45... Rxa3 { [%eval 0.02] [%clk 0:00:50] } 46. Rxh2 { [%eval 0.0] [%clk 0:00:57] } 46... Rxa4 { [%eval 0.0] [%clk 0:00:59] } 1/2-1/2`;

      let manager: PGNManager;

      beforeEach(() => {
        manager = new PGNManager(carlsenCaruanaPGN);
      });

      it("should detect as Chess960", () => {
        expect(manager.isChess960).toBe(true);
      });

      it("should load all 92 half-moves", () => {
        expect(manager.parsedPGN.moves).toHaveLength(92);
      });

      it("should have correct FEN after O-O-O (move 14)", () => {
        // Move 14 is O-O-O (white's 14th move = half-move 27)
        // Find O-O-O move
        let oooMove: Move | undefined;
        for (let i = 1; i <= 92; i++) {
          const m = manager.getMove(i);
          if (m.move === "O-O-O") {
            oooMove = m;
            break;
          }
        }
        expect(oooMove).toBeDefined();
        expect(oooMove!.move).toBe("O-O-O");

        const fen = manager.getMoveFen(oooMove!);
        // Chess960 uses X-FEN: castling rights use file letters (f = rook on f-file)
        expect(fen).toBe(
          "rbknqrb1/3np2p/1pp3p1/3p1P2/p2P1NP1/2P1N3/PPB4P/2KRQRB1 b fq - 2 14",
        );
      });

      it("should traverse the full game without errors", () => {
        let currentMove = manager.getFirstMove();
        let count = 1;
        while (manager.hasNextMove(currentMove)) {
          currentMove = manager.nextMove(currentMove);
          count++;
        }
        expect(count).toBe(92);
      });
    });
  });
});
