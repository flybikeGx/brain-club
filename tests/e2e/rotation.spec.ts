import { test, expect } from '@playwright/test';
import { correctRotationOption, rotationLayout } from './helpers/rotation';

test.use({ hasTouch: true });

for (const mobile of [false, true]) {
  test(`二维旋转${mobile ? '触屏五选项' : '桌面三选项'}布局固定，答对自动继续，答错保留解析`, async ({
    page,
  }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 });
    await page.goto('/training?exercise=spatial-rotation');
    const count = mobile ? 5 : 3;
    await page.getByLabel('选项数量').selectOption(String(count));
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.getByRole('button', { name: '开始训练', exact: true }).click();
    const card = page.locator('.rotation-game-card');
    const round = page.locator('.rotation-game-card .game-status strong').first();
    const initial = await rotationLayout(page);
    const correct = await correctRotationOption(page);
    expect(correct).toBeGreaterThanOrEqual(0);
    const correctButton = page.getByRole('button', {
      name: `选项 ${String.fromCharCode(65 + correct)}`,
      exact: true,
    });
    if (mobile) await correctButton.tap();
    else await correctButton.click();
    await expect(round).toHaveText('2 / 10');
    await expect(card).toHaveAttribute('data-phase', 'answer');
    await expect(page.getByRole('button', { name: '下一题', exact: true })).toHaveCount(0);
    await expect(page.locator('.correct-answer')).toHaveCount(0);
    expect(await rotationLayout(page)).toEqual(initial);
    if (!mobile) {
      // A physical double click must not answer two consecutive problems.
      const index = await correctRotationOption(page);
      await page
        .getByRole('button', { name: `选项 ${String.fromCharCode(65 + index)}`, exact: true })
        .dblclick();
      await expect(round).toHaveText('3 / 10');
      await expect(card).toHaveAttribute('data-phase', 'answer');
    }
    const currentRound = await round.textContent();
    const solution = await correctRotationOption(page);
    const wrong = (solution + 1) % count;
    const wrongButton = page.getByRole('button', {
      name: `选项 ${String.fromCharCode(65 + wrong)}`,
      exact: true,
    });
    if (mobile) await wrongButton.tap();
    else await wrongButton.click();
    await expect(card).toHaveAttribute('data-phase', 'feedback');
    await expect(
      page.getByText(`正确选项是 ${String.fromCharCode(65 + solution)}。`, { exact: false }),
    ).toBeVisible();
    await expect(page.locator('.rotation-choice.correct-answer')).toHaveCount(1);
    await expect(page.locator('.rotation-choice.incorrect-answer')).toHaveCount(1);
    for (const button of await page.locator('.rotation-choice').all())
      await expect(button).toBeDisabled();
    expect(await rotationLayout(page)).toEqual(initial);
    await page.clock.runFor(5000);
    await expect(round).toHaveText(currentRound!);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/rotation-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.getByRole('heading', { name: '练习已暂停' })).toBeVisible();
    await page.getByRole('button', { name: '继续查看解析', exact: true }).click();
    await expect(card).toHaveAttribute('data-phase', 'feedback');
    await expect(round).toHaveText(currentRound!);
    await page.getByRole('button', { name: '下一题', exact: true }).click();
    await expect(card).toHaveAttribute('data-phase', 'answer');
    await expect(page.locator('.correct-answer')).toHaveCount(0);
    expect(await rotationLayout(page)).toEqual(initial);
  });
}

test('最后一道旋转题答错时保留答案，确认后才保存结果', async ({ page }) => {
  await page.goto('/training?exercise=spatial-rotation');
  await page.getByLabel('选项数量').selectOption('2');
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  for (let round = 0; round < 10; round++) {
    const correct = await correctRotationOption(page);
    await page
      .getByRole('button', {
        name: `选项 ${String.fromCharCode(65 + ((correct + 1) % 2))}`,
        exact: true,
      })
      .click();
    await expect(page.locator('.rotation-game-card')).toHaveAttribute('data-phase', 'feedback');
    if (round < 9) await page.getByRole('button', { name: '下一题', exact: true }).click();
  }
  await expect(page.getByText('已保存到本机')).toHaveCount(0);
  await expect(page.locator('.rotation-choice.correct-answer')).toHaveCount(1);
  await page.getByRole('button', { name: '查看结果', exact: true }).click();
  await expect(page.getByText('已保存到本机')).toBeVisible();
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
  ).toHaveText('0%');
});
