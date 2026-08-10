// Phát 2 tiếng beep ngắn bằng Web Audio API — không cần file âm thanh, dùng để báo hiệu
// cảnh báo tồn kho khi thủ kho vừa đăng nhập.
export function playAlertSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

    const beep = (startTime: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    };

    const now = ctx.currentTime;
    beep(now);
    beep(now + 0.25);
  } catch (error) {
    console.error("Không phát được âm thanh cảnh báo", error);
  }
}
