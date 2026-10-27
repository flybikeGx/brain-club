import type { Page } from '@playwright/test';

/** Read rendered SVG geometry instead of baking a random answer into the test. */
export async function correctRotationOption(page: Page) {
  return page.locator('.rotation-game-card').evaluate((card) => {
    const cells = (element: Element) =>
      JSON.stringify(
        Array.from(element.querySelectorAll('rect'), (rect) => [
          rect.getAttribute('x'),
          rect.getAttribute('y'),
        ]).sort(),
      );
    const target = cells(card.querySelector('.rotation-reference')!);
    return Array.from(card.querySelectorAll('.rotation-choice')).findIndex(
      (option) => cells(option) === target,
    );
  });
}

export async function rotationLayout(page: Page) {
  return page.locator('.rotation-game-card').evaluate((card) => {
    const outer = card.getBoundingClientRect();
    return {
      height: outer.height,
      width: outer.width,
      slots: [
        '.game-status',
        '.rotation-target-slot',
        '.rotation-instruction',
        '.rotation-options',
        '.rotation-feedback-slot',
        '.rotation-actions-slot',
        '.progress-track',
        '.rotation-choice',
      ].flatMap((selector) =>
        Array.from(card.querySelectorAll(selector), (element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x - outer.x,
            y: rect.y - outer.y,
            width: rect.width,
            height: rect.height,
          };
        }),
      ),
    };
  });
}
