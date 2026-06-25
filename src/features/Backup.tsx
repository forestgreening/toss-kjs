import { useEffect, useState } from 'react';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { useDialog } from '../ui/Dialog';
import { exportDataset, replaceAll } from '../data/backupStore';
import { exportData, importData } from '../domain/backup';
import { backupToCloud, restoreFromCloud, type CloudConfig } from '../data/cloud-backup';
import { getDeviceKey, requestAppLogin } from '../platform/identity';
import { exchangeAuthCode } from '../data/auth';
import { DecryptError } from '../domain/crypto';

const CLOUD_URL_KEY = 'maeumjangbu.cloud.url';
const LOCAL_KEY_KEY = 'maeumjangbu.cloud.localkey';
const USERKEY_KEY = 'maeumjangbu.cloud.userkey';

// 복원 키 출처: user(토스 로그인 userKey, 가장 안정) > device(익명 키) > local(기기 전용, 비이동).
type KeySource = 'user' | 'device' | 'local';

/** 키 출처만 확인(부작용 없음 — 로컬 키를 새로 만들지 않는다). */
async function peekKeySource(): Promise<KeySource> {
  if (localStorage.getItem(USERKEY_KEY)) return 'user';
  return (await getDeviceKey()) ? 'device' : 'local';
}

// ⚠️ 보안: 여기서 만든 key를 클라이언트가 직접 blob 식별자로 서버에 보낸다(참조 서버는 신뢰).
//    운영 서버는 client-supplied key를 그대로 믿지 말고, 인증 세션에서 userKey를 도출해
//    per-user 인가를 강제해야 한다(타인 userKey로 PUT/GET 방지). server/README 참고.
/** 백업 식별자: userKey > 토스 익명 키 > 기기 로컬 랜덤 키(브라우저/실험용). */
async function resolveCloudKey(): Promise<{ key: string; source: KeySource }> {
  const userKey = localStorage.getItem(USERKEY_KEY);
  if (userKey) return { key: userKey, source: 'user' };
  const deviceKey = await getDeviceKey();
  if (deviceKey) return { key: deviceKey, source: 'device' };
  let local = localStorage.getItem(LOCAL_KEY_KEY);
  if (!local) {
    local = crypto.randomUUID();
    localStorage.setItem(LOCAL_KEY_KEY, local);
  }
  return { key: local, source: 'local' };
}

