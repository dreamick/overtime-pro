const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('/Users/dreamick/WorkBuddy/overtime-pro/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true });
const w = dom.window;

dom.window.addEventListener('load', run);
setTimeout(run, 300);

let done = false;
function run() {
  if (done) return; done = true;
  try {
    const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    let pass = true;

    // 场景A：历史月 2026-08 全结转，无换休 → 应显示「已结转下月」，不得误报「已核销 X/Xh」
    const outA = w.eval(`(function(){
      DB.months={};
      DB.months['2026-08'] = { carryMode:'workOnly', days:{ '20':{hours:1.5,type:'work'}, '31':{hours:2.5,type:'work'} } };
      return buildLvWarnDetail('2026-08');
    })()`);
    console.log('=== 场景A（历史月全结转）===');
    console.log(strip(outA));
    if (outA.includes('已核销 1.5') || outA.includes('已核销 2.5')) { console.log('FAIL A: 误报已核销'); pass = false; }
    if (!outA.includes('已结转下月')) { console.log('FAIL A: 未显示已结转下月'); pass = false; }

    // 场景B：当月 2026-09 加班4h + 换休2h，无上月结转 → 显示「已核销 2/4h · 剩 2h 待调休」
    const cd = new Date();
    const ck = cd.getFullYear() + '-' + String(cd.getMonth() + 1).padStart(2, '0');
    const outB = w.eval(`(function(){
      DB.months={};
      DB.months['${ck}'] = { carryMode:'workOnly', days:{ '15':{hours:4,type:'work',leaveH:2} } };
      return buildLvWarnDetail('${ck}');
    })()`);
    console.log('\n=== 场景B（当月换休核销）===');
    console.log(strip(outB));
    if (!outB.includes('已核销 2/4h')) { console.log('FAIL B: 当月换休核销显示错误'); pass = false; }
    // 当月无上月结转，不应出现真实结转标注「已结转 Xh」(hint 的"已结转下月显示为蓝色"不含数字)
    if (outB.includes('已结转 2h') || outB.includes('已结转 3h')) { console.log('FAIL B: 当月不应出现结转'); pass = false; }

    // 场景C：历史月 2026-08 加班A(4h,换休2h) + 加班B(3h,无换休)，workOnly 封板 →
    //   A 部分核销+部分结转，B 全结转；验证 used 扣除 carried 后准确
    const outC = w.eval(`(function(){
      DB.months={};
      DB.months['2026-08'] = { carryMode:'workOnly', days:{ '10':{hours:4,type:'work',leaveH:2}, '20':{hours:3,type:'work'} } };
      return buildLvWarnDetail('2026-08');
    })()`);
    console.log('\n=== 场景C（部分结转+部分核销）===');
    console.log(strip(outC));
    if (!outC.includes('已结转 2h')) { console.log('FAIL C: 未显示 已结转 2h'); pass = false; }
    if (!outC.includes('已核销 2/4h')) { console.log('FAIL C: 未显示 已核销 2/4h'); pass = false; }
    if (!outC.includes('已结转下月')) { console.log('FAIL C: 未显示 已结转下月'); pass = false; }

    console.log('\n' + (pass ? 'ALL PASS' : 'HAS FAILURE'));
    process.exit(pass ? 0 : 1);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(2);
  }
}
