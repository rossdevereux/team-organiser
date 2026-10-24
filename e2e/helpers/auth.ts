import { Page } from '@playwright/test';

export interface MockCoachUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'coach' | 'viewer';
}

export const DEFAULT_MOCK_COACH: MockCoachUser = {
  uid: 'test-coach-1',
  email: 'coach@testfc.com',
  displayName: 'Coach Dave',
  role: 'owner',
};

/**
 * Injects a deterministic simulated coach session into localStorage before page loads.
 * This bypasses third-party Google OAuth popups and enables offline/isolated test execution.
 */
export async function setupCoachSession(
  page: Page,
  options?: Partial<MockCoachUser>
): Promise<MockCoachUser> {
  const user: MockCoachUser = {
    ...DEFAULT_MOCK_COACH,
    ...options,
  };

  await page.addInitScript(
    ({ mockUser, mockRole }) => {
      localStorage.setItem('subshuffle_mock_user', JSON.stringify(mockUser));
      localStorage.setItem('subshuffle_role_override', mockRole);
    },
    {
      mockUser: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
      mockRole: user.role,
    }
  );

  return user;
}

/**
 * Clears mocked coach session and overrides from localStorage.
 */
export async function clearAuthSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('subshuffle_mock_user');
    localStorage.removeItem('subshuffle_role_override');
  });
}
