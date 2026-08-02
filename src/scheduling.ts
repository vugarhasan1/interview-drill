import type { Grade, Progress, ProgressMap, Question, QueueMode } from './types';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// Deliberately simpler than SM-2: three buttons, growing intervals, no ease factors to tune.
const INTERVAL: Record<Grade, (repetitions: number) => number> = {
  unknown: () => 10 * MINUTE,
  shaky: () => DAY,
  known: repetitions => Math.min(5 * DAY * Math.max(1, repetitions), 60 * DAY),
};

export const gradeQuestion = (
  current: Progress | undefined,
  grade: Grade,
  seconds: number,
  now = Date.now(),
): Progress => {
  const repetitions = grade === 'known' ? (current?.grade === 'known' ? current.seen + 1 : 1) : 0;

  return {
    grade,
    seen: (current?.seen ?? 0) + 1,
    lastSeen: now,
    due: now + INTERVAL[grade](repetitions),
    seconds,
  };
};

export const buildQueue = (
  questions: Question[],
  progress: ProgressMap,
  mode: QueueMode,
  cluster: string | 'all',
  now = Date.now(),
): Question[] => {
  const inCluster = questions.filter(q => cluster === 'all' || q.cluster === cluster);

  switch (mode) {
    // Coverage first: every question is shown once, in source order, before anything repeats.
    case 'unseen':
      return inCluster.filter(q => !progress[q.id]);
    case 'due':
      return inCluster.filter(q => progress[q.id] && progress[q.id]!.due <= now);
    case 'weak':
      return inCluster.filter(q => {
        const grade = progress[q.id]?.grade;
        return grade === 'shaky' || grade === 'unknown';
      });
    case 'all':
      return inCluster;
    case 'mock':
      return [...inCluster].sort(() => Math.random() - 0.5).slice(0, 10);
  }
};

export interface ClusterStat {
  cluster: string;
  total: number;
  known: number;
  shaky: number;
  unknown: number;
  unseen: number;
}

export const clusterStats = (questions: Question[], progress: ProgressMap): ClusterStat[] => {
  const stats = new Map<string, ClusterStat>();

  for (const question of questions) {
    const stat = stats.get(question.cluster) ?? {
      cluster: question.cluster,
      total: 0,
      known: 0,
      shaky: 0,
      unknown: 0,
      unseen: 0,
    };

    stat.total += 1;
    const grade = progress[question.id]?.grade;
    if (grade === 'known') stat.known += 1;
    else if (grade === 'shaky') stat.shaky += 1;
    else if (grade === 'unknown') stat.unknown += 1;
    else stat.unseen += 1;

    stats.set(question.cluster, stat);
  }

  return [...stats.values()].sort((a, b) => b.total - a.total);
};
