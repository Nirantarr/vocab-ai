import { STORAGE_KEYS } from "../utils/constants.js";
import { getFromStorage, setInStorage } from "../utils/storage.js";

export async function getAuthToken() {
  const token = await getFromStorage(STORAGE_KEYS.authToken);

  if (typeof token !== "string") {
    return "";
  }

  return token.trim().replace(/^"+|"+$/g, "");
}

export async function setAuthToken(token) {
  const normalizedToken = typeof token === "string" ? token.trim().replace(/^"+|"+$/g, "") : "";
  await setInStorage(STORAGE_KEYS.authToken, normalizedToken);
  return normalizedToken;
}
