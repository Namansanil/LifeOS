module.exports = {
  Barometer: {
    isAvailableAsync: jest.fn(async () => false),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Pedometer: {
    isAvailableAsync: jest.fn(async () => false),
    watchStepCount: jest.fn(() => ({ remove: jest.fn() })),
    getStepCountAsync: jest.fn(async () => ({ steps: 0 })),
  },
};
