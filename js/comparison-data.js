/* ========================================
   HAWAA vs RIVALS — Comparison Data
   Single source of truth for the comparison card.
   Ordered list; each entry renders one rival.
   Keys match VERDICT_DATA in comparison-vs.js.
======================================== */
(function () {
    'use strict';

    var R = '₹';      // rupee
    var M3 = 'm³';    // cubic metres

    window.HAWAA_RIVALS = [
        {
            key: 'honeywell',
            brand: 'Honeywell',
            model: 'Air Touch V1',
            groups: [
                { label: 'PRICE', rows: [
                    { m: 'Device Price', h: R + '6,000', hs: 'lose', r: R + '4,830', rs: 'win' },
                    { m: 'Filter Price', sub: '(per replacement)', h: R + '999', hs: 'win', r: R + '1,700', rs: 'lose' }
                ] },
                { label: 'PERFORMANCE', rows: [
                    { m: 'CADR', h: '250 ' + M3 + '/hr', hs: 'win', r: '152 ' + M3 + '/hr', rs: 'lose' },
                    { m: 'Coverage', h: '300 sq ft', hs: 'win', r: '235 sq ft', rs: 'lose' },
                    { m: 'Time to clean 300 sq ft', h: '12 min', hs: 'win', r: '~20 min', rs: 'lose' },
                    { m: 'Filter Grade', h: 'H13 HEPA', hs: 'neutral', r: 'H13 HEPA', rs: 'neutral' },
                    { m: 'Motor Type', h: 'BLDC', hs: 'win', r: 'Standard AC', rs: 'lose' },
                    { m: 'Noise', sub: '(Sleep Mode)', h: '28 dB', hs: 'win', r: '29 dB', rs: 'lose' }
                ] },
                { label: 'SMART CONTROL', rows: [
                    { m: 'Smart Control', h: 'Google Home + Alexa', hs: 'win', r: 'None', rs: 'lose' },
                    { m: 'Voice Commands', h: 'Yes', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Scheduling', h: 'Yes, via Google Home', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Extra app required', h: 'No', hs: 'neutral', r: 'No', rs: 'neutral' }
                ] },
                { label: '5-YEAR OWNERSHIP COST', rows: [
                    { m: 'Device', h: R + '6,000', hs: 'lose', r: R + '4,830', rs: 'win' },
                    { m: '8 Filter Replacements', h: R + '7,992', hs: 'win', r: R + '13,600', rs: 'lose' },
                    { m: 'Total', total: true, h: R + '13,992', hs: 'win', r: R + '18,430', rs: 'lose' }
                ] }
            ],
            save: 'You save <strong>' + R + '5,230</strong> over 5 years with Hawaa Edge',
            verdictLine: 'Hawaa Edge wins on CADR, coverage, smart control, and 5-year cost. The only trade-off is ' + R + '1,170 more upfront.'
        },
        {
            key: 'honeywell-v2',
            brand: 'Honeywell',
            model: 'Air Touch V2',
            groups: [
                { label: 'PRICE', rows: [
                    { m: 'Device Price', h: R + '6,000', hs: 'win', r: R + '7,299', rs: 'lose' },
                    { m: 'Filter Price', sub: '(per replacement)', h: R + '999', hs: 'win', r: R + '2,479', rs: 'lose' }
                ] },
                { label: 'PERFORMANCE', rows: [
                    { m: 'CADR', h: '250 ' + M3 + '/hr', hs: 'neutral', r: '250 ' + M3 + '/hr', rs: 'neutral' },
                    { m: 'Coverage', h: '300 sq ft', hs: 'neutral', r: '388 sq ft', rs: 'neutral' },
                    { m: 'Filter Stages', h: '3-in-1', hs: 'neutral', r: '4-stage', rs: 'neutral' },
                    { m: 'Motor Type', h: 'BLDC', hs: 'win', r: 'Standard AC', rs: 'lose' },
                    { m: 'Noise', sub: '(Sleep Mode)', h: '28 dB', hs: 'win', r: '~35 dB', rs: 'lose' },
                    { m: 'Filter Grade', h: 'H13 HEPA', hs: 'neutral', r: 'H13 HEPA', rs: 'neutral' }
                ] },
                { label: 'SMART CONTROL', rows: [
                    { m: 'Smart Control', h: 'Google Home + Alexa', hs: 'win', r: 'None', rs: 'lose' },
                    { m: 'Voice Commands', h: 'Yes', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Scheduling', h: 'Yes, via Google Home', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Extra app required', h: 'No', hs: 'neutral', r: 'No', rs: 'neutral' }
                ] },
                { label: '5-YEAR OWNERSHIP COST', rows: [
                    { m: 'Device', h: R + '6,000', hs: 'win', r: R + '7,299', rs: 'lose' },
                    { m: '8 Filter Replacements', h: R + '7,992', hs: 'win', r: R + '19,832', rs: 'lose' },
                    { m: 'Total', total: true, h: R + '13,992', hs: 'win', r: R + '27,131', rs: 'lose' }
                ] }
            ],
            save: 'You save <strong>' + R + '13,139</strong> over 5 years — for identical CADR',
            verdictLine: 'Same CADR. Lower price. BLDC motor. Built-in smart control. The V2 costs more upfront, runs louder, and its filters cost nearly 2.5x more.'
        },
        {
            key: 'philips',
            brand: 'Philips',
            model: 'AC0920',
            groups: [
                { label: 'PRICE', rows: [
                    { m: 'Device Price', h: R + '6,000', hs: 'win', r: R + '9,995', rs: 'lose' },
                    { m: 'Filter Price', sub: '(per replacement)', h: R + '999', hs: 'win', r: R + '1,920', rs: 'lose' }
                ] },
                { label: 'PERFORMANCE', rows: [
                    { m: 'CADR', h: '250 ' + M3 + '/hr', hs: 'neutral', r: '250 ' + M3 + '/hr', rs: 'neutral' },
                    { m: 'Coverage', h: '300 sq ft', hs: 'neutral', r: '300 sq ft', rs: 'neutral' },
                    { m: 'Motor Type', h: 'BLDC', hs: 'win', r: 'Standard', rs: 'lose' },
                    { m: 'Noise', sub: '(Sleep Mode)', h: '28 dB', hs: 'win', r: '~33 dB', rs: 'lose' },
                    { m: 'Filter Grade', h: 'H13 HEPA', hs: 'neutral', r: 'H13 HEPA', rs: 'neutral' },
                    { m: 'AQI Display', h: 'Yes', hs: 'neutral', r: 'Yes', rs: 'neutral' }
                ] },
                { label: 'SMART CONTROL', rows: [
                    { m: 'Smart Control', h: 'Google Home + Alexa', hs: 'win', r: 'Philips Air+ App', rs: 'lose' },
                    { m: 'Voice Commands', h: 'Yes', hs: 'win', r: 'Limited', rs: 'lose' },
                    { m: 'Scheduling', h: 'Yes, via Google Home', hs: 'win', r: 'Yes, via app', rs: 'lose' },
                    { m: 'Extra app required', h: 'No', hs: 'win', r: 'Yes — Air+ App', rs: 'lose' }
                ] },
                { label: '5-YEAR OWNERSHIP COST', rows: [
                    { m: 'Device', h: R + '6,000', hs: 'win', r: R + '9,995', rs: 'lose' },
                    { m: '8 Filter Replacements', h: R + '7,992', hs: 'win', r: R + '15,360', rs: 'lose' },
                    { m: 'Total', total: true, h: R + '13,992', hs: 'win', r: R + '25,355', rs: 'lose' }
                ] }
            ],
            save: 'You save <strong>' + R + '11,363</strong> over 5 years — for air that is equally clean',
            verdictLine: 'Identical CADR. Identical coverage. Same filter grade. The Philips costs ' + R + '3,995 more upfront, runs louder, and locks smart features behind a proprietary app.'
        },
        {
            key: 'levoit',
            brand: 'Levoit',
            model: 'Core 300',
            groups: [
                { label: 'PRICE', rows: [
                    { m: 'Device Price', h: R + '6,000', hs: 'win', r: '~' + R + '9,000', rs: 'lose' },
                    { m: 'Filter Price', sub: '(per replacement)', h: R + '999', hs: 'win', r: R + '3,000', rs: 'lose' }
                ] },
                { label: 'PERFORMANCE', rows: [
                    { m: 'CADR', h: '250 ' + M3 + '/hr', hs: 'win', r: '240 ' + M3 + '/hr', rs: 'lose' },
                    { m: 'Coverage', h: '300 sq ft', hs: 'win', r: '220 sq ft', rs: 'lose' },
                    { m: 'Motor Type', h: 'BLDC', hs: 'win', r: 'Standard AC', rs: 'lose' },
                    { m: 'Noise', sub: '(Sleep Mode)', h: '28 dB', hs: 'lose', r: '24 dB', rs: 'win' },
                    { m: 'Filter Grade', h: 'H13 HEPA', hs: 'neutral', r: 'H13 HEPA', rs: 'neutral' }
                ] },
                { label: 'SMART CONTROL', rows: [
                    { m: 'Smart Control', h: 'Google Home + Alexa', hs: 'win', r: 'None (base model)', rs: 'lose' },
                    { m: 'Voice Commands', h: 'Yes', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Scheduling', h: 'Yes, via Google Home', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Extra app required', h: 'No', hs: 'neutral', r: 'No', rs: 'neutral' }
                ] },
                { label: '5-YEAR OWNERSHIP COST', rows: [
                    { m: 'Device', h: R + '6,000', hs: 'win', r: R + '9,000', rs: 'lose' },
                    { m: '8 Filter Replacements', h: R + '7,992', hs: 'win', r: R + '24,000', rs: 'lose' },
                    { m: 'Total', total: true, h: R + '13,992', hs: 'win', r: R + '33,000', rs: 'lose' }
                ] }
            ],
            save: 'You save <strong>' + R + '19,008</strong> over 5 years',
            verdictLine: 'The Core 300 was engineered for Western room sizes. Its 220 sq ft coverage leaves a standard Indian bedroom outside its rated zone. The Edge costs ' + R + '3,000 less and covers 80 sq ft more.'
        },
        {
            key: 'levoit-mini',
            brand: 'Levoit',
            model: 'Core Mini',
            groups: [
                { label: 'PRICE', rows: [
                    { m: 'Device Price', h: R + '6,000', hs: 'lose', r: '~' + R + '5,000', rs: 'win' },
                    { m: 'Filter Price', sub: '(per replacement)', h: R + '999', hs: 'win', r: R + '1,999', rs: 'lose' }
                ] },
                { label: 'PERFORMANCE', rows: [
                    { m: 'CADR', h: '250 ' + M3 + '/hr', hs: 'win', r: '~100 ' + M3 + '/hr', rs: 'lose' },
                    { m: 'Coverage', h: '300 sq ft', hs: 'win', r: '183 sq ft', rs: 'lose' },
                    { m: 'Motor Type', h: 'BLDC', hs: 'win', r: 'Standard', rs: 'lose' },
                    { m: 'Noise', sub: '(Sleep Mode)', h: '28 dB', hs: 'lose', r: '~25 dB', rs: 'win' },
                    { m: 'Filter Grade', h: 'H13 HEPA', hs: 'neutral', r: 'H13 HEPA', rs: 'neutral' }
                ] },
                { label: 'SMART CONTROL', rows: [
                    { m: 'Smart Control', h: 'Google Home + Alexa', hs: 'win', r: 'None', rs: 'lose' },
                    { m: 'Voice Commands', h: 'Yes', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Scheduling', h: 'Yes, via Google Home', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Extra app required', h: 'No', hs: 'neutral', r: 'No', rs: 'neutral' }
                ] },
                { label: '5-YEAR OWNERSHIP COST', rows: [
                    { m: 'Device', h: R + '6,000', hs: 'lose', r: R + '5,000', rs: 'win' },
                    { m: '8 Filter Replacements', h: R + '7,992', hs: 'win', r: R + '15,992', rs: 'lose' },
                    { m: 'Total', total: true, h: R + '13,992', hs: 'win', r: R + '20,992', rs: 'lose' }
                ] }
            ],
            save: 'You save <strong>' + R + '7,000</strong> over 5 years — and get 2.5x the CADR',
            verdictLine: 'The Core Mini costs ' + R + '1,000 less upfront. That is where its advantages end. Its ~100 ' + M3 + '/hr CADR is built for personal spaces — not a standard Indian bedroom.'
        },
        {
            key: 'qubo',
            brand: 'Qubo',
            model: 'Q200',
            groups: [
                { label: 'PRICE', rows: [
                    { m: 'Device Price', h: R + '6,000', hs: 'win', r: R + '12,990', rs: 'lose' },
                    { m: 'Filter Price', sub: '(per replacement)', h: R + '999', hs: 'win', r: R + '1,590', rs: 'lose' }
                ] },
                { label: 'PERFORMANCE', rows: [
                    { m: 'CADR', h: '250 ' + M3 + '/hr', hs: 'win', r: '~150 ' + M3 + '/hr', rs: 'lose' },
                    { m: 'Coverage', h: '300 sq ft', hs: 'win', r: '200 sq ft', rs: 'lose' },
                    { m: 'Motor Type', h: 'BLDC', hs: 'neutral', r: 'BLDC', rs: 'neutral' },
                    { m: 'Filter Grade', h: 'H13 HEPA', hs: 'neutral', r: 'H13 HEPA', rs: 'neutral' }
                ] },
                { label: 'SMART CONTROL', rows: [
                    { m: 'Smart Control', h: 'Google Home + Alexa', hs: 'win', r: 'Qubo App + Alexa', rs: 'lose' },
                    { m: 'Voice Commands', h: 'Yes', hs: 'neutral', r: 'Yes', rs: 'neutral' },
                    { m: 'Scheduling', h: 'Yes, via Google Home', hs: 'win', r: 'Yes, via app', rs: 'lose' },
                    { m: 'Extra app required', h: 'No', hs: 'win', r: 'Yes — Qubo App', rs: 'lose' }
                ] },
                { label: '5-YEAR OWNERSHIP COST', rows: [
                    { m: 'Device', h: R + '6,000', hs: 'win', r: R + '12,990', rs: 'lose' },
                    { m: '8 Filter Replacements', h: R + '7,992', hs: 'win', r: R + '12,720', rs: 'lose' },
                    { m: 'Total', total: true, h: R + '13,992', hs: 'win', r: R + '25,710', rs: 'lose' }
                ] }
            ],
            save: 'You save <strong>' + R + '11,718</strong> over 5 years — and get 67% more CADR',
            verdictLine: 'The Q200 costs 2.2x more to deliver 40% less cleaning power. Both have BLDC motors. Both support voice control. The Edge does it without another app.'
        },
        {
            key: 'winix',
            brand: 'Winix',
            model: 'A231',
            groups: [
                { label: 'PRICE', rows: [
                    { m: 'Device Price', h: R + '6,000', hs: 'win', r: '~' + R + '18,000+', rs: 'lose' },
                    { m: 'Filter Price', sub: '(per replacement)', h: R + '999', hs: 'win', r: R + '2,999', rs: 'lose' }
                ] },
                { label: 'PERFORMANCE', rows: [
                    { m: 'CADR', h: '250 ' + M3 + '/hr', hs: 'neutral', r: '~252 ' + M3 + '/hr', rs: 'neutral' },
                    { m: 'Coverage', h: '300 sq ft', hs: 'win', r: '222 sq ft', rs: 'lose' },
                    { m: 'Motor Type', h: 'BLDC', hs: 'win', r: 'Standard', rs: 'lose' },
                    { m: 'Filter Grade', h: 'H13 HEPA', hs: 'neutral', r: 'True HEPA + PlasmaWave', rs: 'neutral' },
                    { m: 'India Availability', h: 'Widely available', hs: 'win', r: 'Select channels', rs: 'lose' },
                    { m: 'After-sales service', h: '1 yr PAN India', hs: 'win', r: 'Limited', rs: 'lose' }
                ] },
                { label: 'SMART CONTROL', rows: [
                    { m: 'Smart Control', h: 'Google Home + Alexa', hs: 'win', r: 'None', rs: 'lose' },
                    { m: 'Voice Commands', h: 'Yes', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Scheduling', h: 'Yes, via Google Home', hs: 'win', r: 'No', rs: 'lose' },
                    { m: 'Extra app required', h: 'No', hs: 'neutral', r: 'No', rs: 'neutral' }
                ] },
                { label: '5-YEAR OWNERSHIP COST', rows: [
                    { m: 'Device', h: R + '6,000', hs: 'win', r: R + '18,000', rs: 'lose' },
                    { m: '8 Filter Replacements', h: R + '7,992', hs: 'win', r: R + '23,992', rs: 'lose' },
                    { m: 'Total', total: true, h: R + '13,992', hs: 'win', r: R + '41,992', rs: 'lose' }
                ] }
            ],
            save: 'You save <strong>' + R + '28,000</strong> over 5 years',
            verdictLine: 'Same CADR. Larger coverage. Native smart home integration. ' + R + '28,000 cheaper over five years. The A231 lacks official India distribution and after-sales support.'
        },
        {
            key: 'dyson',
            brand: 'Dyson',
            model: 'HushJet',
            groups: [
                { label: 'PRICE', rows: [
                    { m: 'Device Price', h: R + '6,000', hs: 'win', r: R + '29,900', rs: 'lose' },
                    { m: 'Filter Price', sub: '(per replacement)', h: R + '999', hs: 'lose', r: '5-year filter*', rs: 'win' }
                ] },
                { label: 'PERFORMANCE', rows: [
                    { m: 'CADR', h: '250 ' + M3 + '/hr', hs: 'neutral', r: '250 ' + M3 + '/hr', rs: 'neutral' },
                    { m: 'Coverage', h: '300 sq ft', hs: 'neutral', r: '~300 sq ft', rs: 'neutral' },
                    { m: 'Motor', h: 'BLDC', hs: 'neutral', r: 'Dyson Compressor', rs: 'neutral' },
                    { m: 'Filter Grade', h: 'H13 HEPA', hs: 'neutral', r: 'Electrostatic 99.97%', rs: 'neutral' },
                    { m: 'Noise', sub: '(Sleep Mode)', h: '28 dB', hs: 'lose', r: '24 dB', rs: 'win' },
                    { m: 'Filter Life', h: '~6 months', hs: 'lose', r: '5 years*', rs: 'win' },
                    { m: 'Design', h: 'Minimal', hs: 'neutral', r: 'Premium', rs: 'neutral' }
                ] },
                { label: 'SMART CONTROL', rows: [
                    { m: 'Smart Control', h: 'Google Home + Alexa', hs: 'neutral', r: 'MyDyson + Alexa + Google', rs: 'neutral' },
                    { m: 'Voice Commands', h: 'Yes', hs: 'neutral', r: 'Yes', rs: 'neutral' },
                    { m: 'Scheduling', h: 'Yes, via Google Home', hs: 'neutral', r: 'Yes, via MyDyson', rs: 'neutral' },
                    { m: 'Extra app required', h: 'No', hs: 'win', r: 'Yes — MyDyson App', rs: 'lose' }
                ] },
                { label: '5-YEAR OWNERSHIP COST', rows: [
                    { m: 'Device', h: R + '6,000', hs: 'win', r: R + '29,900', rs: 'lose' },
                    { m: '5-yr filters', h: R + '7,992', hs: 'lose', r: R + '0*', rs: 'win' },
                    { m: 'Total', total: true, h: R + '13,992', hs: 'win', r: R + '29,900', rs: 'lose' }
                ] }
            ],
            save: 'You save <strong>' + R + '15,908</strong> over 5 years',
            footnote: '*Dyson’s electrostatic filter is rated for 5 years at 12 hrs/day in standard conditions. In Indian environments with heavy PM2.5, cooking smoke, and incense, real-world filter life may vary. Dyson does not publish India-specific filter degradation data.',
            verdictLine: 'Both deliver 250 ' + M3 + '/hr CADR to the same room size. The air that comes out is equally clean. The question is what the ' + R + '23,900 difference means to you.'
        }
    ];
})();
