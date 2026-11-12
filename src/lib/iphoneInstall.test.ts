import { describe, it, expect } from "vitest";
import { getIphoneInstallContext } from "./iphoneInstall";
describe("iPhone installation guidance", () => {
  it("recognizes Safari on iPhone", () => {
    expect(getIphoneInstallContext("iPhone Version/18.0 Mobile Safari/604.1", "iPhone", 5)).toEqual({ isIOS: true, isEmbedded: false, isSafari: true });
  });
  it("shows browser handoff for WhatsApp rather than Safari instructions alone", () => {
    expect(getIphoneInstallContext("iPhone Mobile WhatsApp", "iPhone", 5).isEmbedded).toBe(true);
  });
  it("recognizes iPads requesting the desktop site", () => {
    expect(getIphoneInstallContext("Macintosh Version/18.0 Safari/605.1", "MacIntel", 5).isIOS).toBe(true);
    expect(getIphoneInstallContext("Macintosh Safari/605.1", "MacIntel", 0).isIOS).toBe(false);
  });
  it("does not mistake Chrome on iPhone for Safari", () => {
    expect(getIphoneInstallContext("iPhone CriOS/130 Mobile Safari/604.1", "iPhone", 5).isSafari).toBe(false);
  });
});