const storage = new Map();

module.exports = {
  getItem: jest.fn(async (key) => storage.get(key) || null),
  setItem: jest.fn(async (key, value) => storage.set(key, String(value))),
  removeItem: jest.fn(async (key) => storage.delete(key)),
  clear: jest.fn(async () => storage.clear()),
  getAllKeys: jest.fn(async () => Array.from(storage.keys())),
  multiGet: jest.fn(async (keys) => keys.map((k) => [k, storage.get(k) || null])),
  multiSet: jest.fn(async (pairs) => {
    pairs.forEach(([k, v]) => storage.set(k, String(v)));
  }),
  multiRemove: jest.fn(async (keys) => {
    keys.forEach((k) => storage.delete(k));
  }),
};
