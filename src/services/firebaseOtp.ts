import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { auth } from "../config/firebase";

let recaptchaVerifier: RecaptchaVerifier | null = null;

export const initRecaptcha = async (containerId = "recaptcha-container") => {
  if (recaptchaVerifier) return recaptchaVerifier;

  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = "";
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      recaptchaVerifier?.clear();
      recaptchaVerifier = null;
    },
  });

  try {
    await recaptchaVerifier.render();
  } catch (err) {
    console.warn("reCAPTCHA render warning:", err);
  }
  return recaptchaVerifier;
};

export const clearRecaptcha = () => {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
};

export const sendOtp = async (phone: string): Promise<ConfirmationResult> => {
  const phoneE164 = phone.startsWith("+")
    ? phone
    : "+84" + phone.replace(/^0/, "");

  if (!recaptchaVerifier) {
    await initRecaptcha();
  }

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
