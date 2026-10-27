import { test, expect, type Page } from '@playwright/test';

test.use({ hasTouch: true });

async function layout(page: Page) {
  return page.locator('.digit-game-card').evaluate((card) => {
    const outer = card.getBoundingClientRect();
    return {
      height: outer.height,
      width: outer.width,
      slots: [
        '.game-status',
        '.digit-instruction',
        '.digit-input-hint',
        '.digit-keypad-slot',
        '.digit-action-slot',
        '.progress-track',
      ].map((selector) => {
        const rect = card.querySelector(selector)!.getBoundingClientRect();
        return { x: rect.x - outer.x, y: rect.y - outer.y, width: rect.width, height: rect.height };
      }),
    };
  });
}

for (const mobile of [false, true]) {
  test(`数字记忆${mobile ? '触屏' : '桌面'}布局固定，屏幕键盘可编辑并与实体输入混用`, async ({
    page,
  }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 });
    await page.goto('/training?exercise=digit-training');
    await page.getByLabel('初始序列长度').fill('2');
    await page.getByLabel('每位展示间隔').selectOption('500');
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.getByRole('button', { name: '开始训练', exact: true }).click();
    await expect(page.locator('.digit-task-stage')).toHaveAttribute('data-phase', 'present');
    await expect(page.getByRole('group', { name: '屏幕数字键盘' })).toHaveCount(0);
    const presenting = await layout(page);
    await page.clock.runFor(1460);
    const answer = page.getByLabel('数字序列答案');
    await expect(answer).toBeVisible();
    await expect(answer).toHaveAttribute('inputmode', 'none');
    expect(await layout(page)).toEqual(presenting);
    const press = async (label: string) => {
      const button = page.getByRole('button', { name: label, exact: true });
      if (mobile) await button.tap();
      else await button.click();
    };
    await press('输入数字 0');
    await press('输入数字 1');
    await press('输入数字 2');
    await expect(answer).toHaveValue('012');
    await press('删除上一位');
    await expect(answer).toHaveValue('01');
    await press('输入数字 0');
    await expect(answer).toHaveValue('010');
    await press('清空答案');
    await expect(answer).toHaveValue('');
    await expect(page.getByRole('button', { name: '提交答案', exact: true })).toBeDisabled();
    await press('输入数字 0');
    await press('输入数字 1');
    await page.keyboard.type('2');
    await expect(answer).toHaveValue('012');
    await answer.press('ArrowLeft');
    await press('输入数字 9');
    await expect(answer).toHaveValue('0192');
    await press('删除上一位');
    await expect(answer).toHaveValue('012');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/digit-recall-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: '提交答案', exact: true }).click();
    await expect(page.locator('.digit-task-stage')).toHaveAttribute('data-phase', 'feedback');
    expect(await layout(page)).toEqual(presenting);
    await page.getByRole('button', { name: '下一组', exact: true }).click();
    expect(await layout(page)).toEqual(presenting);
    await page.clock.runFor(1460);
    await expect(page.getByLabel('数字序列答案')).toHaveValue('');
  });
}

test('倒序广度测评支持屏幕键盘，正式反馈不泄露答案', async ({ page }) => {
  await page.goto('/assessment?test=digit-backward');
  await page.clock.install();
  await page.getByRole('button', { name: '开始练习阶段', exact: true }).click();
  await page.clock.runFor(3500);
  await expect(page.getByText('按相反顺序输入', { exact: true })).toBeVisible();
  for (const digit of [0, 1, 2])
    await page.getByRole('button', { name: `输入数字 ${digit}`, exact: true }).click();
  await page.getByRole('button', { name: '提交答案', exact: true }).click();
  await page.getByRole('button', { name: '进入正式测评', exact: true }).click();
  await page.clock.runFor(3500);
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: '输入数字 0', exact: true }).click();
  await page.getByRole('button', { name: '提交答案', exact: true }).click();
  await expect(page.getByText('本试次已记录。', { exact: true })).toBeVisible();
  await expect(page.getByText(/这组的正确序列是/)).toHaveCount(0);
});
