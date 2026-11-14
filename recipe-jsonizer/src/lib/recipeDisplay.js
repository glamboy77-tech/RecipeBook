import { formatWeightAmountUnit } from "./recipe";

export function formatAmountUnitForDisplay(amount, unit) {
  if (amount === null || amount === undefined) return "";
  const u = (unit || "").trim();

  // g/kg 표기 개선(구간별 반올림 + kg 자동변환)
  if (u === "g" || u === "kg") {
    return formatWeightAmountUnit(amount, u);
  }

  // 밥숟가락 표기 개선
  // - 1숟가락 이상: N숟가락
  // - 1숟가락 미만: 티스푼(t)으로 환산 (밥숟가락 0.25 => 0.5t, 0.5 => 1t)
  if (u === "밥숟가락") {
    const v = Number(amount);
    if (!Number.isFinite(v)) return `${amount}숟가락`;

    if (v >= 1) {
      return `${v}숟가락`;
    }

    // 1 숟가락(=밥숟가락 표기) = 2t 로 가정 (0.5 숟가락 -> 1t)
    // 보기 좋게 0.5t 단위로 반올림, 0보다 큰 값은 최소 0.5t로 클램프
    const tRounded = Math.round(v * 2 * 2) / 2; // (v*2) => t, then round by 0.5
    const t = v > 0 ? Math.max(0.5, tRounded) : 0;
    return `${t}t`;
  }

  return `${amount}${u}`;
}

export function formatTimeTotal(minutes) {
  if (minutes === null || minutes === undefined) return "";
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return "";

  const hours = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  if (hours > 0 && mins > 0) return `약 ${hours}시간 ${mins}분`;
  if (hours > 0) return `약 ${hours}시간`;
  return `약 ${mins}분`;
}

