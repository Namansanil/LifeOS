module.exports = {
  requireNativeModule: jest.fn(() => ({})),
  requireOptionalNativeModule: jest.fn(() => null),
  requireNativeViewManager: jest.fn(() => ({})),
  NativeModulesProxy: {},
  EventEmitter: class {
    addListener = jest.fn(() => ({ remove: jest.fn() }));
    removeAllListeners = jest.fn();
    emit = jest.fn();
  },
  Platform: {
    OS: 'ios',
    select: (objs) => objs.ios || objs.default,
  },
};
