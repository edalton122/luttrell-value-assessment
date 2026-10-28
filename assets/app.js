/* Luttrell Staffing x Salesforce microsite behavior.
   Page chrome (nav, progress, reveal), the ROI calculator UI, and the demo guide.
   All the math lives in roi-model.js. */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  // Where the "Watch the demo" button points. Swap this one line to move to an
  // embed, a Consensus Public Link, or a personalized link later.
  const DEMO_URL = 'https://play.goconsensus.com/be42d2d20';

  // Timestamps (mm:ss) from the October 20 demo transcript. Display only.
  const AGENDA = [
    ['02:22', 'Recap of what we heard and how Salesforce helps'],
    ['07:04', 'A customer example from a field-sales team'],
    ['08:49', 'The demo journey'],
    ['11:34', 'Home: metrics, follow-ups, rolling 12-month gross profit'],
    ['17:10', 'Leads: Kanban, guidance for success, activity timeline, convert'],
    ['22:29', 'One account view: contacts, opportunities, the relationship tree'],
    ['26:44', 'Q&A: data entry and ATS integration questions'],
    ['30:41', 'Conversation insights: call sentiment, talk ratio, summaries, the on-site recording'],
    ['35:00', 'Company-wide dashboard'],
    ['38:05', 'Programs: milestones and leading indicators'],
    ['44:22', 'Maps: target accounts, proximity, optimized schedule'],
    ['52:22', 'Mobile: route, AI record summary, check-in'],
    ['55:47', 'Program dashboard: outcome progress and testing targets'],
    ['57:44', 'Wrap-up and next steps']
  ];

  const FIND = [
    ['Deals tracked by contact', ['23:39', '25:46']],
    ['Unclear last touch', ['13:25', '19:49']],
    ['Unverified visits', ['53:29']],
    ['No ramp formula', ['40:09', '56:48']],
    ['Activity without insight', ['12:33', '55:47']],
    ['Reliance on data entry', ['31:40']],
    ['Lead intake', ['17:10']],
    ['High-level reporting', ['35:00']]
  ];

  // Input definitions. unit: 'usd' | 'pct' | 'num'. src: 'luttrell' | 'sf'.
  const FIELDS = {
    bdms: { label: 'Number of BDMs', unit: 'num', min: 5, max: 60, step: 1, src: 'luttrell', hint: 'Used in four of the five drivers.' },
    revenuePerBdm: { label: 'Annual revenue per BDM', unit: 'usd', min: 500000, max: 5000000, step: 50000, src: 'sf', hint: 'Also sets weekly sales per BDM (annual revenue divided by 52).' },
    grossMarginPct: { label: 'Gross margin', unit: 'pct', min: 5, max: 40, step: 1, src: 'sf', hint: 'Applied to the three gross-profit drivers.' },
    loadedCost: { label: 'Fully loaded cost per BDM', unit: 'usd', min: 50000, max: 200000, step: 5000, src: 'sf', hint: 'Values the time savings in the two time drivers.' },

    improvablePct: { label: 'BDMs with improvement potential', unit: 'pct', min: 0, max: 100, step: 5, src: 'sf' },
    revLiftPct: { label: 'Revenue lift from Salesforce', unit: 'pct', min: 0, max: 30, step: 1, src: 'sf' },

    oppsPerBdmPerYear: { label: 'Qualified opportunities per BDM per year', unit: 'num', min: 12, max: 120, step: 1, src: 'sf', hint: 'The deck assumes one a week over 48 weeks.' },
    avgDealSize: { label: 'Average deal size', unit: 'usd', min: 20000, max: 300000, step: 5000, src: 'sf' },
    winRatePct: { label: 'Current win rate', unit: 'pct', min: 5, max: 60, step: 1, src: 'sf' },
    winLiftPct: { label: 'Win-rate lift from Salesforce', unit: 'pct', min: 0, max: 40, step: 1, src: 'sf', bench: 30 },

    onboardingWeeks: { label: 'Weeks to onboard a new BDM', unit: 'num', suffix: 'wks', min: 8, max: 52, step: 1, src: 'sf' },
    onboardingReductionPct: { label: 'Reduction in onboarding time', unit: 'pct', min: 0, max: 50, step: 1, src: 'sf' },
    newHiresPerYear: { label: 'New BDMs hired per year', unit: 'num', min: 0, max: 20, step: 1, src: 'sf' },

    nonSellingPct: { label: 'Share of time on non-selling activities', unit: 'pct', min: 10, max: 80, step: 1, src: 'sf', hint: 'A deliberately conservative starting point.' },
    productivityLiftPct: { label: 'Time recovered with Salesforce', unit: 'pct', min: 0, max: 40, step: 1, src: 'sf', bench: 30 },

    planningTimePct: { label: 'Time on sales planning, activity reporting, and commissions', unit: 'pct', min: 0, max: 20, step: 1, src: 'sf' },
    efficiencyLiftPct: { label: 'Time recovered with Salesforce', unit: 'pct', min: 0, max: 40, step: 1, src: 'sf' },

    users: { label: 'Licensed users', unit: 'num', min: 10, max: 40, step: 1, src: 'sf' }
  };

  const DRIVERS = [
    {
      key: 'revenuePerBdm',
      title: 'Increase Revenue per BDM',
      kind: 'profit',
      blurb: 'More revenue from each BDM\u2019s book, through visits that are verified and planned and follow-ups that don\u2019t slip.',
      fields: ['improvablePct', 'revLiftPct']
    },
    {
      key: 'winRate',
      title: 'Increase Win Rate',
      kind: 'profit',
      blurb: 'More of the pipeline closes, with stage guidance and a clear read on the health of each deal.',
      fields: ['oppsPerBdmPerYear', 'avgDealSize', 'winRatePct', 'winLiftPct']
    },
    {
      key: 'onboarding',
      title: 'Reduce New BDM Onboarding Time',
      kind: 'profit',
      blurb: 'New BDMs reach full productivity sooner, with the qualification standard and the full account history in one place.',
      fields: ['onboardingWeeks', 'onboardingReductionPct', 'newHiresPerYear']
    },
    {
      key: 'productivity',
      title: 'Increase BDM Productivity',
      kind: 'time',
      blurb: 'Less time on non-selling work: talk-don\u2019t-type meeting capture, summaries, and next steps pulled out for you.',
      fields: ['nonSellingPct', 'productivityLiftPct']
    },
    {
      key: 'efficiency',
      title: 'Increase Sales Team Efficiency',
      kind: 'time',
      blurb: 'Less time on sales planning, activity reporting, and commission tracking.',
      fields: ['planningTimePct', 'efficiencyLiftPct']
    }
  ];

  const SCHEDULES = [
    { key: 'licensing', label: 'Licensing', sub: 'per year at 25 users', unit: 'usd', step: 1000 },
    { key: 'implementation', label: 'Implementation', sub: 'one-time, then support', unit: 'usd', step: 500 },
    { key: 'maintenance', label: 'Maintenance and support', sub: 'per year', unit: 'usd', step: 500 },
    { key: 'ramp', label: 'Benefit ramp', sub: '% of annual benefit realized', unit: 'pct', step: 5 }
  ];

  const SEGMENT_COLORS = ['#0F1941', '#323366', '#5B5E9B', '#9D1B20', '#C9686C'];

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  const nf = new Intl.NumberFormat('en-US');
  const usd = (n) => (n < 0 ? '-$' : '$') + nf.format(Math.round(Math.abs(n)));
  const trim = (n, d) => String(+Number(n).toFixed(d));

  function compact(n) {
    const a = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (a >= 1e6) return sign + '$' + trim(a / 1e6, 2) + 'M';
    if (a >= 1e3) return sign + '$' + trim(a / 1e3, 1) + 'K';
    return sign + '$' + Math.round(a);
  }

  const pct = (n) => trim(n, 1) + '%';

  function paybackText(p, short) {
    if (!p) return short ? 'Beyond Year 5' : 'beyond Year 5';
    const m = Math.round(p.months);
    if (m < 1) return short ? 'Under 1 month' : 'in under a month';
    return short ? m + ' months' : 'about ' + m + ' months';
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // ---------------------------------------------------------------------------
  // Page chrome: reveal, nav, progress
  // ---------------------------------------------------------------------------

  function initChrome() {
    const revealEls = $$('.reveal');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('in'));
    }
    // Safety net so content can never stay hidden.
    setTimeout(() => revealEls.forEach((el) => el.classList.add('in')), 4000);

    const toggle = $('#navtoggle');
    const links = $('#navlinks');
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('a', links).forEach((a) =>
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );

    const bar = $('#progress');
    const sections = ['overview', 'roi', 'demo', 'contact'].map((id) => document.getElementById(id));
    const navLinks = $$('#navlinks a');
    let ticking = false;

    function onScroll() {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';

      let current = null;
      sections.forEach((s) => {
        if (s && s.getBoundingClientRect().top <= 140) current = s.id;
      });
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
    }

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );
    onScroll();
  }

  // ---------------------------------------------------------------------------
  // Demo section
  // ---------------------------------------------------------------------------

  function initDemo() {
    ['#demo-poster', '#demo-button'].forEach((sel) => {
      $(sel).setAttribute('href', DEMO_URL);
    });

    $('#agenda-list').innerHTML = AGENDA.map(
      (a) => '<li><span class="ts">' + a[0] + '</span><span>' + a[1] + '</span></li>'
    ).join('');

    $('#find-list').innerHTML = FIND.map(
      (f) =>
        '<li><span>' +
        f[0] +
        '</span><span class="times">' +
        f[1].map((t) => '<span class="ts">' + t + '</span>').join('') +
        '</span></li>'
    ).join('');
  }

  // ---------------------------------------------------------------------------
  // Calculator
  // ---------------------------------------------------------------------------

  function initCalculator() {
    const M = window.ROIModel;
    let state = M.clone(M.DEFAULTS);

    const left = $('#calc-left');
    const right = $('#calc-right');

    // ----- Build the left column once -----
    function fieldHTML(id) {
      const f = FIELDS[id];
      const tag =
        f.src === 'luttrell'
          ? '<span class="tag luttrell">Luttrell provided</span>'
          : '<span class="tag">Salesforce estimate, please confirm</span>';
      const prefix = f.unit === 'usd' ? '<span class="u">$</span>' : '';
      const suffix = f.unit === 'pct' ? '<span class="u">%</span>' : f.suffix ? '<span class="u">' + f.suffix + '</span>' : '';
      let bench = '';
      let benchLabel = '';
      if (f.bench) {
        const p = ((f.bench - f.min) / (f.max - f.min)) * 100;
        bench = '<span class="bench" style="left:calc(' + p + '% + ' + ((0.5 - p / 100) * 18).toFixed(2) + 'px)"></span>';
        benchLabel = '<div class="bench-label">Dashed line: Salesforce customer benchmark (' + f.bench + '%). The starting value is set well below it.</div>';
      }
      return (
        '<div class="field" data-field="' + id + '">' +
        '<div class="top"><label for="n-' + id + '">' + f.label + '</label>' + tag + '</div>' +
        '<div class="control">' +
        '<div class="rangewrap"><input type="range" id="r-' + id + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" aria-label="' + f.label + ' slider" />' + bench + '</div>' +
        '<div class="numbox">' + prefix + '<input type="number" id="n-' + id + '" inputmode="decimal" step="any" min="0" />' + suffix + '</div>' +
        '</div>' +
        benchLabel +
        (f.hint ? '<div class="hint">' + f.hint + '</div>' : '') +
        '</div>'
      );
    }

    const shared =
      '<article class="card" id="card-shared">' +
      '<div class="card-head"><div><span class="badge slate">Start here</span><h3>Your team</h3>' +
      '<p class="blurb">These four inputs feed several drivers, so you only enter them once.</p></div></div>' +
      '<div class="fields">' + ['bdms', 'revenuePerBdm', 'grossMarginPct', 'loadedCost'].map(fieldHTML).join('') + '</div></article>';

    const driverCards = DRIVERS.map((d, i) =>
      '<article class="card" data-driver="' + d.key + '">' +
      '<div class="card-head"><div><span class="badge ' + (d.kind === 'time' ? 'time' : '') + '">' +
      (d.kind === 'time' ? 'Time savings' : 'Gross profit') + '</span><h3>' + (i + 1) + '. ' + d.title + '</h3>' +
      '<p class="blurb">' + d.blurb + '</p></div>' +
      '<div class="card-value"><div class="v" data-v></div><div class="s" data-s></div></div></div>' +
      '<div class="formula" data-f></div>' +
      '<div class="fields">' + d.fields.map(fieldHTML).join('') + '</div></article>'
    ).join('');

    const schedHead =
      '<div class="sched-row head"><span></span>' + [1, 2, 3, 4, 5].map((y) => '<span>Year ' + y + '</span>').join('') + '</div>';
    const schedRows = SCHEDULES.map((s) =>
      '<div class="sched-row"><div class="rl">' + s.label + '<small>' + s.sub + '</small></div>' +
      [0, 1, 2, 3, 4].map((i) =>
        '<div class="numbox">' + (s.unit === 'usd' ? '<span class="u">$</span>' : '') +
        '<input type="number" step="any" min="0" inputmode="decimal" data-sched="' + s.key + '" data-idx="' + i + '" aria-label="' + s.label + ', year ' + (i + 1) + '" />' +
        (s.unit === 'pct' ? '<span class="u">%</span>' : '') + '</div>'
      ).join('') + '</div>'
    ).join('');

    const investment =
      '<article class="card" id="card-invest">' +
      '<div class="card-head"><div><span class="badge red">Investment</span><h3>Licensing, implementation, and ramp</h3>' +
      '<p class="blurb">Starts from the proposal reviewed on October 28: Sales Cloud Core Edition, Maps, Enablement, and Agentforce for Sales at 25 users on Anytime pricing, plus implementation. Edit any cell.</p></div>' +
      '<div class="card-value"><div class="v" data-inv-v></div><div class="s">5-year investment</div></div></div>' +
      '<div class="stepper"><div class="lbl">Licensed users<small data-lic-note></small></div>' +
      '<div><div class="numbox"><input type="number" id="n-users" step="1" min="0" inputmode="numeric" aria-label="Licensed users" /></div></div></div>' +
      '<div class="rangewrap" style="padding:0 26px 14px"><input type="range" id="r-users" min="' + FIELDS.users.min + '" max="' + FIELDS.users.max + '" step="1" aria-label="Licensed users slider" /></div>' +
      '<div class="sched">' + schedHead + schedRows + '</div>' +
      '<p class="inv-note">The quote is for 25 users and the discount tier holds for 23 to 25 users. Outside that range pricing may differ, so licensing here simply scales with the number of users. The business case rounds the $105,690 annual quote to $105,000.</p>' +
      '</article>';

    left.innerHTML = shared + driverCards + investment;

    // ----- Wire inputs -----
    function hardMax(f) {
      return f.unit === 'pct' ? 100 : f.max * 2;
    }

    function setRangeFill(r) {
      const min = +r.min;
      const max = +r.max;
      const p = Math.max(0, Math.min(100, ((+r.value - min) / (max - min)) * 100));
      r.style.setProperty('--pct', p + '%');
    }

    function syncField(id) {
      const r = $('#r-' + id);
      const n = $('#n-' + id);
      if (r) {
        r.value = state[id];
        setRangeFill(r);
      }
      if (n && document.activeElement !== n) n.value = trim(state[id], 2);
    }

    function wireField(id) {
      const f = FIELDS[id];
      const r = $('#r-' + id);
      const n = $('#n-' + id);
      r.addEventListener('input', () => {
        state[id] = +r.value;
        syncField(id);
        update();
      });
      n.addEventListener('input', () => {
        if (n.value === '') return;
        let v = parseFloat(n.value);
        if (!isFinite(v)) return;
        v = Math.max(0, Math.min(hardMax(f), v));
        state[id] = v;
        r.value = v;
        setRangeFill(r);
        update();
      });
      n.addEventListener('blur', () => {
        n.value = trim(state[id], 2);
      });
    }

    Object.keys(FIELDS).forEach((id) => {
      if ($('#r-' + id)) wireField(id);
    });

    $$('[data-sched]', left).forEach((inp) => {
      inp.addEventListener('input', () => {
        const k = inp.getAttribute('data-sched');
        const i = +inp.getAttribute('data-idx');
        let v = parseFloat(inp.value);
        if (!isFinite(v)) return;
        v = Math.max(0, k === 'ramp' ? Math.min(100, v) : v);
        state[k][i] = v;
        update();
      });
      inp.addEventListener('blur', () => {
        inp.value = trim(state[inp.getAttribute('data-sched')][+inp.getAttribute('data-idx')], 2);
      });
    });

    function syncAllInputs() {
      Object.keys(FIELDS).forEach((id) => {
        if ($('#r-' + id)) syncField(id);
      });
      $$('[data-sched]', left).forEach((inp) => {
        inp.value = trim(state[inp.getAttribute('data-sched')][+inp.getAttribute('data-idx')], 2);
      });
    }

    // ----- Renderers -----
    function formulaFor(key, s, r) {
      const b = (t) => '<b>' + t + '</b>';
      const d = r.derived;
      switch (key) {
        case 'revenuePerBdm':
          return [b(s.bdms) + ' BDMs', b(pct(s.improvablePct)) + ' with potential', b(usd(s.revenuePerBdm)) + ' revenue each', b(pct(s.revLiftPct)) + ' lift', b(pct(s.grossMarginPct)) + ' margin'].join(' \u00d7 ');
        case 'winRate':
          return [b(nf.format(Math.round(d.opps))) + ' opportunities', b(usd(s.avgDealSize)) + ' deal size', b(pct(s.winRatePct)) + ' win rate', b(pct(s.winLiftPct)) + ' lift', b(pct(s.grossMarginPct)) + ' margin'].join(' \u00d7 ');
        case 'onboarding':
          return [b(trim(s.onboardingWeeks, 1)) + ' weeks \u00d7 ' + b(pct(s.onboardingReductionPct)) + ' = ' + b(trim(d.weeksSaved, 1)) + ' weeks sooner', b(usd(d.weeklySales)) + ' weekly sales', b(trim(s.newHiresPerYear, 1)) + ' new BDMs', b(pct(s.grossMarginPct)) + ' margin'].join(' \u00d7 ');
        case 'productivity':
          return [b(s.bdms) + ' BDMs', b(pct(s.nonSellingPct)) + ' non-selling time', b(usd(s.loadedCost)) + ' loaded cost', b(pct(s.productivityLiftPct)) + ' recovered'].join(' \u00d7 ');
        case 'efficiency':
          return [b(s.bdms) + ' BDMs', b(pct(s.planningTimePct)) + ' of time', b(usd(s.loadedCost)) + ' loaded cost', b(pct(s.efficiencyLiftPct)) + ' recovered'].join(' \u00d7 ');
        default:
          return '';
      }
    }

    function renderDrivers(r) {
      r.drivers.forEach((d) => {
        const card = $('[data-driver="' + d.key + '"]', left);
        if (!card) return;
        $('[data-v]', card).textContent = usd(d.value);
        $('[data-s]', card).textContent = (r.steadyState > 0 ? Math.round((d.value / r.steadyState) * 100) : 0) + '% of annual benefit';
        $('[data-f]', card).innerHTML = formulaFor(d.key, state, r) + ' <b>=</b> <b>' + usd(d.value) + '</b>';
      });
      $('[data-inv-v]', left).textContent = compact(r.totals.cost);
      $('[data-lic-note]', left).textContent =
        'Year 1 licensing at ' + trim(state.users, 1) + ' users: ' + usd(r.years[0].licensing) +
        (state.users > 0 ? ' (' + usd(r.years[0].licensing / state.users) + ' per user)' : '');
    }

    function chartSVG(years) {
      const W = 560, H = 200, padT = 22, padB = 28, padX = 8;
      const max = Math.max.apply(null, years.map((y) => Math.max(y.benefit, y.cost, 1)));
      const gw = (W - padX * 2) / years.length;
      const bw = Math.min(34, gw * 0.3);
      const base = H - padB;
      const ch = base - padT;
      let out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bar chart of benefit and investment by year">';
      out += '<line x1="' + padX + '" y1="' + base + '" x2="' + (W - padX) + '" y2="' + base + '" stroke="#C9C9C9"/>';
      years.forEach((y, i) => {
        const cx = padX + gw * i + gw / 2;
        const bh = (y.benefit / max) * ch;
        const kh = (y.cost / max) * ch;
        out += '<rect x="' + (cx - bw - 3) + '" y="' + (base - bh) + '" width="' + bw + '" height="' + bh + '" fill="#0F1941"/>';
        out += '<rect x="' + (cx + 3) + '" y="' + (base - kh) + '" width="' + bw + '" height="' + kh + '" fill="#9D1B20"/>';
        out += '<text x="' + (cx - bw / 2 - 3) + '" y="' + (base - bh - 6) + '" font-size="10.5" text-anchor="middle" fill="#0F1941" font-family="Poppins,sans-serif" font-weight="600">' + compact(y.benefit) + '</text>';
        out += '<text x="' + (cx + bw / 2 + 3) + '" y="' + (base - kh - 6) + '" font-size="10.5" text-anchor="middle" fill="#9D1B20" font-family="Poppins,sans-serif" font-weight="600">' + compact(y.cost) + '</text>';
        out += '<text x="' + cx + '" y="' + (H - 9) + '" font-size="12" text-anchor="middle" fill="#54595F" font-family="Poppins,sans-serif">Year ' + y.year + '</text>';
      });
      return out + '</svg>';
    }

    function renderResults(r) {
      const t = r.totals;
      const total = r.steadyState;
      const stack = r.drivers
        .map((d, i) => '<span style="width:' + (total > 0 ? (d.value / total) * 100 : 0) + '%;background:' + SEGMENT_COLORS[i] + '" title="' + DRIVERS[i].title + '"></span>')
        .join('');
      const legend = r.drivers
        .map(
          (d, i) =>
            '<li><span class="dot" style="background:' + SEGMENT_COLORS[i] + '"></span><span>' + DRIVERS[i].title + '</span>' +
            '<span class="amt">' + compact(d.value) + '</span><span class="pc">' + (total > 0 ? Math.round((d.value / total) * 100) : 0) + '%</span></li>'
        )
        .join('');

      right.innerHTML =
        '<div class="result-main">' +
        '<button type="button" class="reset" id="reset-btn" title="Restore every input to the pricing-review deck values">Reset to deck values</button>' +
        '<div class="k">Annual benefit at full ramp</div>' +
        '<div class="big">' + compact(r.steadyState) + '</div>' +
        '<div class="sub">All five drivers, from Year 3 on</div>' +
        '<div class="mini-grid">' +
        '<div class="mini"><div class="v">' + Math.round(t.roiPct) + '%</div><div class="l">5-year ROI</div></div>' +
        '<div class="mini"><div class="v">' + paybackText(r.payback, true) + '</div><div class="l">Payback on the investment</div></div>' +
        '<div class="mini"><div class="v">' + compact(t.benefit) + '</div><div class="l">5-year total benefits</div></div>' +
        '<div class="mini"><div class="v">' + compact(t.cost) + '</div><div class="l">5-year total investment</div></div>' +
        '<div class="mini"><div class="v">' + compact(t.net) + '</div><div class="l">5-year net benefit</div></div>' +
        '<div class="mini"><div class="v">' + compact(r.years[0].net) + '</div><div class="l">Year 1 net benefit</div></div>' +
        '</div></div>' +
        '<div class="panel"><h4>Where the benefit comes from</h4><div class="stack">' + stack + '</div><ul class="legend">' + legend + '</ul></div>' +
        '<div class="panel chart"><h4>Benefit and investment by year</h4>' + chartSVG(r.years) +
        '<div class="chart-legend"><span><i style="background:#0F1941"></i>Benefit</span><span><i style="background:#9D1B20"></i>Investment</span></div></div>';

      $('#reset-btn').addEventListener('click', () => {
        state = M.clone(M.DEFAULTS);
        syncAllInputs();
        update();
      });
    }

    function renderTable(r) {
      const cols = r.years;
      const row = (label, cells, total, cls) =>
        '<tr class="' + (cls || '') + '"><td>' + label + '</td>' +
        cells.map((c) => '<td class="' + (c.cls || '') + '">' + c.t + '</td>').join('') +
        '<td class="tot">' + total + '</td></tr>';
      const money = (arr) => arr.map((v) => ({ t: usd(v) }));
      const t = r.totals;
      const sumOf = (k) => cols.reduce((a, y) => a + y[k], 0);

      $('#years-table').innerHTML =
        '<table class="years"><thead><tr><th></th>' + cols.map((y) => '<th>Year ' + y.year + '</th>').join('') + '<th>5-year</th></tr></thead><tbody>' +
        row('Share of annual benefit realized', cols.map((y) => ({ t: trim(y.rampPct, 1) + '%' })), '\u2014', 'sub') +
        row('Total benefits', money(cols.map((y) => y.benefit)), usd(t.benefit)) +
        row('Licensing', money(cols.map((y) => y.licensing)), usd(sumOf('licensing')), 'sub') +
        row('Implementation', money(cols.map((y) => y.implementation)), usd(sumOf('implementation')), 'sub') +
        row('Maintenance and support', money(cols.map((y) => y.maintenance)), usd(sumOf('maintenance')), 'sub') +
        row('Total investment', money(cols.map((y) => y.cost)), usd(t.cost), 'total') +
        row('Net benefit', cols.map((y) => ({ t: usd(y.net), cls: y.net >= 0 ? 'pos' : 'neg' })), usd(t.net), 'total') +
        row('Cumulative ROI', cols.map((y) => ({ t: Math.round(y.cumRoiPct) + '%' })), Math.round(t.roiPct) + '%') +
        '</tbody></table>';

      $('#payback-note').textContent =
        'Payback: ' + paybackText(r.payback, false) +
        '. This assumes each year\u2019s costs are paid up front and benefits arrive evenly through the year.';
    }

    function renderMobile(r) {
      $('#mb-benefit').textContent = compact(r.steadyState);
      $('#mb-roi').textContent = Math.round(r.totals.roiPct) + '%';
    }

    function update() {
      const r = M.calculate(state);
      renderDrivers(r);
      renderResults(r);
      renderTable(r);
      renderMobile(r);
    }

    // Mobile results bar: only while the calculator is on screen.
    const bar = $('#mobile-bar');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (entries) => entries.forEach((e) => bar.classList.toggle('show', e.isIntersecting)),
        { threshold: 0.05 }
      ).observe($('#calc'));
    }

    syncAllInputs();
    update();
  }

  // ---------------------------------------------------------------------------
  // Hero KPI tiles: computed from the model's defaults, not hard-coded.
  // ---------------------------------------------------------------------------

  function initKpis() {
    const M = window.ROIModel;
    const r = M.calculate(M.clone(M.DEFAULTS));
    const underYear = r.payback && r.payback.months < 12;
    const tiles = [
      ['$' + (r.steadyState / 1e6).toFixed(1) + 'M', 'Annual benefit at steady state'],
      [Math.round(r.totals.roiPct) + '%', '5-year ROI'],
      [r.payback ? 'Year ' + r.payback.year : 'Beyond Year 5', 'Payback on the investment' + (underYear ? ' (under 12 months)' : '')],
      ['$' + Math.round(r.totals.cost / 1e3) + 'K', '5-year investment, all-in']
    ];
    $('#kpi-grid').innerHTML = tiles
      .map((t) => '<div class="kpi"><div class="num">' + t[0] + '</div><div class="lbl">' + t[1] + '</div></div>')
      .join('');
  }

  // ---------------------------------------------------------------------------
  // Boot. Each piece is isolated so one failure can't blank the page.
  // ---------------------------------------------------------------------------

  [initChrome, initDemo, initKpis, initCalculator].forEach((fn) => {
    try {
      fn();
    } catch (err) {
      if (window.console) console.error(fn.name, err);
    }
  });
})();
