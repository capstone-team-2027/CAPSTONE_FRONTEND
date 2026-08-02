import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { auth } from "../config/firebase";

let recaptchaVerifier: RecaptchaVerifier | null = null;
let recaptchaContainerId: string | null = null;

export const initRecaptcha = async (containerId = "recaptcha-container") => {
  if (recaptchaVerifier && recaptchaContainerId === containerId) {
    return recaptchaVerifier;
  }

  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }

  const container = document.getElementById(containerId);
  if (container) {
    container.replaceChildren();
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      recaptchaVerifier?.clear();
      recaptchaVerifier = null;
      recaptchaContainerId = null;
    },
  });
  recaptchaContainerId = containerId;

  try {
    await recaptchaVerifier.render();
  } catch (err) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
    recaptchaContainerId = null;
    console.warn("reCAPTCHA render warning:", err);
    throw err;
  }
  return recaptchaVerifier;
};

export const clearRecaptcha = () => {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
  if (recaptchaContainerId) {
    document.getElementById(recaptchaContainerId)?.replaceChildren();
  }
  recaptchaContainerId = null;
};

export const sendOtp = async (
  phone: string,
  containerId = "recaptcha-container",
): Promise<ConfirmationResult> => {
  const phoneE164 = phone.startsWith("+")
    ? phone
    : "+84" + phone.replace(/^0/, "");

  await initRecaptcha(containerId);

  return await signInWithPhoneNumber(auth, phoneE164, recaptchaVerifier!);
};

export const verifyOtp = async (
  confirmation: ConfirmationResult,
  code: string,
): Promise<string> => {
  const result = await confirmation.confirm(code);
  const idToken = await result.user.getIdToken();
  return idToken;
};

let currentConfirmation: ConfirmationResult | null = null;

export const setConfirmation = (c: ConfirmationResult | null) => {
  currentConfirmation = c;
};

export const getConfirmation = (): ConfirmationResult | null => {
  return currentConfirmation;
};
