import '@testing-library/jest-dom';
import React from 'react';
import i18next from 'i18next';

jest.mock('next/head', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
}), { virtual: true });

beforeAll(async () => {
	require('./i18n');
	await i18next.changeLanguage('pt');
});
