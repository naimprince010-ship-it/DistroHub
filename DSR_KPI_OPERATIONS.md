# DSR KPI Operations Cadence

## Daily Cadence

- **6:00 PM** - Collection cut-off for the day.
- **6:30 PM** - SR accountability review (cash holding, pending reconciliations).
- **7:00 PM** - Route reconciliation closure and variance sign-off.

## Core KPIs

- **Delivery success rate** = delivered stops / total route stops.
- **Collection efficiency** = collected amount / collectible amount.
- **Reconciliation lag** = hours from route completion to reconciliation.
- **Cash variance count** = number of routes with non-zero discrepancy.
- **Overdue growth** = delta in overdue receivables by SR/area.

## Daily Review Checklist

- Validate all today collections include `sale_id` + `collected_by`.
- Confirm no open route remains without reconciliation note.
- Investigate any payment rows without route mapping.
- Escalate SRs with repeated variance or delayed reconciliation.

## Weekly Supervisor Actions

- Rank SR performance using collection efficiency and lag.
- Review variance trend and route-level leakage hotspots.
- Plan coaching/reassignment for underperforming territories.
