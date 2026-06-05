import { useEffect, useMemo, useRef, useState } from "react";

type Mark = "X" | "O";
type CellValue = Mark | null;
type Difficulty = "easy" | "medium" | "hard";
type RoundResult = Mark | "Draw";
type Starter = "player" | "computer";

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const INITIAL_BOARD: CellValue[] = Array(9).fill(null);

function evaluateBoard(board: CellValue[]) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { result: board[a] as Mark, line: [a, b, c] };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { result: "Draw" as const, line: null };
  }
  return { result: null, line: null };
}

function getEmptyCells(board: CellValue[]) {
  return board
    .map((cell, index) => (cell === null ? index : -1))
    .filter((index) => index !== -1);
}

function findLineMove(board: CellValue[], mark: Mark) {
  for (const line of WIN_LINES) {
    const cells = line.map((index) => board[index]);
    const markCount = cells.filter((cell) => cell === mark).length;
    const emptyCount = cells.filter((cell) => cell === null).length;
    if (markCount === 2 && emptyCount === 1) {
      return line[cells.findIndex((cell) => cell === null)];
    }
  }
  return -1;
}

function randomMove(board: CellValue[]) {
  const emptyCells = getEmptyCells(board);
  if (!emptyCells.length) return -1;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function minimax(
  board: CellValue[],
  isMaximizing: boolean,
  computerMark: Mark,
  playerMark: Mark,
  depth: number
): number {
  const { result } = evaluateBoard(board);
  if (result === computerMark) return 10 - depth;
  if (result === playerMark) return depth - 10;
  if (result === "Draw") return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const index of getEmptyCells(board)) {
      board[index] = computerMark;
      const score = minimax(board, false, computerMark, playerMark, depth + 1);
      board[index] = null;
      bestScore = Math.max(bestScore, score);
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (const index of getEmptyCells(board)) {
    board[index] = playerMark;
    const score = minimax(board, true, computerMark, playerMark, depth + 1);
    board[index] = null;
    bestScore = Math.min(bestScore, score);
  }
  return bestScore;
}

function hardMove(board: CellValue[], computerMark: Mark, playerMark: Mark) {
  let bestScore = -Infinity;
  let move = -1;
  for (const index of getEmptyCells(board)) {
    board[index] = computerMark;
    const score = minimax(board, false, computerMark, playerMark, 0);
    board[index] = null;
    if (score > bestScore) {
      bestScore = score;
      move = index;
    }
  }
  return move;
}

function mediumMove(board: CellValue[], computerMark: Mark, playerMark: Mark) {
  const winMove = findLineMove(board, computerMark);
  if (winMove !== -1) return winMove;
  const blockMove = findLineMove(board, playerMark);
  if (blockMove !== -1) return blockMove;
  if (board[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((cell) => board[cell] === null);
  if (corners.length) {
    return corners[Math.floor(Math.random() * corners.length)];
  }
  return randomMove(board);
}

function getComputerMove(
  board: CellValue[],
  difficulty: Difficulty,
  computerMark: Mark,
  playerMark: Mark
) {
  if (difficulty === "easy") return randomMove(board);
  if (difficulty === "medium") return mediumMove(board, computerMark, playerMark);
  return hardMove(board, computerMark, playerMark);
}

export default function App() {
  const [board, setBoard] = useState<CellValue[]>(INITIAL_BOARD);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerMark, setPlayerMark] = useState<Mark>("X");
  const [starter, setStarter] = useState<Starter>("player");
  const [currentTurn, setCurrentTurn] = useState<Starter>("player");
  const [winner, setWinner] = useState<RoundResult | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [scores, setScores] = useState({ player: 0, computer: 0, draws: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  const computerMark: Mark = playerMark === "X" ? "O" : "X";

  const statusText = useMemo(() => {
    if (winner === playerMark) return "You won";
    if (winner === computerMark) return "AI won";
    if (winner === "Draw") return "Draw";
    return currentTurn === "player" ? "Your turn" : "AI turn";
  }, [winner, currentTurn, playerMark, computerMark]);

  const resultLabel = useMemo(() => {
    if (winner === playerMark) return "WIN";
    if (winner === computerMark) return "LOST";
    if (winner === "Draw") return "DRAW";
    return "";
  }, [winner, playerMark, computerMark]);

  function finishRound(result: RoundResult, line: number[] | null) {
    setWinner(result);
    setWinningLine(line);
    setIsThinking(false);
    setScores((prev) => {
      if (result === playerMark) return { ...prev, player: prev.player + 1 };
      if (result === computerMark)
        return { ...prev, computer: prev.computer + 1 };
      return { ...prev, draws: prev.draws + 1 };
    });
  }

  function startNewRound(nextStarter: Starter = starter) {
    setBoard([...INITIAL_BOARD]);
    setWinner(null);
    setWinningLine(null);
    setCurrentTurn(nextStarter);
    setIsThinking(nextStarter === "computer");
  }

  function resetAll() {
    setScores({ player: 0, computer: 0, draws: 0 });
    startNewRound(starter);
  }

  function applyPlayerMove(index: number) {
    if (
      currentTurn !== "player" ||
      winner ||
      isThinking ||
      board[index] !== null
    )
      return;

    const nextBoard = [...board];
    nextBoard[index] = playerMark;
    setBoard(nextBoard);

    const evaluation = evaluateBoard(nextBoard);
    if (evaluation.result) {
      finishRound(evaluation.result, evaluation.line);
      return;
    }

    setCurrentTurn("computer");
    setIsThinking(true);
  }

  useEffect(() => {
    if (currentTurn !== "computer" || winner) return;

    const thinkDelay = difficulty === "hard" ? 560 : 360;
    const timer = window.setTimeout(() => {
      const move = getComputerMove(
        [...board],
        difficulty,
        computerMark,
        playerMark
      );
      if (move === -1) {
        setIsThinking(false);
        return;
      }

      const nextBoard = [...board];
      nextBoard[move] = computerMark;
      setBoard(nextBoard);

      const evaluation = evaluateBoard(nextBoard);
      if (evaluation.result) {
        finishRound(evaluation.result, evaluation.line);
      } else {
        setCurrentTurn("player");
        setIsThinking(false);
      }
    }, thinkDelay);

    return () => window.clearTimeout(timer);
  }, [board, currentTurn, winner, difficulty, playerMark, computerMark]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSettings(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        showSettings &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(target)
      ) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [showSettings]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070910] px-3 py-4 text-slate-100 select-none">
      <div className="relative">
        <section className="relative h-[600px] w-[380px] rounded-3xl border border-cyan-400/30 bg-[#0a0f1f] shadow-[0_0_40px_rgba(56,189,248,0.25)]">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.2),transparent_45%)]" />

          <header className="relative z-10 flex items-center justify-between border-b border-cyan-400/20 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/60 bg-cyan-300/20 text-sm font-bold text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.35)]">
                T
              </span>
              <div>
                <p className="text-sm font-bold tracking-wide text-cyan-100">
                  Neon Tic Tac Toe
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/70">
                  {difficulty}
                </p>
              </div>
            </div>

            <button
              ref={settingsBtnRef}
              onClick={() => setShowSettings((s) => !s)}
              type="button"
              aria-label="Settings"
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                showSettings
                  ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                  : "border-transparent text-cyan-300/80 hover:bg-cyan-300/10 hover:text-cyan-100"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 1-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 1-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 1-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 1 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 1 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 1 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 1-1.51 1z" />
              </svg>
            </button>
          </header>

          <div className="relative z-10 flex h-[calc(100%-98px)] flex-col px-4 py-3">
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  winner
                    ? winner === playerMark
                      ? "border-emerald-300/60 bg-emerald-300/20 text-emerald-200"
                      : winner === computerMark
                      ? "border-rose-300/60 bg-rose-300/20 text-rose-200"
                      : "border-amber-300/60 bg-amber-300/20 text-amber-200"
                    : currentTurn === "player"
                    ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-200"
                    : "border-violet-300/50 bg-violet-300/15 text-violet-200"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                {statusText}
              </span>
              {isThinking && !winner && (
                <span className="text-xs text-cyan-200/70">AI thinking…</span>
              )}
            </div>

            {winner && (
              <div
                className={`mb-3 flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                  winner === playerMark
                    ? "border-emerald-400/40 bg-emerald-400/10"
                    : winner === computerMark
                    ? "border-rose-400/40 bg-rose-400/10"
                    : "border-amber-400/40 bg-amber-400/10"
                }`}
              >
                <p
                  className={`text-sm font-bold tracking-[0.16em] ${
                    winner === playerMark
                      ? "text-emerald-200"
                      : winner === computerMark
                      ? "text-rose-200"
                      : "text-amber-200"
                  }`}
                >
                  {resultLabel}
                </p>
                <button
                  onClick={() => startNewRound(starter)}
                  type="button"
                  className="rounded-md bg-cyan-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                >
                  RESET
                </button>
              </div>
            )}

            <div className="animate-board-glow grid grid-cols-3 gap-2 rounded-2xl border border-cyan-400/30 bg-[#0f1733]/80 p-2.5">
              {board.map((cell, index) => {
                const isWinningCell = Boolean(winningLine?.includes(index));
                return (
                  <button
                    key={index}
                    onClick={() => applyPlayerMove(index)}
                    type="button"
                    disabled={
                      Boolean(cell) ||
                      Boolean(winner) ||
                      currentTurn !== "player" ||
                      isThinking
                    }
                    className={`aspect-square rounded-xl border text-3xl font-bold transition-all duration-200 disabled:cursor-not-allowed ${
                      isWinningCell
                        ? "animate-win-cell border-emerald-300 bg-emerald-300/25 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.35)]"
                        : cell
                        ? "border-cyan-300/45 bg-[#132041] text-cyan-100"
                        : "border-cyan-500/25 bg-[#111a37] text-cyan-400/30 hover:border-cyan-300/60 hover:bg-[#16254a] hover:text-cyan-100"
                    }`}
                  >
                    <span className={cell ? "inline-block animate-pop-in" : ""}>
                      {cell}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-cyan-400/15 bg-[#0d1530] py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  You
                </p>
                <p className="text-xl font-bold text-cyan-100">{scores.player}</p>
              </div>
              <div className="rounded-xl border border-cyan-400/15 bg-[#0d1530] py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Draw
                </p>
                <p className="text-xl font-bold text-cyan-100">{scores.draws}</p>
              </div>
              <div className="rounded-xl border border-cyan-400/15 bg-[#0d1530] py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  AI
                </p>
                <p className="text-xl font-bold text-cyan-100">
                  {scores.computer}
                </p>
              </div>
            </div>
          </div>

          <footer className="relative z-10 flex items-center justify-between border-t border-cyan-400/15 px-4 py-2.5 text-[11px] text-slate-500">
            <span>
              Mark: {playerMark} · First: {starter}
            </span>
            <span>v1.0</span>
          </footer>
        </section>

        {showSettings && (
          <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-cyan-300/30 bg-[#0d1530] p-3 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-cyan-200">
              Settings
            </p>
            <div className="space-y-3.5">
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-400">
                  Difficulty
                </p>
                <div className="flex gap-1.5">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setDifficulty(level);
                        startNewRound(starter);
                        setShowSettings(false);
                      }}
                      type="button"
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition ${
                        difficulty === level
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-400">
                  Your Mark
                </p>
                <div className="flex gap-1.5">
                  {(["X", "O"] as Mark[]).map((mark) => (
                    <button
                      key={mark}
                      onClick={() => {
                        setPlayerMark(mark);
                        startNewRound(starter);
                        setShowSettings(false);
                      }}
                      type="button"
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                        playerMark === mark
                          ? "bg-fuchsia-400 text-slate-950"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {mark}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-400">
                  First Move
                </p>
                <div className="flex gap-1.5">
                  {(["player", "computer"] as Starter[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setStarter(option);
                        startNewRound(option);
                        setShowSettings(false);
                      }}
                      type="button"
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        starter === option
                          ? "bg-violet-400 text-slate-950"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    startNewRound(starter);
                    setShowSettings(false);
                  }}
                  type="button"
                  className="flex-1 rounded-md bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
                >
                  New Round
                </button>
                <button
                  onClick={() => {
                    resetAll();
                    setShowSettings(false);
                  }}
                  type="button"
                  className="flex-1 rounded-md border border-cyan-300/40 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/10"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
