import { chromium } from "playwright";

/** Open local Chromium or connect to an existing browser through CDP. */
export async function openBrowser({ cdpUrl, log = () => {} } = {}) {
  if (cdpUrl) {
    log("connecting to remote Chromium over CDP");
    try {
      return await chromium.connectOverCDP(cdpUrl);
    } catch (error) {
      throw new Error(`Could not connect to the CDP browser at ${cdpUrl}: ${error.message}. Check that the endpoint is reachable and accepts Playwright CDP connections.`);
    }
  }

  try {
    return await chromium.launch();
  } catch (error) {
    const armLinux = process.platform === "linux" && process.arch === "arm64";
    const platform = armLinux ? "Linux ARM64 (including many Android terminal environments)" : `${process.platform}/${process.arch}`;
    const missingBrowser = error.code === "ENOENT" || /executable.*doesn.t exist|executable.*not found|Failed to launch/i.test(error.message);
    if (missingBrowser) {
      throw new Error(`Eyeball could not launch local Playwright Chromium on ${platform}. Install a compatible browser, or connect to an existing Chromium browser with --cdp <endpoint> (or EYEBALL_CDP_URL). A remote browser cannot reach this phone’s localhost: expose the dev server through a temporary tunnel and pass its URL with --url. Original error: ${error.message}`);
    }
    throw error;
  }
}
