import { useMemo } from 'react';
import { clusterStats } from './scheduling';
import type { ProgressMap, Question } from './types';

interface Props {
  questions: Question[];
  progress: ProgressMap;
  onPick: (cluster: string) => void;
}

export const ClusterHeatmap = ({ questions, progress, onPick }: Props) => {
  const stats = useMemo(() => clusterStats(questions, progress), [questions, progress]);

  return (
    <section className="heatmap">
      <h2>Coverage</h2>
      <table>
        <thead>
          <tr>
            <th>Cluster</th>
            <th>Total</th>
            <th>Knew</th>
            <th>Shaky</th>
            <th>No idea</th>
            <th>Unseen</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {stats.map(stat => {
            const graded = stat.total - stat.unseen;
            const ratio = graded ? stat.known / graded : 0;

            return (
              <tr key={stat.cluster}>
                <td>
                  <button className="link" onClick={() => onPick(stat.cluster)}>
                    {stat.cluster}
                  </button>
                </td>
                <td className="num">{stat.total}</td>
                <td className="num good">{stat.known || ''}</td>
                <td className="num warn">{stat.shaky || ''}</td>
                <td className="num bad">{stat.unknown || ''}</td>
                <td className="num muted">{stat.unseen || ''}</td>
                <td className="bar">
                  <span
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                    className={ratio > 0.7 ? 'good' : ratio > 0.4 ? 'warn' : 'bad'}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};
