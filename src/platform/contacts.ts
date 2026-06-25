// 연락처 가져오기 어댑터 (환경별 feature-detect).
//  - 토스 WebView: 앱인토스 SDK fetchContacts(페이지네이션 + 권한 다이얼로그). 목록을 돌려주면
//    호출 측(QuickEntry)이 자체 선택 UI로 1명을 고른다(토스엔 단일 native picker가 없음).
//  - 그 외 지원 브라우저: 웹 Contact Picker API(안드로이드 크롬 등)로 1명 선택.
//  - 미지원 환경: 안내 throw → 호출 측이 "직접 입력"으로 폴백.
// 연락처는 편의 기능 — 권한 없어도 앱은 100% 동작한다.
import { isTossWebView } from './env';
import { loadSdk } from './sdk';

export interface PickedContact {
  name: string;
  phone: string | null;
}

// ── 웹 Contact Picker API ──
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

/** 어떤 형태로든 연락처 불러오기를 제공할 수 있는 환경인가(버튼 노출용, 동기). */
export function contactsSupported(): boolean {
  return webContacts() !== null || isTossWebView();
}

/** 토스 WebView에서 자체 선택 UI(목록·검색)를 써야 하는가.
 *  토스 WebView는 Chromium 기반이라 navigator.contacts가 "존재하지만" 실제론 열리지 않아
 *  (DOMException: "Unable to open a contact selector") 웹 Contact Picker를 쓰면 실패한다.
 *  따라서 토스 안에서는 webContacts 유무와 무관하게 항상 토스 SDK 목록을 사용한다. */
export function usesTossContactList(): boolean {
  return isTossWebView();
}

// ── 토스 SDK 연락처 목록 ──
export interface TossContactsPage {
  result: { name: string; phoneNumber: string }[];
  nextOffset: number | null;
  done: boolean;
}

/** 토스 연락처를 페이지 단위로 가져온다. 권한이 없으면 다이얼로그를 띄워 한 번 더 시도. */
export async function fetchTossContacts(opts: {
  size: number;
  offset: number;
  contains?: string;
}): Promise<TossContactsPage> {
  const sdk = await loadSdk();
  const fc = sdk?.fetchContacts;
  if (!fc) {
    throw new Error('이 환경에선 연락처를 불러올 수 없어요. 직접 입력해 주세요.');
  }
  const query = opts.contains ? { contains: opts.contains } : undefined;
  try {
    return await fc({ size: opts.size, offset: opts.offset, query });
  } catch (e) {
    // 권한 미허용일 수 있음 → 다이얼로그 요청 후 1회 재시도.
    try {
      const status = await fc.openPermissionDialog();
      if (status === 'allowed') {
        return await fc({ size: opts.size, offset: opts.offset, query });
      }
    } catch {
      /* 다이얼로그 실패는 원 에러로 처리 */
    }
    throw e instanceof Error
      ? e
      : new Error('연락처 권한이 없어요. 허용하거나 직접 입력해 주세요.');
  }
}

// ── 웹 단일 선택 ──
export async function pickContact(): Promise<PickedContact | null> {
  const wc = webContacts();
  if (wc) {
    const res = await wc.select(['name', 'tel'], { multiple: false });
    if (!res || res.length === 0) return null;
    const c = res[0]!;
    return { name: c.name?.[0] ?? '', phone: c.tel?.[0] ?? null };
  }
  throw new Error(
    '이 환경에선 연락처 불러오기가 안 돼요. 토스 앱(또는 안드로이드 크롬)에서 지원되며, 그 외에는 직접 입력해 주세요.',
  );
}
