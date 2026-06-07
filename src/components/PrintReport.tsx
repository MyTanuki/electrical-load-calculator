import type { ElectricalProject, ProjectCalculation } from '../domain/types';

interface PrintReportProps {
  project: ElectricalProject;
  calculation: ProjectCalculation;
  label: (key: string) => string;
}

function formatVa(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPercent(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function formatAmp(value: number | null): string {
  return value === null ? '-' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} A`;
}

function PrintReport({ project, calculation, label }: PrintReportProps) {
  const rowCalculationById = new Map(calculation.rowCalculations.map((rowCalculation) => [rowCalculation.rowId, rowCalculation]));

  return (
    <section className="print-report panel">
      <h1>{label('appTitle')}</h1>

      <dl className="report-metadata">
        <dt>{label('projectName')}</dt>
        <dd>{project.projectInfo.projectName}</dd>
        <dt>{label('location')}</dt>
        <dd>{project.projectInfo.location}</dd>
        <dt>{label('preparedBy')}</dt>
        <dd>{project.projectInfo.preparedBy}</dd>
        <dt>{label('date')}</dt>
        <dd>{project.projectInfo.date}</dd>
      </dl>

      <h2>{label('loadSchedule')}</h2>
      <table className="report-table">
        <thead>
          <tr>
            <th>{label('circuitNo')}</th>
            <th>{label('description')}</th>
            <th>{label('quantity')}</th>
            <th>{label('vaPerUnit')}</th>
            <th>{label('demandFactor')}</th>
            <th>{label('demandVa')}</th>
            <th>{label('currentA')}</th>
            <th>{label('phase')}</th>
            <th>{label('breaker')}</th>
            <th>{label('wireSize')}</th>
            <th>{label('ampacity')}</th>
            <th>{label('voltageDrop')}</th>
            <th>{label('requiredEgc')}</th>
          </tr>
        </thead>
        <tbody>
          {project.rows.map((row) => {
            const rowCalculation = rowCalculationById.get(row.id);

            return (
              <tr key={row.id}>
                <td>{row.circuitNo}</td>
                <td>{row.description}</td>
                <td>{row.quantity.toLocaleString()}</td>
                <td>{formatVa(row.vaPerUnit)}</td>
                <td>{formatPercent(row.demandFactor * 100)}</td>
                <td>{rowCalculation ? formatVa(rowCalculation.demandVa) : '-'}</td>
                <td>{rowCalculation ? formatAmp(rowCalculation.currentA) : '-'}</td>
                <td>{row.phaseMode === 'three' ? '3P' : row.phase}</td>
                <td>{row.breaker}</td>
                <td>{row.wireSize}</td>
                <td>{rowCalculation ? formatAmp(rowCalculation.wireAmpacityA) : '-'}</td>
                <td>{rowCalculation ? formatPercent(rowCalculation.voltageDropPercent) : '-'}</td>
                <td>
                  {rowCalculation && rowCalculation.requiredEgcSqmm !== null
                    ? `${rowCalculation.requiredEgcSqmm} sq.mm`
                    : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="report-summary">
        <dl>
          <dt>{label('totalConnectedVa')}</dt>
          <dd>{formatVa(calculation.totalConnectedVa)} VA</dd>
          <dt>{label('totalDemandVa')}</dt>
          <dd>{formatVa(calculation.totalDemandVa)} VA</dd>
          <dt>{label('totalDemandW')}</dt>
          <dd>{formatVa(calculation.totalDemandW)} W</dd>
          <dt>{label('feederDesignCurrent')}</dt>
          <dd>{formatAmp(calculation.feederDesignCurrentA)}</dd>
          <dt>{label('recommendedMainBreaker')}</dt>
          <dd>{formatAmp(calculation.recommendedMainBreakerA)}</dd>
          <dt>{label('neutralCurrent')}</dt>
          <dd>{formatAmp(calculation.neutralCurrentA)}</dd>
          <dt>{label('phaseBalance')}</dt>
          <dd>
            L1 {formatVa(calculation.phaseTotals.L1)} VA / L2 {formatVa(calculation.phaseTotals.L2)} VA / L3{' '}
            {formatVa(calculation.phaseTotals.L3)} VA
          </dd>
          <dt>{label('unbalance')}</dt>
          <dd>{formatPercent(calculation.unbalancePercent)}</dd>
        </dl>
      </div>

      <p>{label('disclaimer')}</p>
    </section>
  );
}

export default PrintReport;
