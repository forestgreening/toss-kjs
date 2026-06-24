// 연락처 가져오기 어댑터 (feature-detect).
//  - 웹 Contact Picker API(안드로이드 크롬 등 지원 환경) 사용.
//  - 앱인토스 fetchContacts는 번들 빌드 시 이 파일에 연결(현재 SDK 미설치 — TODO).
//  - 미지원 환경에서는 안내 메시지 throw → 호출 측이 "직접 입력"으로 폴백.

export interface PickedContact {
  name: string;
  phone: string | null;
}

interface WebContactsManager {
  select(
    props: string[],
    opts?: { multiple?: boolean },
  ): Promise<Array<{ name?: string[]; tel?: string[] }>>;
}

function webContacts(): WebContactsManager | null {
  const c = (navigator as unknown as { contacts?: WebContactsManager }).contacts;
  return c && typeof c.select === 'function' ? c : null;
}

export function contactsSupported(): boolean {
  return webContacts() !== null;
  // TODO(번들): 앱인토스 fetchContacts 지원 여부도 여기서 OR 처리
}

export async function pickContact(): Promise<PickedContact | null> {
  const wc = webContacts();
  if (wc) {
    const res = await wc.select(['name', 'tel'], { multiple: false });
    if (!res || res.length === 0) return null;
    const c = res[0]!;
    return { name: c.name?.[0] ?? '', phone: c.tel?.[0] ?? null };
  }
  // TODO(번들): 앱인토스 WebView에서는 fetchContacts로 대체
  throw new Error(
    '이 환경에선 연락처 불러오기가 안 돼요. 토스 앱(또는 안드로이드 크롬)에서 지원되며, 그 외에는 직접 입력해 주세요.',
  );
}
