import { describe, expect, it } from 'vitest';
import { MobileClassManager, type PlatformState } from '../src/core/mobile-class-manager';

/**
 * Fences the platform-class application logic. The PlatformState parameter
 * lets these tests run without mocking the `obsidian` module — we pass
 * stub platform states directly. The container parameter uses a minimal
 * classList-shaped stub to avoid pulling jsdom into the test environment
 * (vitest config keeps `environment: 'node'`).
 */

function platformState(overrides: Partial<PlatformState>): PlatformState {
	return { isMobile: false, isDesktop: false, isPhone: false, isTablet: false, ...overrides };
}

function classListStub(): { classList: Set<string>; container: HTMLElement } {
	const classList = new Set<string>();
	const container = {
		classList: {
			add: (cls: string) => classList.add(cls),
		},
	} as unknown as HTMLElement;
	return { classList, container };
}

describe('MobileClassManager.applyPlatformClasses', () => {
	const manager = new MobileClassManager();

	it('applies cr-mobile when isMobile is true', () => {
		const { classList, container } = classListStub();
		manager.applyPlatformClasses(container, platformState({ isMobile: true }));
		expect(classList.has('cr-mobile')).toBe(true);
		expect(classList.has('cr-desktop')).toBe(false);
	});

	it('applies cr-desktop when isDesktop is true', () => {
		const { classList, container } = classListStub();
		manager.applyPlatformClasses(container, platformState({ isDesktop: true }));
		expect(classList.has('cr-desktop')).toBe(true);
		expect(classList.has('cr-mobile')).toBe(false);
	});

	it('applies cr-phone when isPhone is true', () => {
		const { classList, container } = classListStub();
		manager.applyPlatformClasses(container, platformState({ isMobile: true, isPhone: true }));
		expect(classList.has('cr-phone')).toBe(true);
		expect(classList.has('cr-tablet')).toBe(false);
	});

	it('applies cr-tablet when isTablet is true', () => {
		const { classList, container } = classListStub();
		manager.applyPlatformClasses(container, platformState({ isMobile: true, isTablet: true }));
		expect(classList.has('cr-tablet')).toBe(true);
		expect(classList.has('cr-phone')).toBe(false);
	});

	it('applies both cr-mobile and cr-desktop on hybrid platforms that report both', () => {
		// Some hybrid platforms / Obsidian builds report both flags true.
		// Stylesheets that need unambiguous-desktop can scope on
		// `.cr-desktop:not(.cr-mobile)`.
		const { classList, container } = classListStub();
		manager.applyPlatformClasses(container, platformState({ isMobile: true, isDesktop: true }));
		expect(classList.has('cr-mobile')).toBe(true);
		expect(classList.has('cr-desktop')).toBe(true);
	});

	it('is idempotent — re-applying does not duplicate classes', () => {
		const { classList, container } = classListStub();
		const state = platformState({ isMobile: true, isPhone: true });
		manager.applyPlatformClasses(container, state);
		manager.applyPlatformClasses(container, state);
		// Set-shaped — second call is a no-op.
		expect(classList.size).toBe(2);
	});

	it('does not pollute the container when all platform flags are false', () => {
		// Defensive: if the platform reports nothing, no classes get added.
		const { classList, container } = classListStub();
		manager.applyPlatformClasses(container, platformState({}));
		expect(classList.size).toBe(0);
	});
});
