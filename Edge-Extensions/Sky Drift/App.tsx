import { useEffect, useMemo, useRef, useState } from "react";

type GameStatus = "idle" | "playing" | "game-over";

type Pipe = {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
};

const WORLD = {
  width: 900,
  height: 600,
  birdX: 180,
  birdSize: 36,
  gravity: 0.48,
  flapVelocity: -8.6,
  maxFallSpeed: 10,
  pipeWidth: 110,
  pipeGap: 180,
  pipeSpeed: 3.5,
  pipeSpawnInterval: 1500,
  minGapY: 130,
  maxGapY: 470,
  groundHeight: 84,
};

function createPipe(id: number): Pipe {
  return {
    id,
    x: WORLD.width + WORLD.pipeWidth,
    gapY: Math.random() * (WORLD.maxGapY - WORLD.minGapY) + WORLD.minGapY,
    passed: false,
  };
}

function Bird({ y, tilt }: { y: number; tilt: number }) {
  return (
    <div
      className="absolute"
      style={{
        left: WORLD.birdX,
        top: y,
        width: WORLD.birdSize,
        height: WORLD.birdSize,
        transform: `rotate(${tilt}deg)`,
        transition: "transform 70ms linear",
      }}
    >
      <div className="relative h-full w-full rounded-full border-2 border-amber-950 bg-amber-400 shadow-[inset_-6px_-8px_0_0_rgba(251,191,36,0.8)]">
        <div className="absolute left-[9px] top-[10px] h-[13px] w-[13px] rounded-full bg-amber-200" />
        <div className="absolute right-[6px] top-[11px] h-[9px] w-[9px] rounded-full bg-slate-900" />
        <div className="absolute right-[-12px] top-[14px] h-0 w-0 border-b-[8px] border-l-[16px] border-t-[8px] border-b-transparent border-l-orange-500 border-t-transparent" />
      </div>
    </div>
  );
}

function Pipes({ pipes }: { pipes: Pipe[] }) {
  return (
    <>
      {pipes.map((pipe) => {
        const topHeight = pipe.gapY - WORLD.pipeGap / 2;
        const bottomTop = pipe.gapY + WORLD.pipeGap / 2;
        const bottomHeight = WORLD.height - WORLD.groundHeight - bottomTop;

        return (
          <div key={pipe.id} className="absolute inset-0">
            <div
              className="absolute border-2 border-emerald-950 bg-emerald-500"
              style={{
                left: pipe.x,
                top: 0,
                width: WORLD.pipeWidth,
                height: topHeight,
              }}
            />
            <div
              className="absolute border-2 border-emerald-950 bg-emerald-500"
              style={{
                left: pipe.x - 8,
                top: topHeight - 18,
                width: WORLD.pipeWidth + 16,
                height: 20,
              }}
            />
            <div
              className="absolute border-2 border-emerald-950 bg-emerald-500"
              style={{
                left: pipe.x,
                top: bottomTop,
                width: WORLD.pipeWidth,
                height: bottomHeight,
              }}
            />
            <div
              className="absolute border-2 border-emerald-950 bg-emerald-500"
              style={{
                left: pipe.x - 8,
                top: bottomTop,
                width: WORLD.pipeWidth + 16,
                height: 20,
              }}
            />
          </div>
        );
      })}
    </>
  );
}

