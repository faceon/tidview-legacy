type ChromeNamespace = typeof chrome | undefined;

const getChrome = (): ChromeNamespace => {
  if (typeof globalThis === "undefined") {
    return undefined;
  }
  return (globalThis as typeof globalThis & { chrome?: ChromeNamespace })
    .chrome;
};

export const hasChromeRuntime = (): boolean => !!getChrome()?.runtime;
export const hasChromeStorage = (): boolean =>
  !!getChrome()?.storage?.sync && !!getChrome()?.storage?.session;

export async function chromeSyncGet<T extends Record<string, unknown>>(
  keys?: string[] | T,
): Promise<T> {
  const namespace = getChrome();
  if (!namespace?.storage?.sync) {
    throw new Error("chrome.storage.sync is unavailable in this context");
  }
  return namespace.storage.sync.get(keys ?? null) as Promise<T>;
}

export async function chromeSessionGet<T extends Record<string, unknown>>(
  keys?: string[] | T,
): Promise<T> {
  const namespace = getChrome();
  if (!namespace?.storage?.session) {
    throw new Error("chrome.storage.session is unavailable in this context");
  }
  return namespace.storage.session.get(keys ?? null) as Promise<T>;
}

export async function chromeSyncSet(payload: Record<string, unknown>) {
  const namespace = getChrome();
  if (!namespace?.storage?.sync) {
    throw new Error("chrome.storage.sync is unavailable in this context");
  }
  await namespace.storage.sync.set(payload);
}

export async function sendChromeMessage<
  TPayload extends Record<string, unknown>,
  TResponse = unknown,
>(payload: TPayload): Promise<TResponse> {
  const namespace = getChrome();
  if (!namespace?.runtime?.sendMessage) {
    throw new Error("chrome.runtime.sendMessage is unavailable");
  }
  return new Promise((resolve, reject) => {
    namespace.runtime.sendMessage(payload, (response: unknown) => {
      if (namespace.runtime.lastError) {
        reject(new Error(namespace.runtime.lastError.message));
        return;
      }
      resolve(response as TResponse);
    });
  });
}

export function addChromeStorageListener(
  callback: Parameters<typeof chrome.storage.onChanged.addListener>[0],
) {
  const namespace = getChrome();
  namespace?.storage?.onChanged.addListener(callback);
  return () => namespace?.storage?.onChanged.removeListener(callback);
}
