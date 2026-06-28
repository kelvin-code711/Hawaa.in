/* ========================================
   HAWAA vs RIVALS — Comparison Data
   Unified metric schema so every column aligns
   row-for-row (Mila-style). Hawaa values are the
   fixed baseline; each rival supplies its own values.
   Rival keys match VERDICT_DATA in comparison-vs.js.
======================================== */
(function () {
    'use strict';

    var R = '₹';
    var M3 = 'm³';

    /* Ordered metric groups — identical for every column */
    var METRICS = [
        { group: 'PRICE', rows: [
            { key: 'devicePrice', label: 'Device Price' },
            { key: 'filterPrice', label: 'Filter Price', sub: '(per replacement)' }
        ] },
        { group: 'PERFORMANCE', rows: [
            { key: 'cadr', label: 'CADR' },
            { key: 'coverage', label: 'Coverage' },
            { key: 'filterGrade', label: 'Filter Grade' },
            { key: 'motor', label: 'Motor Type' },
            { key: 'noise', label: 'Noise', sub: '(Sleep Mode)' }
        ] },
        { group: 'SMART CONTROL', rows: [
            { key: 'smart', label: 'Smart Control' },
            { key: 'voice', label: 'Voice Commands' },
            { key: 'scheduling', label: 'Scheduling' },
            { key: 'extraApp', label: 'Extra App Required' }
        ] },
        { group: '5-YEAR OWNERSHIP COST', rows: [
            { key: 'costDevice', label: 'Device' },
            { key: 'costFilters', label: 'Filters (5-yr)' },
            { key: 'costTotal', label: 'Total (5-yr)', total: true }
        ] }
    ];

    /* Hawaa Edge — fixed baseline values shown in the left panel */
    var HAWAA = {
        brand: 'Hawaa',
        model: 'Edge',
        values: {
            devicePrice: R + '6,000',
            filterPrice: R + '999',
            cadr: '250 ' + M3 + '/hr',
            coverage: '300 sq ft',
            filterGrade: 'H13 HEPA',
            motor: 'BLDC',
            noise: '28 dB',
            smart: 'Google Home + Alexa',
            voice: 'Yes',
            scheduling: 'Yes, via Google Home',
            extraApp: 'No',
            costDevice: R + '6,000',
            costFilters: R + '7,992',
            costTotal: R + '13,992'
        }
    };

    /* state (s): rival's standing vs Hawaa — 'win' | 'lose' | 'neutral' */
    var RIVALS = [
        {
            key: 'honeywell', brand: 'Honeywell', model: 'Air Touch V1',
            values: {
                devicePrice: { v: R + '4,830', s: 'win' },
                filterPrice: { v: R + '1,700', s: 'lose' },
                cadr: { v: '152 ' + M3 + '/hr', s: 'lose' },
                coverage: { v: '235 sq ft', s: 'lose' },
                filterGrade: { v: 'H13 HEPA', s: 'neutral' },
                motor: { v: 'Standard AC', s: 'lose' },
                noise: { v: '29 dB', s: 'lose' },
                smart: { v: 'None', s: 'lose' },
                voice: { v: 'No', s: 'lose' },
                scheduling: { v: 'No', s: 'lose' },
                extraApp: { v: 'No', s: 'neutral' },
                costDevice: { v: R + '4,830', s: 'win' },
                costFilters: { v: R + '13,600', s: 'lose' },
                costTotal: { v: R + '18,430', s: 'lose' }
            },
            save: 'You save <strong>' + R + '5,230</strong> over 5 years with Hawaa Edge',
            verdictLine: 'Hawaa Edge wins on CADR, coverage, smart control, and 5-year cost. The only trade-off is ' + R + '1,170 more upfront.'
        },
        {
            key: 'honeywell-v2', brand: 'Honeywell', model: 'Air Touch V2',
            values: {
                devicePrice: { v: R + '7,299', s: 'lose' },
                filterPrice: { v: R + '2,479', s: 'lose' },
                cadr: { v: '250 ' + M3 + '/hr', s: 'neutral' },
                coverage: { v: '388 sq ft', s: 'neutral' },
                filterGrade: { v: 'H13 HEPA', s: 'neutral' },
                motor: { v: 'Standard AC', s: 'lose' },
                noise: { v: '~35 dB', s: 'lose' },
                smart: { v: 'None', s: 'lose' },
                voice: { v: 'No', s: 'lose' },
                scheduling: { v: 'No', s: 'lose' },
                extraApp: { v: 'No', s: 'neutral' },
                costDevice: { v: R + '7,299', s: 'lose' },
                costFilters: { v: R + '19,832', s: 'lose' },
                costTotal: { v: R + '27,131', s: 'lose' }
            },
            save: 'You save <strong>' + R + '13,139</strong> over 5 years — for identical CADR',
            verdictLine: 'Same CADR. Lower price. BLDC motor. Built-in smart control. The V2 costs more upfront, runs louder, and its filters cost nearly 2.5x more.'
        },
        {
            key: 'philips', brand: 'Philips', model: 'AC0920',
            values: {
                devicePrice: { v: R + '9,995', s: 'lose' },
                filterPrice: { v: R + '1,920', s: 'lose' },
                cadr: { v: '250 ' + M3 + '/hr', s: 'neutral' },
                coverage: { v: '300 sq ft', s: 'neutral' },
                filterGrade: { v: 'H13 HEPA', s: 'neutral' },
                motor: { v: 'Standard', s: 'lose' },
                noise: { v: '~33 dB', s: 'lose' },
                smart: { v: 'Philips Air+ App', s: 'lose' },
                voice: { v: 'Limited', s: 'lose' },
                scheduling: { v: 'Yes, via app', s: 'lose' },
                extraApp: { v: 'Yes — Air+ App', s: 'lose' },
                costDevice: { v: R + '9,995', s: 'lose' },
                costFilters: { v: R + '15,360', s: 'lose' },
                costTotal: { v: R + '25,355', s: 'lose' }
            },
            save: 'You save <strong>' + R + '11,363</strong> over 5 years — for air that is equally clean',
            verdictLine: 'Identical CADR. Identical coverage. Same filter grade. The Philips costs ' + R + '3,995 more upfront, runs louder, and locks smart features behind a proprietary app.'
        },
        {
            key: 'levoit', brand: 'Levoit', model: 'Core 300',
            values: {
                devicePrice: { v: '~' + R + '9,000', s: 'lose' },
                filterPrice: { v: R + '3,000', s: 'lose' },
                cadr: { v: '240 ' + M3 + '/hr', s: 'lose' },
                coverage: { v: '220 sq ft', s: 'lose' },
                filterGrade: { v: 'H13 HEPA', s: 'neutral' },
                motor: { v: 'Standard AC', s: 'lose' },
                noise: { v: '24 dB', s: 'win' },
                smart: { v: 'None (base model)', s: 'lose' },
                voice: { v: 'No', s: 'lose' },
                scheduling: { v: 'No', s: 'lose' },
                extraApp: { v: 'No', s: 'neutral' },
                costDevice: { v: R + '9,000', s: 'lose' },
                costFilters: { v: R + '24,000', s: 'lose' },
                costTotal: { v: R + '33,000', s: 'lose' }
            },
            save: 'You save <strong>' + R + '19,008</strong> over 5 years',
            verdictLine: 'The Core 300 was engineered for Western room sizes. Its 220 sq ft coverage leaves a standard Indian bedroom outside its rated zone. The Edge costs ' + R + '3,000 less and covers 80 sq ft more.'
        },
        {
            key: 'levoit-mini', brand: 'Levoit', model: 'Core Mini',
            values: {
                devicePrice: { v: '~' + R + '5,000', s: 'win' },
                filterPrice: { v: R + '1,999', s: 'lose' },
                cadr: { v: '~100 ' + M3 + '/hr', s: 'lose' },
                coverage: { v: '183 sq ft', s: 'lose' },
                filterGrade: { v: 'H13 HEPA', s: 'neutral' },
                motor: { v: 'Standard', s: 'lose' },
                noise: { v: '~25 dB', s: 'win' },
                smart: { v: 'None', s: 'lose' },
                voice: { v: 'No', s: 'lose' },
                scheduling: { v: 'No', s: 'lose' },
                extraApp: { v: 'No', s: 'neutral' },
                costDevice: { v: R + '5,000', s: 'win' },
                costFilters: { v: R + '15,992', s: 'lose' },
                costTotal: { v: R + '20,992', s: 'lose' }
            },
            save: 'You save <strong>' + R + '7,000</strong> over 5 years — and get 2.5x the CADR',
            verdictLine: 'The Core Mini costs ' + R + '1,000 less upfront. That is where its advantages end. Its ~100 ' + M3 + '/hr CADR is built for personal spaces — not a standard Indian bedroom.'
        },
        {
            key: 'qubo', brand: 'Qubo', model: 'Q200',
            values: {
                devicePrice: { v: R + '12,990', s: 'lose' },
                filterPrice: { v: R + '1,590', s: 'lose' },
                cadr: { v: '~150 ' + M3 + '/hr', s: 'lose' },
                coverage: { v: '200 sq ft', s: 'lose' },
                filterGrade: { v: 'H13 HEPA', s: 'neutral' },
                motor: { v: 'BLDC', s: 'neutral' },
                noise: { v: '—', s: 'neutral' },
                smart: { v: 'Qubo App + Alexa', s: 'lose' },
                voice: { v: 'Yes', s: 'neutral' },
                scheduling: { v: 'Yes, via app', s: 'lose' },
                extraApp: { v: 'Yes — Qubo App', s: 'lose' },
                costDevice: { v: R + '12,990', s: 'lose' },
                costFilters: { v: R + '12,720', s: 'lose' },
                costTotal: { v: R + '25,710', s: 'lose' }
            },
            save: 'You save <strong>' + R + '11,718</strong> over 5 years — and get 67% more CADR',
            verdictLine: 'The Q200 costs 2.2x more to deliver 40% less cleaning power. Both have BLDC motors. Both support voice control. The Edge does it without another app.'
        },
        {
            key: 'winix', brand: 'Winix', model: 'A231',
            values: {
                devicePrice: { v: '~' + R + '18,000+', s: 'lose' },
                filterPrice: { v: R + '2,999', s: 'lose' },
                cadr: { v: '~252 ' + M3 + '/hr', s: 'neutral' },
                coverage: { v: '222 sq ft', s: 'lose' },
                filterGrade: { v: 'True HEPA + PlasmaWave', s: 'neutral' },
                motor: { v: 'Standard', s: 'lose' },
                noise: { v: '—', s: 'neutral' },
                smart: { v: 'None', s: 'lose' },
                voice: { v: 'No', s: 'lose' },
                scheduling: { v: 'No', s: 'lose' },
                extraApp: { v: 'No', s: 'neutral' },
                costDevice: { v: R + '18,000', s: 'lose' },
                costFilters: { v: R + '23,992', s: 'lose' },
                costTotal: { v: R + '41,992', s: 'lose' }
            },
            save: 'You save <strong>' + R + '28,000</strong> over 5 years',
            verdictLine: 'Same CADR. Larger coverage. Native smart home integration. ' + R + '28,000 cheaper over five years. The A231 lacks official India distribution and after-sales support.'
        },
        {
            key: 'dyson', brand: 'Dyson', model: 'HushJet',
            values: {
                devicePrice: { v: R + '29,900', s: 'lose' },
                filterPrice: { v: '5-year filter*', s: 'win' },
                cadr: { v: '250 ' + M3 + '/hr', s: 'neutral' },
                coverage: { v: '~300 sq ft', s: 'neutral' },
                filterGrade: { v: 'Electrostatic 99.97%', s: 'neutral' },
                motor: { v: 'Dyson Compressor', s: 'neutral' },
                noise: { v: '24 dB', s: 'win' },
                smart: { v: 'MyDyson + Alexa + Google', s: 'neutral' },
                voice: { v: 'Yes', s: 'neutral' },
                scheduling: { v: 'Yes, via MyDyson', s: 'neutral' },
                extraApp: { v: 'Yes — MyDyson App', s: 'lose' },
                costDevice: { v: R + '29,900', s: 'lose' },
                costFilters: { v: R + '0*', s: 'win' },
                costTotal: { v: R + '29,900', s: 'lose' }
            },
            save: 'You save <strong>' + R + '15,908</strong> over 5 years',
            footnote: '*Dyson’s electrostatic filter is rated for 5 years at 12 hrs/day in standard conditions. In Indian environments with heavy PM2.5, cooking smoke, and incense, real-world filter life may vary. Dyson does not publish India-specific filter degradation data.',
            verdictLine: 'Both deliver 250 ' + M3 + '/hr CADR to the same room size. The air that comes out is equally clean. The question is what the ' + R + '23,900 difference means to you.'
        }
    ];

    window.HAWAA_COMPARE = { metrics: METRICS, hawaa: HAWAA, rivals: RIVALS };
})();