export default function App() {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [birdY, setBirdY] = useState(WORLD.height / 2 - WORLD.birdSize / 2);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [flapPulse, setFlapPulse] = useState(0);

  const velocityRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const spawnClockRef = useRef(0);
  const nextPipeId = useRef(1);

  const skyBackground = useMemo(
    () =>
      "linear-gradient(180deg, rgba(14,165,233,1) 0%, rgba(56,189,248,1) 42%, rgba(125,211,252,1) 100%)",
    []
  );

  const resetGame = () => {
    setBirdY(WORLD.height / 2 - WORLD.birdSize / 2);
    setPipes([]);
    setScore(0);
    setStatus("idle");
    velocityRef.current = 0;
    spawnClockRef.current = 0;
    nextPipeId.current = 1;
  };

  const flap = () => {
    if (status === "game-over") {
      resetGame();
      return;
    }

    if (status === "idle") {
      setStatus("playing");
    }

    velocityRef.current = WORLD.flapVelocity;
    setFlapPulse((pulse) => pulse + 1);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        flap();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (status !== "playing") {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      lastFrameRef.current = 0;
      return;
    }

    const loop = (now: number) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = now;
      }

      const elapsedMs = Math.min(now - lastFrameRef.current, 34);
      lastFrameRef.current = now;
      const frameScale = elapsedMs / 16.666;

      velocityRef.current = Math.min(velocityRef.current + WORLD.gravity * frameScale, WORLD.maxFallSpeed);

      setBirdY((prevY) => {
        const nextY = prevY + velocityRef.current * frameScale;
        return nextY;
      });

      spawnClockRef.current += elapsedMs;
      if (spawnClockRef.current >= WORLD.pipeSpawnInterval) {
        spawnClockRef.current = 0;
        setPipes((prevPipes) => [...prevPipes, createPipe(nextPipeId.current++)]);
      }

      setPipes((prevPipes) =>
        prevPipes
          .map((pipe) => ({ ...pipe, x: pipe.x - WORLD.pipeSpeed * frameScale }))
          .filter((pipe) => pipe.x + WORLD.pipeWidth > -40)
      );

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [status]);

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const birdTop = birdY;
    const birdBottom = birdY + WORLD.birdSize;
    const birdLeft = WORLD.birdX;
    const birdRight = WORLD.birdX + WORLD.birdSize;

    const hitCeiling = birdTop <= 0;
    const hitGround = birdBottom >= WORLD.height - WORLD.groundHeight;

    const hitPipe = pipes.some((pipe) => {
      const inPipeRange = birdRight > pipe.x && birdLeft < pipe.x + WORLD.pipeWidth;
      if (!inPipeRange) {
        return false;
      }

      const gapTop = pipe.gapY - WORLD.pipeGap / 2;
      const gapBottom = pipe.gapY + WORLD.pipeGap / 2;
      return birdTop < gapTop || birdBottom > gapBottom;
    });

    if (hitCeiling || hitGround || hitPipe) {
      setStatus("game-over");
      setBestScore((best) => Math.max(best, score));
      return;
    }

    pipes.forEach((pipe) => {
      if (!pipe.passed && pipe.x + WORLD.pipeWidth < WORLD.birdX) {
        pipe.passed = true;
        setScore((prevScore) => prevScore + 1);
      }
    });
  }, [birdY, pipes, score, status]);

  const birdTilt = Math.max(-30, Math.min(60, velocityRef.current * 5));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-5 py-8 text-white">
      <h1 className="mb-2 text-3xl font-black tracking-tight text-cyan-300 sm:text-4xl">Sky Drift</h1>
      <p className="mb-5 text-sm text-cyan-50/80">Tap, click, or press space to keep your bird in the wind tunnel.</p>

      <section
        className="relative w-full max-w-[900px] overflow-hidden border-4 border-cyan-950"
        style={{
          height: WORLD.height,
          backgroundImage: skyBackground,
          boxShadow: "0 20px 60px rgba(6, 182, 212, 0.26)",
        }}
        onMouseDown={flap}
        onTouchStart={flap}
        role="button"
        aria-label="Play Sky Drift"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            flap();
          }
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.35),transparent_42%)]" />

        <div className="absolute inset-x-0 top-10 flex items-center justify-center">
          <div
            key={flapPulse}
            className="text-5xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] animate-[pop_140ms_ease-out]"
          >
            {score}
          </div>
        </div>

        <Pipes pipes={pipes} />
        <Bird y={birdY} tilt={birdTilt} />

        <div
          className="absolute inset-x-0 bottom-0 border-t-4 border-lime-900 bg-lime-500"
          style={{
            height: WORLD.groundHeight,
            backgroundImage:
              "linear-gradient(90deg, rgba(132,204,22,1) 0%, rgba(101,163,13,1) 50%, rgba(132,204,22,1) 100%)",
            backgroundSize: "200px 100%",
            animation: status === "playing" ? "ground-shift 700ms linear infinite" : undefined,
          }}
        />

        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/45 text-center">
            {status === "idle" ? (
              <>
                <p className="text-5xl font-black text-white">Ready?</p>
                <p className="mt-3 text-lg text-cyan-100">Start flying through the pipe canyon.</p>
                <p className="mt-6 text-sm uppercase tracking-[0.25em] text-cyan-100/80">Press Space or Tap</p>
              </>
            ) : (
              <>
                <p className="text-5xl font-black text-rose-300">Crash!</p>
                <p className="mt-3 text-xl text-cyan-100">Score: {score}</p>
                <p className="mt-1 text-sm text-cyan-100/80">Best: {Math.max(bestScore, score)}</p>
                <button
                  type="button"
                  className="mt-6 border-2 border-cyan-100 bg-cyan-400 px-5 py-2 text-sm font-bold uppercase tracking-[0.18em] text-cyan-950 transition hover:bg-cyan-300"
                  onClick={resetGame}
                >
                  Play Again
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <style>{`
        @keyframes ground-shift {
          from { background-position-x: 0; }
          to { background-position-x: -200px; }
        }

        @keyframes pop {
          from { transform: scale(1.25); }
          to { transform: scale(1); }
        }
      `}</style>
    </main>
  );
}
