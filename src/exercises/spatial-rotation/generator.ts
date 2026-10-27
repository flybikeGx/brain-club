import type { ExerciseGenerator, GeneratedProblem } from '@/domain/types';
import { integer, rng, shuffle } from '@/engine/generators/random';
export type Cell = [number, number];
export const normalize = (cells: Cell[]) => {
  const x = Math.min(...cells.map((c) => c[0])),
    y = Math.min(...cells.map((c) => c[1]));
  return cells.map((c) => [c[0] - x, c[1] - y] as Cell).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
export const turn = (cells: Cell[]): Cell[] => normalize(cells.map(([x, y]) => [-y, x]));
export const mirror = (cells: Cell[]): Cell[] => normalize(cells.map(([x, y]) => [-x, y]));
export function signature(cells: Cell[]): string {
  let c = normalize(cells);
  const forms = [];
  for (let i = 0; i < 4; i++) {
    forms.push(JSON.stringify(c));
    c = turn(c);
  }
  return forms.sort()[0];
}
export interface RotationProblem extends GeneratedProblem {
  cells: Cell[];
  options: { cells: Cell[]; angle: number }[];
}
export const rotationGenerator: ExerciseGenerator<RotationProblem, number> = {
  id: 'spatial-rotation-2d',
  version: '1.0.0',
  generate(seed, difficulty, constraints) {
    const random = rng(seed),
      complexity = integer(
        difficulty.complexity,
        5,
        integer(constraints?.maxComplexity, 5, 12, 12),
        6,
      ),
      count = integer(difficulty.options, 2, integer(constraints?.maxOptions, 2, 5, 5), 3);
    let cells: Cell[] = [];
    for (let attempt = 0; attempt < 500; attempt++) {
      cells = [[0, 0]];
      while (cells.length < complexity) {
        const base = cells[Math.floor(random() * cells.length)],
          d = (
            [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ] as Cell[]
          )[Math.floor(random() * 4)];
        const next: Cell = [base[0] + d[0], base[1] + d[1]];
        if (!cells.some((c) => c[0] === next[0] && c[1] === next[1])) cells.push(next);
      }
      cells = normalize(cells);
      if (signature(cells) !== signature(mirror(cells))) break;
    }
    if (signature(cells) === signature(mirror(cells)))
      throw new Error('Unable to generate a chiral shape');
    const angles = shuffle([30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330], random);
    const options = shuffle(
      Array.from({ length: count }, (_, i) => ({
        cells: i === 0 ? cells : mirror(cells),
        angle: angles[i],
      })),
      random,
    );
    return {
      id: `rotation:${seed}:${complexity}:${count}`,
      generatorId: this.id,
      generatorVersion: this.version,
      seed,
      difficulty: { complexity, options: count },
      taskVariant: 'rotation-vs-mirror',
      cells,
      options,
    };
  },
  validate(p) {
    return (
      new Set(p.cells.map((c) => c.join(','))).size === p.cells.length &&
      signature(p.cells) !== signature(mirror(p.cells)) &&
      p.options.filter((o) => signature(o.cells) === signature(p.cells)).length === 1
    );
  },
  solve(p) {
    return p.options.findIndex((o) => signature(o.cells) === signature(p.cells));
  },
  score(p, a) {
    return Number(a === this.solve(p));
  },
  serialize(p) {
    return JSON.stringify(p);
  },
};
