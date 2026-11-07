import React from 'react';
import { render } from '@testing-library/react';
import SmoothScroll from './SmoothScroll';

const mockLenisConstructor = jest.fn();
jest.mock('lenis', () => {
  return {
    __esModule: true,
    default: function (...args: unknown[]) {
      mockLenisConstructor(...args);
      return {
        on: jest.fn(),
        raf: jest.fn(),
        destroy: jest.fn(),
      };
    },
  };
});

describe('SmoothScroll', () => {
  beforeEach(() => {
    mockLenisConstructor.mockClear();
  });

  it('does not initialize Lenis or hijack natural scrolling', () => {
    render(<SmoothScroll />);
    expect(mockLenisConstructor).not.toHaveBeenCalled();
  });
});



