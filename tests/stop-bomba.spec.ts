import { test, expect } from '@playwright/test';

test.describe('STOP Bomba Multiplayer', () => {
  test('Host and Guest can join a room, start game and click STOP', async ({ browser }) => {
    // 1. Create two separate browser contexts to simulate two different players
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    // ==========================================
    // HOST FLOW
    // ==========================================
    await hostPage.goto('/');
    
    // Click on STOP Bomba game card
    await hostPage.click('text="STOP Bomba"');
    
    // Click to create room
    await hostPage.click('text="Iniciar Nueva Partida"');
    
    // Fill profile
    await hostPage.fill('input[placeholder="Escribe tu nombre..."]', 'Host Player');
    await hostPage.click('text="🚀 Crear Partida"');

    // Wait to be in lobby and get room code
    // The room code is inside a <p> next to "Código de Sala"
    const roomCodeElement = hostPage.locator('p:has-text("Código de Sala") + p');
    await expect(roomCodeElement).toBeVisible({ timeout: 10000 });
    const roomCode = await roomCodeElement.innerText();
    
    expect(roomCode).toBeTruthy();
    expect(roomCode.length).toBe(4);

    // ==========================================
    // GUEST FLOW
    // ==========================================
    await guestPage.goto('/');
    
    // Click on STOP Bomba game card
    await guestPage.click('text="STOP Bomba"');
    
    // Switch to Join tab
    await guestPage.click('button:has-text("🎮 Unirse")');
    
    // Fill room code
    await guestPage.fill('input[placeholder="A1B2"]', roomCode);
    
    // Click join (arrow button)
    await guestPage.click('button[aria-label="Unirse a la sala"]');

    // Fill profile for guest
    await guestPage.fill('input[placeholder="Escribe tu nombre..."]', 'Guest Player');
    await guestPage.click('text="🎮 Unirse a la Partida"');

    // ==========================================
    // LOBBY & START
    // ==========================================
    // Host should see Guest in the lobby
    await expect(hostPage.locator(`text="Guest Player"`)).toBeVisible({ timeout: 15000 });
    
    // Host starts game (needs 3 categories selected, let's click on 3 just in case)
    // The categories are buttons with text like Nombres, Apellidos, Animales, etc.
    // Let's just click 3 available category buttons to be safe if they aren't pre-selected.
    // We can count them or just click specific ones. Let's click on the first 3 buttons inside the categories section.
    // The buttons are rendered via Object.keys(STOP_CATEGORIES).
    await hostPage.click('text="Nombres"').catch(() => {});
    await hostPage.click('text="Apellidos"').catch(() => {});
    await hostPage.click('text="Animales"').catch(() => {});
    await hostPage.click('text="Colores"').catch(() => {});

    await hostPage.click('text="¡Comenzar Partida! 🚀"');

    // ==========================================
    // GAME VIEW
    // ==========================================
    // Both should see the STOP BOMBA button eventually
    const hostStopBtn = hostPage.locator('button:has-text("¡STOP BOMBA!")');
    const guestStopBtn = guestPage.locator('button:has-text("¡STOP BOMBA!")');

    await expect(hostStopBtn).toBeVisible({ timeout: 15000 });
    await expect(guestStopBtn).toBeVisible({ timeout: 15000 });

    // Host needs to fill all category inputs to be able to click STOP BOMBA
    const hostInputs = await hostPage.locator('input[type="text"]').all();
    const roundLetter = (await hostPage.locator('div.w-16.h-16').innerText()).trim();
    await hostInputs[0].fill('Perro');
    await expect(hostPage.locator('text=Debe empezar con la letra')).toBeVisible();
    await expect(hostStopBtn).toBeDisabled();
    for (const input of hostInputs) {
      await input.fill(`${roundLetter}test`);
    }

    // Now the STOP BOMBA button should be enabled
    await expect(hostStopBtn).toBeEnabled({ timeout: 5000 });

    // Host clicks STOP BOMBA
    await hostStopBtn.click();

    // Both should be navigated to the review/results screen
    // We can check if "Revisión" or something similar is visible
    // Since we don't know the exact text of the next view, we just check if the STOP BOMBA button is gone
    await expect(hostStopBtn).toBeHidden({ timeout: 10000 });
    await expect(guestStopBtn).toBeHidden({ timeout: 10000 });

    // Close contexts
    await hostContext.close();
    await guestContext.close();
  });

  test('la vista móvil no desborda y conserva botones táctiles', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('html')).toHaveCSS('overflow-x', 'visible');
    const buttons = await page.locator('button:visible').evaluateAll((items) =>
      items.map((button) => button.getBoundingClientRect().height),
    );
    expect(buttons.every((height) => height >= 44)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
