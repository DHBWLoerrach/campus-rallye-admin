'use client';

interface RallyeResultRankProps {
  rank: number;
}

const medalMap: Record<number, { symbol: string; label: string }> = {
  1: { symbol: '🥇', label: 'Goldmedaille' },
  2: { symbol: '🥈', label: 'Silbermedaille' },
  3: { symbol: '🥉', label: 'Bronzemedaille' },
};

export default function RallyeResultRank({ rank }: RallyeResultRankProps) {
  const medal = medalMap[rank];
  if (!medal) {
    return <span>{rank}</span>;
  }
  return (
    <span role="img" aria-label={`${medal.label}, Platz ${rank}`}>
      {medal.symbol}
    </span>
  );
}