export function Backup({ back, home }: { back: () => void; home: () => void }) {
  const { reload, records } = useLedger();
  const { confirm } = useDialog();
  const [msg, setMsg] = useState('');
  const [cloudUrl, setCloudUrl] = useState(() => localStorage.getItem(CLOUD_URL_KEY) ?? '');
  const [passphrase, setPassphrase] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const [keySource, setKeySource] = useState<KeySource>('local');

  useEffect(() => {
    let alive = true;
    peekKeySource().then((s) => {
      if (alive) setKeySource(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function onTossLogin() {
    if (!cloudUrl.trim()) {
      setCloudMsg('먼저 백업 서버 주소를 입력하세요.');
      return;
    }
    setCloudBusy(true);
    setCloudMsg('');
    try {
      const login = await requestAppLogin();
      if (!login) {
        setCloudMsg('토스 앱에서만 로그인할 수 있어요.');
        return;
      }
      const userKey = await exchangeAuthCode(cloudUrl.trim(), login);
      localStorage.setItem(USERKEY_KEY, userKey);
      setKeySource('user');
      setCloudMsg('토스 로그인 완료 — 복원 키가 고정됐어요.');
    } catch (e) {
      setCloudMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setCloudBusy(false);
    }
  }

  function persistUrl(v: string) {
    setCloudUrl(v);
    localStorage.setItem(CLOUD_URL_KEY, v.trim());
  }

  const cloudReady = cloudUrl.trim().length > 0 && passphrase.length > 0 && !cloudBusy;

  async function onCloudBackup() {
    const ok = await confirm({
      title: '암호화 클라우드 백업',
      message:
        '데이터를 이 기기에서 암호화해 서버에 올려요(서버는 암호문만 보관, 운영자도 못 봐요).\n' +
        '⚠️ 패스프레이즈를 잊으면 영영 복구할 수 없어요. 안전하게 기억하세요.',
      confirmText: '백업',
    });
    if (!ok) return;
    setCloudBusy(true);
    setCloudMsg('');
    try {
      const { key } = await resolveCloudKey();
      const config: CloudConfig = { baseUrl: cloudUrl.trim(), key };
      await backupToCloud(config, await exportDataset(), passphrase);
      setCloudMsg('☁️ 클라우드 백업 완료.');
    } catch (e) {
      setCloudMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setCloudBusy(false);
    }
  }

  async function onCloudRestore() {
    if (records.length > 0) {
      const ok = await confirm({
        title: '클라우드에서 복원',
        message: '현재 데이터를 모두 지우고 클라우드 백업으로 바꿔요. 계속할까요?',
        confirmText: '복원',
        danger: true,
      });
      if (!ok) return;
    }
    setCloudBusy(true);
    setCloudMsg('');
    try {
      const { key } = await resolveCloudKey();
      const config: CloudConfig = { baseUrl: cloudUrl.trim(), key };
      const dataset = await restoreFromCloud(config, passphrase);
      if (!dataset) {
        setCloudMsg('이 기기 키로 저장된 클라우드 백업이 없어요.');
        return;
      }
      await replaceAll(dataset);
      await reload();
      setCloudMsg('☁️ 클라우드 복원 완료.');
    } catch (e) {
      if (e instanceof DecryptError) {
        setCloudMsg('패스프레이즈가 맞지 않아요(또는 백업이 손상됨).');
      } else {
        setCloudMsg(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setCloudBusy(false);
    }
  }

  async function onExport() {
    const file = exportData(await exportDataset(), Date.now());
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maeumjangbu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('백업 파일을 저장했어요.');
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const f = input.files?.[0];
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      const dataset = importData(parsed);
      if (records.length > 0) {
        const ok = await confirm({
          title: '복원',
          message: '현재 데이터를 모두 지우고 백업으로 바꿔요. 계속할까요?',
          confirmText: '복원',
          danger: true,
        });
        if (!ok) {
          input.value = '';
          return;
        }
      }
      await replaceAll(dataset);
      await reload();
      setMsg('복원 완료.');
    } catch {
      setMsg('백업 파일을 읽지 못했어요. 올바른 파일인지 확인해 주세요.');
    } finally {
      input.value = ''; // 같은 파일 재선택 가능하도록 리셋
    }
  }

  return (
    <>
      <TopBar title="백업 / 복원" onBack={back} onHome={home} />
      <div className="content">
        <div className="card">
          <b>내보내기 (JSON)</b>
          <p className="muted" style={{ margin: '6px 0 12px' }}>
            ⚠️ 백업 파일에는 이름·연락처·주고받은 내역이 담겨요. 안전한 곳에 보관하세요.
          </p>
          <button className="primary" onClick={onExport}>백업 파일 저장</button>
        </div>

        <div className="card">
          <b>가져오기 (덮어쓰기)</b>
          <p className="muted" style={{ margin: '6px 0 12px' }}>
            백업 파일을 선택하면 현재 데이터를 전부 교체해요.
          </p>
          <label className="primary" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
            백업 파일 불러오기
            <input type="file" accept="application/json" onChange={onImport} style={{ display: 'none' }} />
          </label>
        </div>

        {msg && <div className="card" style={{ color: 'var(--blue)' }}>{msg}</div>}

        <div className="card">
          <b>암호화 클라우드 백업 <span className="muted" style={{ fontWeight: 400 }}>(실험)</span></b>
          <p className="muted" style={{ margin: '6px 0 12px' }}>
            이 기기에서 <b>패스프레이즈로 암호화</b>한 뒤 서버엔 암호문만 올려요. 운영자도 내용을 볼 수 없어요.
            패스프레이즈는 서버로 전송되지 않으며, <b>잊으면 복구할 수 없어요.</b>
          </p>
          <label className="lbl" style={{ marginTop: 0 }}>백업 서버 주소</label>
          <input
            className="field"
            inputMode="url"
            placeholder="https://your-server.example.com"
            value={cloudUrl}
            onChange={(e) => persistUrl(e.target.value)}
          />
          <label className="lbl">패스프레이즈</label>
          <input
            className="field"
            type="password"
            placeholder="기억할 수 있는 긴 암호"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="ghost" style={{ flex: 1 }} disabled={!cloudReady} onClick={onCloudRestore}>
              복원
            </button>
            <button className="primary" style={{ flex: 1 }} disabled={!cloudReady} onClick={onCloudBackup}>
              {cloudBusy ? '처리 중…' : '백업'}
            </button>
          </div>
          {keySource !== 'user' && (
            <button className="ghost" style={{ width: '100%', marginTop: 8 }} disabled={cloudBusy} onClick={onTossLogin}>
              토스 로그인 — 복원 키 고정(기기변경 대비)
            </button>
          )}
          {keySource === 'local' && (
            <div className="muted" style={{ marginTop: 10 }}>
              ℹ️ 지금은 <b>이 기기 전용 키</b>로 백업돼요. 토스 로그인 전에는 다른 기기에서 복원되지 않을 수 있어요.
            </div>
          )}
          {keySource === 'device' && (
            <div className="muted" style={{ marginTop: 10 }}>
              ℹ️ 토스 <b>익명 키</b>로 백업돼요. 기기변경에도 안정적으로 복원하려면 토스 로그인을 권장해요.
            </div>
          )}
          {keySource === 'user' && (
            <div className="muted" style={{ marginTop: 10 }}>
              ✅ 토스 <b>로그인 키</b>로 백업돼요(기기를 바꿔도 같은 키로 복원).
            </div>
          )}
          {cloudMsg && <div className="muted" style={{ marginTop: 10, color: 'var(--blue)' }}>{cloudMsg}</div>}
        </div>

        <div className="muted" style={{ textAlign: 'center' }}>
          기기를 바꾸면 로컬 데이터가 사라질 수 있어요. 정기적으로 백업하세요.
        </div>
      </div>
    </>
  );
}
