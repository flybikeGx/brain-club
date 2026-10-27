import { correctRotationOption } from './helpers/rotation';
import { test, expect, type Page } from '@playwright/test';
async function openMind(page: Page) {
  await page.goto('/mindfulness');
  await expect(page.getByRole('button', { name: '开始练习', exact: true })).toBeEnabled();
  await page.clock.install();
}
test('首页空状态、导航、桌面与移动布局', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: '为大脑，留一点练习时间。' })).toBeVisible();
  await expect(page.getByText('还没有训练记录')).toBeVisible();
  await page.screenshot({
    path: 'test-results/dashboard-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('link', { name: '训练器械', exact: true }).click();
  await expect(page.getByRole('heading', { name: '认知训练器械区' })).toBeVisible();
  await expect(page.getByText('规划中', { exact: true })).toHaveCount(8);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '打开导航' }).click();
  await page.getByRole('link', { name: '正念跑步机', exact: true }).click();
  await expect(page.getByRole('heading', { name: '正念跑步机' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'test-results/mindfulness-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});
test('正念暂停、继续、主动觉察、刷新恢复、复盘和历史', async ({ page }) => {
  await openMind(page);
  await page.getByRole('button', { name: '开始练习', exact: true }).click();
  await page.clock.runFor(5500);
  await page.getByRole('button', { name: '觉察到走神' }).click();
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  const paused = await page.getByTestId('mindfulness-timer').textContent();
  await page.clock.runFor(10000);
  await expect(page.getByTestId('mindfulness-timer')).toHaveText(paused!);
  await page.reload();
  await expect(page.getByText('已恢复上次练习，并保持暂停。', { exact: false })).toBeVisible();
  await expect(page.getByTestId('mindfulness-timer')).toHaveText(paused!);
  await page.getByRole('button', { name: '继续练习', exact: true }).click();
  await page.clock.runFor(2500);
  await expect(page.getByTestId('mindfulness-timer')).not.toHaveText(paused!);
  await page.getByRole('button', { name: '结束练习', exact: true }).click();
  await page.getByPlaceholder('此刻身体和注意力是什么感觉？').fill('能觉察到走神，感觉舒适。');
  await page.getByRole('button', { name: '保存本次练习' }).click();
  await expect(page.getByText('已保存到本机')).toBeVisible();
  await page.goto('/history');
  await expect(page.getByRole('cell', { name: '正念练习', exact: true })).toBeVisible();
  await expect(page.getByText('提前结束', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell', { name: '正念练习', exact: true })).toBeVisible();
});
test('正念自动结束与失焦自动暂停', async ({ page }) => {
  await openMind(page);
  await page.getByLabel('自定义练习分钟').fill('1');
  await page.getByRole('button', { name: '开始练习', exact: true }).click();
  await page.clock.runFor(3000);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: '继续练习', exact: true })).toBeVisible();
  const paused = await page.getByTestId('mindfulness-timer').textContent();
  await page.clock.runFor(20000);
  await expect(page.getByTestId('mindfulness-timer')).toHaveText(paused!);
  await page.getByRole('button', { name: '继续练习', exact: true }).click();
  await page.clock.runFor(58000);
  await expect(page.getByRole('heading', { name: '停下来，感受一下现在。' })).toBeVisible();
  await page.getByRole('button', { name: '保存本次练习' }).click();
  await expect(page.getByText('已保存到本机')).toBeVisible();
});
test('舒尔特完整训练、错误计数、键盘输入和刷新记录', async ({ page }) => {
  await page.goto('/training?exercise=schulte');
  await page.getByLabel('网格尺寸').selectOption('3');
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await page.getByRole('button', { name: '数字 2', exact: true }).click();
  await page.getByRole('button', { name: '数字 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  for (let i = 2; i <= 9; i++)
    await page.getByRole('button', { name: `数字 ${i}`, exact: true }).click();
  await expect(page.getByText('已保存到本机')).toBeVisible();
  await expect(page.getByText('错误次数', { exact: true })).toBeVisible();
  await page.goto('/history');
  await expect(page.getByRole('cell', { name: '舒尔特方格', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell', { name: '舒尔特方格', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看详情' }).click();
  await expect(page.getByRole('heading', { name: '舒尔特方格 · 本次记录' })).toBeVisible();
});
test('舒尔特标准模式不变灰，毫秒计时排除暂停并保存到历史', async ({ page }) => {
  await page.goto('/training?exercise=schulte');
  await page.getByLabel('网格尺寸').selectOption('3');
  await expect(page.getByLabel('已点击数字', { exact: true })).toHaveValue('unchanged');
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await expect(page.getByLabel('已点击数字', { exact: true })).toBeDisabled();
  await page.clock.runFor(1234);
  await expect(page.getByTestId('schulte-timer')).toHaveText(/^00:01\.2\d{2}$/);
  await page.getByRole('button', { name: '数字 1', exact: true }).click();
  await expect(page.getByRole('button', { name: '数字 1', exact: true })).not.toHaveClass(/done/);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.clock.runFor(5000);
  await page.getByRole('button', { name: '继续训练', exact: true }).click();
  await page.clock.runFor(321);
  for (let n = 2; n <= 9; n++)
    await page.getByRole('button', { name: `数字 ${n}`, exact: true }).click();
  await expect(page.getByText('已保存到本机')).toBeVisible();
  await expect(
    page
      .locator('.result-stats .stat-card')
      .filter({ hasText: '有效用时' })
      .locator('.stat-number'),
  ).toHaveText('00:01.555');
  await page.clock.resume();
  await page.goto('/history');
  await expect(page.getByRole('cell', { name: '00:01.555', exact: true })).toBeVisible();
  await expect(page.getByLabel('比较条件')).toContainText('已点击数字变灰 关');
});
test('舒尔特辅助模式只将正确按过的数字变灰', async ({ page }) => {
  await page.goto('/training?exercise=schulte');
  await page.getByLabel('已点击数字', { exact: true }).selectOption('dim');
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await page.getByRole('button', { name: '数字 2', exact: true }).click();
  await expect(page.getByRole('button', { name: '数字 2', exact: true })).not.toHaveClass(/done/);
  await page.getByRole('button', { name: '数字 1', exact: true }).click();
  await expect(page.getByRole('button', { name: '数字 1', exact: true })).toHaveClass(/done/);
  await page.getByRole('button', { name: '数字 2', exact: true }).click();
  await expect(page.locator('.schulte-cell.done')).toHaveCount(2);
});
test('数字记忆十组可玩，自适应升降难度并存储', async ({ page }) => {
  await page.goto('/training?exercise=digit-training');
  await page.getByLabel('初始序列长度').fill('2');
  await page.getByLabel('每位展示间隔').selectOption('500');
  await page.clock.install();
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  for (let round = 0; round < 10; round++) {
    let digits = '';
    await page.clock.runFor(460);
    for (let i = 0; i < 13; i++) {
      const display = page.locator('.digit-display');
      if ((await display.count()) === 0) break;
      const digit = (await display.textContent()) ?? '';
      if (/^\d$/.test(digit)) digits += digit;
      await page.clock.runFor(500);
    }
    await expect(page.getByLabel('数字序列答案')).toBeVisible();
    await page.getByLabel('数字序列答案').fill(digits);
    await page.getByRole('button', { name: '提交答案', exact: true }).click();
    await page
      .getByRole('button', { name: round === 9 ? '查看结果' : '下一组', exact: true })
      .click();
  }
  await expect(page.getByText('已保存到本机')).toBeVisible();
  await expect(
    page
      .locator('.result-panel .stat-card')
      .filter({ hasText: '本次正确率' })
      .locator('.stat-number'),
  ).toHaveText('100%');
});
test('广度测评正式阶段不显示答案，失焦标无效', async ({ page }) => {
  await page.goto('/assessment?test=digit-forward');
  await page.clock.install();
  await page.getByRole('button', { name: '开始练习阶段', exact: true }).click();
  await page.clock.runFor(3500);
  await page.getByLabel('数字序列答案').fill('000');
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.getByRole('button', { name: '进入正式测评' }).click();
  await page.clock.runFor(3500);
  await page.getByLabel('数字序列答案').fill('000');
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByText('本试次已记录。', { exact: true })).toBeVisible();
  await expect(page.getByText(/这组的正确序列是/)).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.getByRole('button', { name: '结束并记录中断' }).click();
  await expect(page.getByRole('heading', { name: '本次测评已标记无效' })).toBeVisible();
});
test('空间序列复现流程、随机布局和正式阶段', async ({ page }) => {
  await page.goto('/assessment?test=corsi');
  await page.clock.install();
  await page.getByRole('button', { name: '开始练习阶段' }).click();
  await expect(page.locator('.corsi-cell')).toHaveCount(9);
  const sequence: number[] = [];
  await page.clock.runFor(460);
  for (let i = 0; i < 3; i++) {
    sequence.push(
      Number((await page.locator('.corsi-cell.lit').getAttribute('aria-label'))!.split(' ')[1]),
    );
    await page.clock.runFor(900);
  }
  for (const n of sequence)
    await page.getByRole('button', { name: `位置 ${n}`, exact: true }).click();
  await expect(page.getByText('练习完成。准备进入正式测评。')).toBeVisible();
  await page.getByRole('button', { name: '进入正式测评' }).click();
  await expect(page.getByText('正式测评', { exact: false })).toBeVisible();
});
test('二维旋转十题完整可用并保存', async ({ page }) => {
  await page.goto('/training?exercise=spatial-rotation');
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  for (let i = 0; i < 10; i++) {
    const correct = await correctRotationOption(page);
    const wrong = i % 2 === 0;
    const choice = wrong ? (correct + 1) % 3 : correct;
    await page
      .getByRole('button', { name: `选项 ${String.fromCharCode(65 + choice)}`, exact: true })
      .click();
    if (wrong) await page.getByRole('button', { name: '下一题', exact: true }).click();
  }
  await expect(page.getByText('已保存到本机')).toBeVisible();
  await expect(page.getByText('平均反应时', { exact: true })).toBeVisible();
  await expect(
    page
      .locator('.result-stats .stat-card')
      .filter({ hasText: '正式试次' })
      .locator('.stat-number'),
  ).toHaveText('10');
  await expect(
    page
      .locator('.result-stats .stat-card')
      .filter({ hasText: '本次正确率' })
      .locator('.stat-number'),
  ).toHaveText('50%');
});
test('阅读练习、原创材料理解与正式结果', async ({ page }) => {
  await page.goto('/assessment?test=reading');
  await page.getByRole('button', { name: '开始练习阶段' }).click();
  await page.getByLabel('他想避免被雨淋湿').check();
  await page.getByRole('button', { name: '提交练习' }).click();
  await page.getByRole('button', { name: '进入正式测评' }).click();
  await page.getByLabel('传感器显示土壤干燥时').check();
  await page.getByLabel('按需浇水用水较少，幼苗平均高度接近').check();
  await page.getByLabel('考察结论在不同条件下是否成立').check();
  await page.getByRole('button', { name: '提交本次测评' }).click();
  await expect(page.getByText('已保存到本机')).toBeVisible();
  await expect(
    page
      .locator('.result-panel .stat-card')
      .filter({ hasText: '本次正确率' })
      .locator('.stat-number'),
  ).toHaveText('100%');
});
test('警觉性练习、抢答、遗漏、正式计时与结果', async ({ page }) => {
  await page.goto('/assessment?test=pvt');
  await page.getByLabel('警觉性测评时长').selectOption('60');
  await page.clock.install();
  await page.getByRole('button', { name: '开始练习阶段' }).click();
  await page.keyboard.press('Space');
  await page.clock.runFor(21000);
  await expect(page.getByRole('button', { name: '开始正式测评' })).toBeVisible();
  await page.getByRole('button', { name: '开始正式测评' }).click();
  await page.keyboard.press('Space');
  await page.clock.runFor(61000);
  await expect(page.getByText('已保存到本机')).toBeVisible();
  await expect(page.getByText('遗漏次数', { exact: true })).toBeVisible();
  await expect(page.getByText('抢答次数', { exact: true })).toBeVisible();
});
test('主题持久化、JSON 导入导出、格式校验与删除', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('主题', { exact: true }).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: '切换浅色主题' })).toBeVisible();
  await page.screenshot({
    path: 'test-results/settings-dark.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"bad"}'),
  });
  await expect(page.locator('main [role=alert]')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON 备份' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mindgym-.*\.json$/);
  const path = await download.path();
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.getByRole('status')).toContainText('已导入');
  await page.getByRole('button', { name: '删除所有本机数据' }).click();
  await page.getByLabel('删除确认文字').fill('删除');
  await page.getByRole('button', { name: '永久删除全部本机数据' }).click();
  await expect(page.getByRole('status')).toContainText('已删除');
});
test('已加载器械在离线状态生成题目', async ({ page, context }) => {
  await page.goto('/training?exercise=schulte');
  await expect(page.getByRole('button', { name: '开始训练', exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await expect(page.locator('.schulte-cell')).toHaveCount(16);
  await page.getByRole('button', { name: '数字 1', exact: true }).click();
  await expect(page.locator('.game-status')).toContainText('2');
  await context.setOffline(false);
});
