import {
  BASE_AMPACITY,
  STANDARD_BREAKER_SIZES,
  WIRE_SIZES_SQMM,
  groupingFactor,
  type InstallationMethod,
} from '../domain/standards';

interface StandardsReferenceProps {
  label: (key: string) => string;
}

const AMPACITY_METHODS: InstallationMethod[] = ['conduit_wall', 'conduit_air', 'tray_clipped'];
const EGC_BREAKERS = [16, 20, 40, 70, 100, 200, 400, 500, 800, 1000, 1250, 2000, 2500, 4000, 6000];
const EGC_SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 185, 240, 400];
const AMBIENT_CORRECTION_ROWS = [
  { temp: 25, factor: 1.12 },
  { temp: 30, factor: 1.08 },
  { temp: 35, factor: 1.04 },
  { temp: 40, factor: 1 },
  { temp: 45, factor: 0.91 },
  { temp: 50, factor: 0.82 },
  { temp: 55, factor: 0.71 },
  { temp: 60, factor: 0.58 },
];
const GROUPING_ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function StandardsReference({ label }: StandardsReferenceProps) {
  return (
    <section className="standards-reference" aria-labelledby="standards-heading">
      <article className="panel">
        <h2 id="standards-heading">{label('standardsTab')}</h2>
        <p className="standards-note">{label('standardsNote')}</p>
      </article>

      <article className="panel">
        <h3>{label('standardAmpacity')}</h3>
        <div className="table-wrap">
          <table className="standards-table">
            <thead>
              <tr>
                <th>{label('wireSizeSqmm')}</th>
                {AMPACITY_METHODS.map((method) => (
                  <th key={method}>{label(`method.${method}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WIRE_SIZES_SQMM.map((size) => (
                <tr key={size}>
                  <th scope="row">{formatNumber(size)}</th>
                  {AMPACITY_METHODS.map((method) => (
                    <td key={method}>{BASE_AMPACITY[method][size]} A</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel standards-reference-grid">
        <section>
          <h3>{label('standardBreakers')}</h3>
          <p className="standards-chip-list">
            {STANDARD_BREAKER_SIZES.map((size) => (
              <span key={size}>{size} A</span>
            ))}
          </p>
        </section>

        <section>
          <h3>{label('standardAmbientCorrection')}</h3>
          <div className="table-wrap">
            <table className="standards-table compact-table">
              <thead>
                <tr>
                  <th>{label('ambientTempC')}</th>
                  <th>{label('correctionFactor')}</th>
                </tr>
              </thead>
              <tbody>
                {AMBIENT_CORRECTION_ROWS.map((row) => (
                  <tr key={row.temp}>
                    <th scope="row">{row.temp}</th>
                    <td>{formatNumber(row.factor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3>{label('standardGroupingFactor')}</h3>
          <div className="table-wrap">
            <table className="standards-table compact-table">
              <thead>
                <tr>
                  <th>{label('conductorsInGroup')}</th>
                  <th>{label('correctionFactor')}</th>
                </tr>
              </thead>
              <tbody>
                {GROUPING_ROWS.map((count) => (
                  <tr key={count}>
                    <th scope="row">{count >= 10 ? '10+' : count}</th>
                    <td>{formatNumber(groupingFactor(count))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3>{label('standardGrounding')}</h3>
          <div className="table-wrap">
            <table className="standards-table compact-table">
              <thead>
                <tr>
                  <th>{label('breaker')}</th>
                  <th>{label('requiredEgc')}</th>
                </tr>
              </thead>
              <tbody>
                {EGC_BREAKERS.map((breaker, index) => (
                  <tr key={breaker}>
                    <th scope="row">{breaker} A</th>
                    <td>{formatNumber(EGC_SIZES[index])} sq.mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </article>
    </section>
  );
}

export default StandardsReference;
