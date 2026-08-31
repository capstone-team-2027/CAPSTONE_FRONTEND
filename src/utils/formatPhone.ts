// DB lưu SĐT dạng 84999999993 -> hiển thị E.164 có nhóm: +84 999 999 993
export const formatPhoneDisplay = (phone?: string | null) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "—";
  const subscriber = digits.startsWith("84")
    ? digits.slice(2)
    : digits.replace(/^0+/, "");
  if (subscriber.length !== 9) return `+${digits}`;
  return `+84 ${subscriber.slice(0, 3)} ${subscriber.slice(3, 6)} ${subscriber.slice(6)}`;
};
