import type { ProjectCalculation } from '../domain/types';

interface SummaryPanelProps {
  calculation: ProjectCalculation;
  label: (key: string) => string;
}

function formatVa(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} VA`;
}

function formatW(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} W`;
}

function formatAmp(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} A`;
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
        <dt>{label('totalDemandW')}</dt>
        <dd>{formatW(calculation.totalDemandW)}</dd>
        <dt>{label('feederDemandVa')}</dt>
        <dd>{formatVa(calculation.feederDemandVa)}</dd>
        <dt>{label('feederDesignCurrent')}</dt>
        <dd>{formatAmp(calculation.feederDesignCurrentA)}</dd>
        <dt>{label('recommendedMainBreaker')}</dt>
        <dd>{formatAmp(calculation.recommendedMainBreakerA)}</dd>
        <dt>L1</dt>
        <dd>{formatVa(calculation.phaseTotals.L1)}</dd>
        <dt>L2</dt>
        <dd>{formatVa(calculation.phaseTotals.L2)}</dd>
        <dt>L3</dt>
        <dd>{formatVa(calculation.phaseTotals.L3)}</dd>
        <dt>{label('unbalance')}</dt>
        <dd>{calculation.unbalancePercent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</dd>
        <dt>{label('neutralCurrent')}</dt>
        <dd>{formatAmp(calculation.neutralCurrentA)}</dd>
        <dt>{label('maxBranchVd')}</dt>
        <dd>{calculation.maxBranchVoltageDropPercent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</dd>
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
