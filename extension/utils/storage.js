export async function getFromStorage(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function setInStorage(key, value) {
  await chrome.storage.local.set({ [key]: value });
}
