const fetch = (...a) => import('node-fetch').then(({default:f})=>f(...a));
require('dotenv').config();
const { analyzeImageWithVerification } = require('./server/lib/longcat');
const { calibrateResult } = require('./server/routes/analyze');

const TESTS = [
  { url: 'https://picsum.photos/id/64/800/600.jpg', label: 'Portrait face' },
  { url: 'https://picsum.photos/id/1/800/600.jpg',  label: 'Nature' }
];

(async () => {
  for (const test of TESTS) {
    console.log('\n────────────────────');
    console.log(test.label);
    try {
      const res = await fetch(test.url);
      const buf = Buffer.from(await res.arrayBuffer());
      let result = await analyzeImageWithVerification(buf.toString('base64'), 'image/jpeg');
      result = calibrateResult(result);
      console.log('Verdict:', result.verdict, '|', result.confidence + '%');
      console.log('Signals:', result.signals.length);
      result.signals.forEach(s => {
        const hasDesc = s.technical_description && 
          !s.technical_description.includes('could not be parsed') &&
          !s.technical_description.includes('not recoverable');
        console.log(
          (hasDesc ? '✓' : '✗'),
          '[' + s.severity + ']',
          s.name + ':',
          s.technical_description?.substring(0, 80)
        );
      });
    } catch(e) { console.log('ERROR:', e.message) }
  }
})();
