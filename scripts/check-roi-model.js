#!/usr/bin/env node
/*
 * Parity check: the model's defaults must reproduce the figures printed in the
 * October 28 pricing-review deck (TCO Review + BVD 3.0 export).
 *
 *   node scripts/check-roi-model.js
 */
'use strict';

const path = require('path');
const Model = require(path.join(__dirname, '..', 'assets', 'roi-model.js'));

let failures = 0;
let checks = 0;

function check(label, actual, expected, tolerance) {
  checks++;
  const tol = tolerance === undefined ? 0.5 : tolerance;
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failures++;
  const fmt = (n) => (Math.abs(n) >= 1000 ? n.toFixed(2) : String(n));
  console.log(
    (ok ? 'ok   ' : 'FAIL ') + label.padEnd(46) + ' got ' + fmt(actual).padStart(14) + '  want ' + fmt(expected)
  );
}

const r = Model.calculate(Model.clone(Model.DEFAULTS));
const byKey = {};
r.drivers.forEach((d) => (byKey[d.key] = d.value));

// Driver values, to the dollar (the deck rounds $14,250 and $166,154 for display only).
check('Increase Revenue per BDM', byKey.revenuePerBdm, 400000);
check('Increase Win Rate', byKey.winRate, 384000);
check('Reduce New BDM Onboarding Time', byKey.onboarding, 166154);
check('Increase BDM Productivity', byKey.productivity, 114000);
check('Increase Sales Team Efficiency', byKey.efficiency, 14250);
check('Steady-state annual benefit', r.steadyState, 1078404);

// Yearly benefit (deck: $323.5K, $754.9K, $1.1M x3), checked to $0.1K.
[323500, 754900, 1078404, 1078404, 1078404].forEach((want, i) => {
  check('Year ' + (i + 1) + ' benefit', r.years[i].benefit, want, i < 2 ? 50 : 0.5);
});

// Yearly cost (deck: $240K, $157K, $158.5K, $172.5K, $190.5K) and total $918.5K.
[240000, 157000, 158500, 172500, 190500].forEach((want, i) => {
  check('Year ' + (i + 1) + ' cost', r.years[i].cost, want, 0.5);
});
check('Five-year cost', r.totals.cost, 918500);
check('Licensing total', r.years.reduce((a, y) => a + y.licensing, 0), 644000);
check('Implementation total', r.years.reduce((a, y) => a + y.implementation, 0), 154500);
check('Maintenance total', r.years.reduce((a, y) => a + y.maintenance, 0), 120000);

// Net benefit by year (deck: $83.5K, $597.9K, $919.9K, $905.9K, $887.9K), to $0.1K.
[83500, 597900, 919900, 905900, 887900].forEach((want, i) => {
  check('Year ' + (i + 1) + ' net benefit', r.years[i].net, want, 50);
});

// Cumulative ROI (deck: 35%, 172%, 288%, 344%, 370%), to the whole percent.
[35, 172, 288, 344, 370].forEach((want, i) => {
  check('Year ' + (i + 1) + ' cumulative ROI %', Math.round(r.years[i].cumRoiPct), want, 0);
});

// Five-year totals as the site labels them.
check('Five-year total benefits (deck $4.3M)', r.totals.benefit / 1e6, 4.3, 0.05);
check('Five-year net benefit (deck $3.4M)', r.totals.net / 1e6, 3.4, 0.05);

// Payback is "under 12 months" in the deck.
checks++;
if (r.payback && r.payback.months < 12) {
  console.log('ok   Payback under 12 months'.padEnd(52) + ' got ' + r.payback.months.toFixed(1) + ' months');
} else {
  failures++;
  console.log('FAIL Payback under 12 months, got ' + JSON.stringify(r.payback));
}

// Sensitivity sanity checks: the model must respond to its inputs.
const more = Model.clone(Model.DEFAULTS);
more.bdms = 25;
const r2 = Model.calculate(more);
checks++;
if (r2.steadyState > r.steadyState) console.log('ok   More BDMs raises the benefit');
else {
  failures++;
  console.log('FAIL More BDMs should raise the benefit');
}

const fewerUsers = Model.clone(Model.DEFAULTS);
fewerUsers.users = 23;
const r3 = Model.calculate(fewerUsers);
checks++;
if (r3.years[0].licensing < r.years[0].licensing) console.log('ok   Fewer users lowers licensing');
else {
  failures++;
  console.log('FAIL Fewer users should lower licensing');
}

console.log('\n' + (checks - failures) + ' of ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
