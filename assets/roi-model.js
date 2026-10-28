/*
 * Luttrell Staffing x Salesforce: business case model.
 *
 * This is the model exactly as printed in the October 28 pricing-review deck
 * (TCO Review and the BVD 3.0 export). Every default below reproduces the deck;
 * scripts/check-roi-model.js asserts that.
 *
 * Pure functions only, no DOM, so the same file runs in the browser
 * (window.ROIModel) and in Node (the parity check).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ROIModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var YEARS = 5;
  var QUOTED_USERS = 25; // licensing schedule below is for this many users

  // Every input, with the deck's value as the default.
  var DEFAULTS = {
    // Shared inputs (each feeds several drivers)
    bdms: 20,
    revenuePerBdm: 2000000,
    grossMarginPct: 20,
    loadedCost: 95000,

    // Increase Revenue per BDM
    improvablePct: 50,
    revLiftPct: 10,

    // Increase Win Rate
    oppsPerBdmPerYear: 48, // 1 qualified opportunity a week x 48 weeks
    avgDealSize: 100000,
    winRatePct: 20,
    winLiftPct: 10,

    // Reduce New BDM Onboarding Time
    onboardingWeeks: 24,
    onboardingReductionPct: 15,
    newHiresPerYear: 6,

    // Increase BDM Productivity
    nonSellingPct: 40,
    productivityLiftPct: 15,

    // Increase Sales Team Efficiency
    planningTimePct: 5,
    efficiencyLiftPct: 15,

    // Investment
    users: QUOTED_USERS,
    ramp: [30, 70, 100, 100, 100], // percent of annual benefit realized, by year
    licensing: [105000, 118000, 126000, 139000, 156000], // at the quoted 25 users
    implementation: [117000, 15000, 7500, 7500, 7500],
    maintenance: [18000, 24000, 25000, 26000, 27000]
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function sum(arr) {
    return arr.reduce(function (a, b) {
      return a + b;
    }, 0);
  }

  // Annual value of each driver at 100% realization.
  function drivers(s) {
    var gm = num(s.grossMarginPct) / 100;
    var bdms = num(s.bdms);

    // Weekly sales per BDM is annual revenue per BDM over 52 weeks (the deck's $38,462).
    var weeklySales = num(s.revenuePerBdm) / 52;
    var weeksSaved = num(s.onboardingWeeks) * (num(s.onboardingReductionPct) / 100); // 3.6, shown as 4 in the deck
    var opps = bdms * num(s.oppsPerBdmPerYear);

    var list = [
      {
        key: 'revenuePerBdm',
        kind: 'profit',
        value:
          bdms *
          (num(s.improvablePct) / 100) *
          num(s.revenuePerBdm) *
          (num(s.revLiftPct) / 100) *
          gm
      },
      {
        key: 'winRate',
        kind: 'profit',
        value:
          opps *
          num(s.avgDealSize) *
          (num(s.winRatePct) / 100) *
          (num(s.winLiftPct) / 100) *
          gm
      },
      {
        key: 'onboarding',
        kind: 'profit',
        value: weeksSaved * weeklySales * num(s.newHiresPerYear) * gm
      },
      {
        key: 'productivity',
        kind: 'time',
        value:
          bdms *
          (num(s.nonSellingPct) / 100) *
          num(s.loadedCost) *
          (num(s.productivityLiftPct) / 100)
      },
      {
        key: 'efficiency',
        kind: 'time',
        value:
          bdms *
          (num(s.planningTimePct) / 100) *
          (num(s.efficiencyLiftPct) / 100) *
          num(s.loadedCost)
      }
    ];

    return {
      list: list,
      derived: { weeklySales: weeklySales, weeksSaved: weeksSaved, opps: opps }
    };
  }

  // Licensing scales linearly from the 25-user quote.
  function licensingFor(s) {
    var factor = num(s.users) / QUOTED_USERS;
    return s.licensing.map(function (v) {
      return num(v) * factor;
    });
  }

  function calculate(state) {
    var s = state;
    var d = drivers(s);
    var steady = sum(
      d.list.map(function (x) {
        return x.value;
      })
    );

    var licensing = licensingFor(s);
    var years = [];
    var cumBenefit = 0;
    var cumCost = 0;

    for (var i = 0; i < YEARS; i++) {
      var rampPct = num(s.ramp[i]);
      var benefit = steady * (rampPct / 100);
      var cost = licensing[i] + num(s.implementation[i]) + num(s.maintenance[i]);
      var net = benefit - cost;
      var benefitBefore = cumBenefit;
      cumBenefit += benefit;
      cumCost += cost;
      years.push({
        year: i + 1,
        rampPct: rampPct,
        benefit: benefit,
        licensing: licensing[i],
        implementation: num(s.implementation[i]),
        maintenance: num(s.maintenance[i]),
        cost: cost,
        net: net,
        cumBenefit: cumBenefit,
        cumCost: cumCost,
        cumNet: cumBenefit - cumCost,
        cumRoiPct: cumCost > 0 ? ((cumBenefit - cumCost) / cumCost) * 100 : 0,
        benefitBefore: benefitBefore
      });
    }

    var totals = {
      benefit: cumBenefit,
      cost: cumCost,
      net: cumBenefit - cumCost,
      roiPct: cumCost > 0 ? ((cumBenefit - cumCost) / cumCost) * 100 : 0
    };

    return {
      drivers: d.list,
      derived: d.derived,
      steadyState: steady,
      years: years,
      totals: totals,
      payback: payback(years)
    };
  }

  // Payback in months. Assumes each year's costs are paid up front and that
  // benefits accrue evenly through the year (a conservative reading of an annual
  // payment schedule). Returns null if costs are not recovered within five years.
  function payback(years) {
    for (var i = 0; i < years.length; i++) {
      var y = years[i];
      if (y.cumBenefit >= y.cumCost) {
        var remaining = y.cumCost - y.benefitBefore;
        var months;
        if (remaining <= 0) months = i * 12;
        else months = i * 12 + (12 * remaining) / y.benefit;
        return { months: months, year: i + 1 };
      }
    }
    return null;
  }

  return {
    YEARS: YEARS,
    QUOTED_USERS: QUOTED_USERS,
    DEFAULTS: DEFAULTS,
    clone: clone,
    calculate: calculate
  };
});
