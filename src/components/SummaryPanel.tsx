import type { ProjectCalculation } from '../domain/types';

interface SummaryPanelProps {
  calculation: ProjectCalculation;
  label: (key: string) => string;
}

function formatVa(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} VA`;
}

function SummaryPanel({ calculation, label }: SummaryPanelProps) {
  return (
    <article className="panel summary-panel">
      <h2>{label('summary')}</h2>
      <dl>
        <dt>{label('totalConnectedVa')}</dt>
        <dd>{formatVa(calculation.totalConnectedVa)}</dd>
        <dt>{label('totalDemandVa')}</dt>
        <dd>{formatVa(calculation.totalDemandVa)}</dd>
        <dt>L1</dt>
        <dd>{formatVa(calculation.phaseTotals.L1)}</dd>
        <dt>L2</dt>
        <dd>{formatVa(calculation.phaseTotals.L2)}</dd>
        <dt>L3</dt>
        <dd>{formatVa(calculation.phaseTotals.L3)}</dd>
        <dt>{label('unbalance')}</dt>
        <dd>{calculation.unbalancePercent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</dd>
      </dl>
      {calculation.warnings.length > 0 ? (
        <ul>
          {calculation.warnings.map((warningKey) => (
            <li key={warningKey}>{label(warningKey)}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export default SummaryPanel;
