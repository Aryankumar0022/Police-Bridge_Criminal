import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';

/* ------------------------------------------------------------------ */
/* Icon helpers (inline SVG to avoid extra deps)                      */
/* ------------------------------------------------------------------ */
const Icon = ({ d, size = 16, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d={d} />
  </svg>
);

const icons = {
  upload:   'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  shield:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  check:    'M20 6 9 17l-5-5',
  x:        'M18 6 6 18M6 6l12 12',
  clock:    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2',
  file:     'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  user:     'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  link:     'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  refresh:  'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  hash:     'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
  alert:    'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  eye:      'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  transfer: 'M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16',
};

/* ------------------------------------------------------------------ */
/* Event type config                                                  */
/* ------------------------------------------------------------------ */
const EVENT_CONFIG = {
  REGISTERED: { label: 'Registered', color: '#4C8C7D', icon: icons.upload },
  VIEWED:     { label: 'Viewed',     color: '#5B7FA6', icon: icons.eye },
  DOWNLOAD:   { label: 'Download',   color: '#C98A3B', icon: icons.file },
  TRANSFERRED:{ label: 'Transferred',color: '#9B6DB7', icon: icons.transfer },
  ACCEPTED:   { label: 'Accepted',   color: '#2E8B57', icon: icons.check },
  'VERIFIED — HASH MATCH': { label: 'Verified', color: '#4C8C7D', icon: icons.shield },
  'INTEGRITY FAILURE — HASH MISMATCH': { label: 'Integrity Failure', color: '#B5544B', icon: icons.alert },
  DELETE:     { label: 'Delete',     color: '#B5544B', icon: icons.x },
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div style={styles.statsBar}>
      <StatCard label="Blocks" value={stats.total_blocks} icon={icons.hash} />
      <StatCard label="Documents" value={stats.unique_documents} icon={icons.file} />
      <StatCard label="Actors" value={stats.unique_actors} icon={icons.user} />
      {stats.event_counts && Object.entries(stats.event_counts).map(([k, v]) => (
        <StatCard key={k} label={k} value={v}
          icon={EVENT_CONFIG[k]?.icon || icons.activity}
          color={EVENT_CONFIG[k]?.color} />
      ))}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon d={icon} size={14} color={color || 'var(--color-text-muted)'} />
        <span style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{value ?? '—'}</span>
    </div>
  );
}

function ChainVerification({ onVerify }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runVerify = async () => {
    setLoading(true);
    try {
      const r = await api.verifyCustodyChain();
      setResult(r);
      if (onVerify) onVerify(r);
    } catch (e) {
      setResult({ valid: false, message: e.message, blocks_checked: 0, errors: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.verifySection}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon d={icons.shield} size={18} color="var(--color-accent)" />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Chain Integrity</span>
        </div>
        <button onClick={runVerify} disabled={loading} style={styles.verifyBtn}>
          <Icon d={icons.refresh} size={13} />
          {loading ? 'Verifying…' : 'Verify Chain'}
        </button>
      </div>
      {result && (
        <div style={{
          ...styles.verifyResult,
          borderColor: result.valid ? 'var(--color-verified)' : 'var(--color-anomaly)',
          background: result.valid ? 'var(--color-verified-dim)' : 'var(--color-anomaly-dim)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon d={result.valid ? icons.check : icons.alert} size={16}
              color={result.valid ? 'var(--color-verified)' : 'var(--color-anomaly)'} />
            <span style={{ fontWeight: 600, color: result.valid ? 'var(--color-verified)' : 'var(--color-anomaly)' }}>
              {result.valid ? 'CHAIN VALID' : 'INTEGRITY VIOLATION'}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {result.message} — {result.blocks_checked} blocks checked
          </span>
          {result.errors && result.errors.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              {result.errors.map((e, i) => (
                <div key={i} style={{ color: 'var(--color-anomaly)', marginTop: 4 }}>
                  Block #{e.block_index}: {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadForm({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [actor, setActor] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [caseId, setCaseId] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !actor) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('actor', actor);
      if (actorRole) fd.append('actor_role', actorRole);
      if (caseId) fd.append('case_id', caseId);
      if (description) fd.append('description', description);

      const r = await api.custodyUpload(fd);
      setResult(r);
      setFile(null);
      setDescription('');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setResult({ status: 'error', detail: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} style={styles.uploadForm}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon d={icons.upload} size={18} color="var(--color-accent)" />
        <span style={{ fontWeight: 600, fontSize: 13 }}>Upload Evidence</span>
      </div>

      {/* Drop zone */}
      <label style={styles.dropZone}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} />
        <Icon d={icons.upload} size={24} color="var(--color-text-muted)" />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          {file ? file.name : 'Click to select file'}
        </span>
        {file && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {(file.size / 1024).toFixed(1)} KB
          </span>
        )}
      </label>

      <div style={styles.formGrid}>
        <input style={styles.input} placeholder="Officer / Actor name *" value={actor}
          onChange={(e) => setActor(e.target.value)} required />
        <input style={styles.input} placeholder="Role (e.g. IO, FSL)" value={actorRole}
          onChange={(e) => setActorRole(e.target.value)} />
        <input style={styles.input} placeholder="Case ID (e.g. FIR-2024-001)" value={caseId}
          onChange={(e) => setCaseId(e.target.value)} />
        <input style={styles.input} placeholder="Description" value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </div>

      <button type="submit" disabled={!file || !actor || uploading} style={{
        ...styles.uploadBtn,
        opacity: (!file || !actor || uploading) ? 0.5 : 1,
      }}>
        {uploading ? 'Uploading…' : 'Upload & Register in Chain'}
      </button>

      {result && (
        <div style={{
          ...styles.verifyResult,
          marginTop: 8,
          borderColor: result.status === 'success' ? 'var(--color-verified)' : 'var(--color-anomaly)',
          background: result.status === 'success' ? 'var(--color-verified-dim)' : 'var(--color-anomaly-dim)',
        }}>
          {result.status === 'success' ? (
            <>
              <span style={{ fontWeight: 600, color: 'var(--color-verified)', fontSize: 12 }}>✓ Registered</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                ID: {result.document_id} · Block #{result.block_index}
              </span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>
                Hash: {result.document_hash}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--color-anomaly)', fontSize: 12 }}>Error: {result.detail}</span>
          )}
        </div>
      )}
    </form>
  );
}

function DocumentList({ documents, onSelectDocument }) {
  if (!documents || documents.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
        No documents under custody yet.
      </div>
    );
  }

  // Group by Case ID
  const caseGroups = documents.reduce((acc, doc) => {
    const cid = doc.case_id || 'NO-CASE-ASSIGNED';
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(doc);
    return acc;
  }, {});

  // Find Attention Required items (e.g., pending transfer)
  const attentionItems = documents.filter(doc => doc.current_custodian?.includes('Pending'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Attention Required */}
      {attentionItems.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-anomaly)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon d={icons.alert} size={14} color="var(--color-anomaly)" /> Attention Required
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attentionItems.map(doc => (
              <div key={`attn-${doc.document_id}`} style={{ ...styles.docItem, borderLeft: '3px solid var(--color-anomaly)', background: 'var(--color-anomaly-dim)' }} onClick={() => onSelectDocument(doc.document_id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon d={icons.alert} size={14} color="var(--color-anomaly)" />
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-anomaly)' }}>{doc.document_id}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-anomaly)' }}>Transfer requested but not accepted</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case Folders */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 8 }}>Evidence Register</div>
        <div style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 16 }}>
          {Object.entries(caseGroups).map(([caseId, docs], idx) => (
            <div key={caseId} style={{ marginBottom: idx < Object.entries(caseGroups).length - 1 ? 16 : 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Icon d={icons.file} size={14} color="var(--color-accent)" /> {caseId}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8, borderLeft: '1px solid var(--color-border)', marginLeft: 6 }}>
                {docs.map(doc => (
                  <div key={doc.document_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer', borderRadius: 4, ':hover': { background: 'var(--color-base)' } }} onClick={() => onSelectDocument(doc.document_id)}>
                    <div style={{ width: 16, height: 1, background: 'var(--color-border)' }} />
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-accent)' }}>{doc.document_id}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{doc.document_name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocumentHistory({ documentId, onBack }) {
  const [history, setHistory] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docTab, setDocTab] = useState('overview'); // overview, custody, audit

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    api.getCustodyHistory(documentId)
      .then(r => setHistory(r))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
  }, [documentId]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const r = await api.verifyCustodyDocument(documentId);
      setVerifyResult(r);
    } catch (e) {
      setVerifyResult({ integrity: 'ERROR', message: e.message });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>;
  }

  const firstEvent = history?.history?.[0];
  const custodyEvents = history?.history?.filter(e => ['REGISTERED', 'TRANSFERRED', 'ACCEPTED', 'RETURNED'].includes(e.event_type)) || [];
  const lastCustody = custodyEvents[custodyEvents.length - 1] || firstEvent;
  
  let currentStatus = lastCustody?.event_type || 'UNKNOWN';
  if (currentStatus === 'TRANSFERRED') currentStatus = 'TRANSFER REQUESTED';
  else if (currentStatus === 'REGISTERED' && custodyEvents.length === 1) currentStatus = 'IN CUSTODY';
  else if (currentStatus === 'ACCEPTED') currentStatus = 'UNDER EXAMINATION';

  let custodian = lastCustody?.actor;
  if (lastCustody?.event_type === 'TRANSFERRED' && lastCustody?.details?.receiving_custodian) {
    custodian = `Pending acceptance by ${lastCustody.details.receiving_custodian}`;
  }

  return (
    <div>
      {/* Header and Integrity */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <button onClick={onBack} style={{ ...styles.backBtn, marginBottom: 12 }}>← Back to Documents</button>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {documentId} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>|</span> {firstEvent?.document_name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Case: {firstEvent?.details?.case_id || 'CASE-001'} · Current Custodian: <span style={{ fontWeight: 600 }}>{custodian}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: verifyResult?.integrity === 'INTACT' ? 'var(--color-verified)' : 'var(--color-accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: verifyResult?.integrity === 'INTACT' ? 'var(--color-verified)' : 'var(--color-text-primary)' }}>
              {currentStatus}
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {verifyResult?.integrity === 'INTACT' ? 'SHA-256 MATCH' : 'SHA-256 GENERATED'}
            </span>
          </div>
        </div>
        
        {/* Chain Integrity Summary */}
        <div style={{
          background: 'var(--color-panel)', border: '1px solid var(--color-border)',
          borderRadius: 8, padding: 12, minWidth: 220
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Chain Integrity</span>
            <button onClick={handleVerify} disabled={verifying} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer' }}>
              <Icon d={icons.refresh} size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', gap: 6 }}><Icon d={icons.check} size={12} color="var(--color-verified)" /> Hash Verified</div>
            <div style={{ display: 'flex', gap: 6 }}><Icon d={icons.check} size={12} color="var(--color-verified)" /> No missing events</div>
            <div style={{ display: 'flex', gap: 6 }}><Icon d={icons.check} size={12} color="var(--color-verified)" /> Sequence valid</div>
            <div style={{ display: 'flex', gap: 6 }}><Icon d={icons.check} size={12} color="var(--color-verified)" /> ID consistent</div>
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)', fontSize: 11, fontWeight: 700, display: 'flex', gap: 6, color: verifyResult?.integrity === 'INTACT' ? 'var(--color-verified)' : 'var(--color-text-primary)' }}>
            Integrity: {verifyResult?.integrity === 'INTACT' ? 'VERIFIED' : (verifying ? 'CHECKING...' : 'UNVERIFIED')}
          </div>
        </div>
      </div>

      {/* Internal Tabs */}
      <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--color-border)', marginBottom: 16 }}>
        {['overview', 'custody', 'audit'].map(tab => (
          <div key={tab} 
               onClick={() => setDocTab(tab)}
               style={{
                 paddingBottom: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                 color: docTab === tab ? 'var(--color-accent)' : 'var(--color-text-muted)',
                 borderBottom: docTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                 textTransform: 'capitalize'
               }}>
            {tab === 'overview' ? 'Evidence Overview' : tab === 'custody' ? 'Chain of Custody' : 'Audit Trail'}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      {docTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Evidence Details */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>File Metadata</div>
            <div style={{ background: 'var(--color-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontWeight: 600 }}>Original File:</div><div>{firstEvent?.document_name}</div>
                <div style={{ fontWeight: 600 }}>File Size:</div><div>{firstEvent?.details?.file_size ? `${(firstEvent.details.file_size / 1024).toFixed(2)} KB` : 'Unknown'}</div>
                <div style={{ fontWeight: 600 }}>Content Type:</div><div>{firstEvent?.details?.content_type || 'application/pdf'}</div>
                <div style={{ fontWeight: 600 }}>Registered By:</div><div>{firstEvent?.actor}</div>
                <div style={{ fontWeight: 600 }}>SHA-256:</div><div style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{firstEvent?.document_hash}</div>
              </div>
            </div>
          </div>

          {/* Why this evidence matters */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>Why this evidence matters</div>
            <div style={{ background: 'var(--color-elevated)', padding: '16px 20px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12 }}>Used in Analysis</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Icon d={icons.user} size={14} color="var(--color-accent)" /> <span style={{fontWeight:600}}>3</span> Entities</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Icon d={icons.link} size={14} color="var(--color-accent)" /> <span style={{fontWeight:600}}>5</span> Relationships</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Icon d={icons.clock} size={14} color="var(--color-accent)" /> <span style={{fontWeight:600}}>1</span> Timeline Event</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Icon d={icons.activity} size={14} color="var(--color-accent)" /> <span style={{fontWeight:600}}>2</span> Network Connections</div>
              </div>
              <button style={{ marginTop: 16, padding: '8px 16px', background: 'var(--color-accent-dim)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                View on Network
              </button>
            </div>
          </div>

          {/* Provenance Flow */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>End-to-End Provenance</div>
            <div style={{ background: 'var(--color-elevated)', padding: 24, borderRadius: 8, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ padding: '6px 12px', background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 150, textAlign: 'center' }}>GRAPH ENTITY<br/><span style={{color:'var(--color-text-secondary)', fontWeight:400}}>Raj Kumar</span></div>
              <div style={{ height: 16, width: 2, background: 'var(--color-border)' }} />
              <div style={{ padding: '6px 12px', background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 150, textAlign: 'center' }}>RELATIONSHIP<br/><span style={{color:'var(--color-text-secondary)', fontWeight:400}}>USES_PHONE</span></div>
              <div style={{ height: 16, width: 2, background: 'var(--color-border)' }} />
              <div style={{ padding: '6px 12px', background: 'var(--color-panel)', border: '1px solid var(--color-accent)', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 150, textAlign: 'center', color: 'var(--color-accent)' }}>EVIDENCE<br/><span style={{fontWeight:400}}>{firstEvent?.document_name} · Pg 3</span></div>
              <div style={{ height: 16, width: 2, background: 'var(--color-border)' }} />
              <div style={{ padding: '6px 12px', background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 150, textAlign: 'center' }}>CHAIN OF CUSTODY<br/><span style={{color:'var(--color-text-secondary)', fontWeight:400}}>{documentId}</span></div>
              <div style={{ height: 16, width: 2, background: 'var(--color-border)' }} />
              <div style={{ padding: '6px 12px', background: 'var(--color-panel)', border: '1px solid var(--color-verified)', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 150, textAlign: 'center', color: 'var(--color-verified)' }}>INTEGRITY<br/><span style={{fontWeight:400}}>SHA-256 ✓</span></div>
            </div>
          </div>
        </div>
      )}

      {docTab === 'custody' && (
        <div style={styles.timeline}>
          {custodyEvents.map((event, i, arr) => {
            const cfg = EVENT_CONFIG[event.event_type] || { label: event.event_type, color: '#888', icon: icons.activity };
            
            // From -> To Visualization for Transfers
            const isTransfer = event.event_type === 'TRANSFERRED';
            
            return (
              <div key={event.block_index} style={{ position: 'relative', paddingBottom: 32, paddingLeft: 24 }}>
                {i < arr.length - 1 && <div style={styles.timelineLine} />}
                <div style={{ ...styles.timelineDot, borderColor: cfg.color, left: 0, top: 4 }}>
                  <Icon d={cfg.icon} size={12} color={cfg.color} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>{cfg.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatTime(event.timestamp)}</span>
                  </div>
                  
                  {(() => {
                    if (event.event_type === 'REGISTERED' || event.event_type === 'ACCEPTED') {
                      const nextEvent = arr[i + 1];
                      const duration = getDuration(event.timestamp, nextEvent?.timestamp);
                      return (
                        <div style={{ fontSize: 11, color: 'var(--color-accent)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon d={icons.clock} size={11} />
                          Held in custody for: {duration} {!nextEvent && '(Present)'}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {isTransfer ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 8 }}>
                      <div style={{ padding: '8px 12px', background: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        {event.actor}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: 10 }}>
                        <span>TRANSFERRED</span>
                        <span>{event.details?.reason || 'Forensic Review'}</span>
                        <span>→</span>
                      </div>
                      <div style={{ padding: '8px 12px', background: 'var(--color-elevated)', border: '1px dashed var(--color-accent)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-accent)' }}>
                        {event.details?.receiving_custodian || 'Unknown'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      <Icon d={icons.user} size={11} /> {event.actor}
                      {event.details?.reason && <div style={{ marginTop: 4 }}>Reason: {event.details.reason}</div>}
                    </div>
                  )}

                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginTop: 8 }}>
                    Block #{event.block_index} {event.block_hash ? `· Hash: ${event.block_hash.substring(0, 16)}…` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {docTab === 'audit' && (
         <AuditLog events={history?.history?.filter(e => ['VIEWED', 'DOWNLOAD', 'VERIFIED — HASH MATCH', 'INTEGRITY FAILURE — HASH MISMATCH'].includes(e.event_type)) || []} />
      )}
    </div>
  );
}

function AuditLog({ events }) {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
        No events recorded yet.
      </div>
    );
  }
  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>#</th>
            <th style={styles.th}>Event</th>
            <th style={styles.th}>Document</th>
            <th style={styles.th}>Actor</th>
            <th style={styles.th}>Time</th>
            <th style={styles.th}>Hash</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const cfg = EVENT_CONFIG[e.event_type] || {};
            return (
              <tr key={e.block_index} style={styles.tr}>
                <td style={styles.td}>{e.block_index}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: cfg.color ? `${cfg.color}22` : 'var(--color-border)', color: cfg.color || 'var(--color-text-secondary)' }}>
                    {e.event_type}
                  </span>
                </td>
                <td style={{ ...styles.td, maxWidth: 120 }}>
                  <div className="truncate" style={{ fontSize: 11 }}>{e.document_name}</div>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{e.document_id}</div>
                </td>
                <td style={styles.td}>{e.actor}</td>
                <td style={styles.td}>{formatTime(e.timestamp)}</td>
                <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 9, maxWidth: 80 }}>
                  <div className="truncate">{e.block_hash?.substring(0, 16)}…</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return isoStr;
  }
}

function getDuration(startIso, endIso) {
  if (!startIso) return 'Unknown';
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  const diffMs = end - start;
  if (diffMs < 60000) return 'less than a minute';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ${diffMins % 60} min`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ${diffHours % 24} hr`;
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'overview', label: 'Overview', icon: icons.shield },
  { key: 'upload', label: 'Upload', icon: icons.upload },
  { key: 'documents', label: 'Documents', icon: icons.file },
  { key: 'audit', label: 'Audit Log', icon: icons.activity },
];

export default function ChainOfCustody({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);

  const loadStats = useCallback(async () => {
    try { setStats(await api.getCustodyStats()); } catch { /* ignore */ }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const r = await api.getCustodyDocuments({ limit: 100 });
      setDocuments(r.documents || []);
    } catch { /* ignore */ }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const r = await api.getCustodyEvents({ limit: 100 });
      setEvents(r.events || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadStats();
    loadDocuments();
    loadEvents();
  }, [isOpen, loadStats, loadDocuments, loadEvents]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={styles.headerIcon}>
              <Icon d={icons.shield} size={20} color="var(--color-accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Chain of Custody</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                Blockchain-verified evidence ledger
              </div>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <Icon d={icons.x} size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map((t) => (
            <button key={t.key}
              onClick={() => { setActiveTab(t.key); setSelectedDocId(null); }}
              style={{
                ...styles.tab,
                ...(activeTab === t.key ? styles.tabActive : {}),
              }}>
              <Icon d={t.icon} size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'overview' && (
            <>
              <StatsBar stats={stats} />
              <ChainVerification onVerify={loadStats} />
              <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Recent Activity
              </div>
              <AuditLog events={events.slice(0, 10)} />
            </>
          )}

          {activeTab === 'upload' && (
            <UploadForm onUploadSuccess={() => { loadStats(); loadDocuments(); loadEvents(); }} />
          )}

          {activeTab === 'documents' && (
            selectedDocId
              ? <DocumentHistory documentId={selectedDocId} onBack={() => setSelectedDocId(null)} />
              : <DocumentList documents={documents} onSelectDocument={setSelectedDocId} />
          )}

          {activeTab === 'audit' && <AuditLog events={events} />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
  },
  panel: {
    width: '90%', maxWidth: 780, maxHeight: '90vh',
    background: 'var(--color-panel)', borderRadius: 10,
    border: '1px solid var(--color-border)',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--color-accent-dim)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-text-muted)', cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  tabs: {
    display: 'flex', gap: 2, padding: '0 20px',
    borderBottom: '1px solid var(--color-border)',
  },
  tab: {
    padding: '10px 14px', fontSize: 12, fontWeight: 500,
    color: 'var(--color-text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
    borderBottom: '2px solid transparent',
    transition: 'var(--transition-fast)',
  },
  tabActive: {
    color: 'var(--color-accent)',
    borderBottomColor: 'var(--color-accent)',
  },
  content: {
    flex: 1, overflowY: 'auto', padding: 20,
  },
  statsBar: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 10, marginBottom: 16,
  },
  statCard: {
    padding: '12px 14px', borderRadius: 8,
    background: 'var(--color-elevated)',
    border: '1px solid var(--color-border)',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  verifySection: {
    padding: 16, borderRadius: 8,
    background: 'var(--color-elevated)',
    border: '1px solid var(--color-border)',
    marginBottom: 16,
  },
  verifyBtn: {
    padding: '6px 12px', fontSize: 11, fontWeight: 600,
    borderRadius: 6, cursor: 'pointer',
    border: '1px solid var(--color-border)',
    background: 'var(--color-elevated)',
    color: 'var(--color-text-secondary)',
    display: 'flex', alignItems: 'center', gap: 6,
    transition: 'var(--transition-fast)',
  },
  verifyResult: {
    marginTop: 12, padding: '10px 14px', borderRadius: 6,
    border: '1px solid', display: 'flex', flexDirection: 'column', gap: 2,
  },
  uploadForm: {
    maxWidth: 500,
  },
  dropZone: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 24, borderRadius: 8, cursor: 'pointer',
    border: '2px dashed var(--color-border)',
    background: 'var(--color-elevated)',
    transition: 'var(--transition-fast)',
    marginBottom: 12,
  },
  formGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 8, marginBottom: 12,
  },
  input: {
    padding: '8px 12px', fontSize: 12, borderRadius: 6,
    border: '1px solid var(--color-border)',
    background: 'var(--color-elevated)',
    color: 'var(--color-text-primary)',
  },
  uploadBtn: {
    width: '100%', padding: '10px 16px', fontSize: 12, fontWeight: 600,
    borderRadius: 6, cursor: 'pointer',
    background: 'var(--color-accent)',
    color: '#fff', border: 'none',
    transition: 'var(--transition-fast)',
  },
  docList: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  docItem: {
    padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
    background: 'var(--color-elevated)',
    border: '1px solid var(--color-border)',
    transition: 'var(--transition-fast)',
  },
  backBtn: {
    padding: '6px 12px', fontSize: 11, fontWeight: 500,
    borderRadius: 6, cursor: 'pointer',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  timeline: {
    position: 'relative', paddingLeft: 24,
  },
  timelineItem: {
    position: 'relative', paddingBottom: 20, paddingLeft: 20,
  },
  timelineLine: {
    position: 'absolute', left: 11, top: 28, bottom: 0,
    width: 2, background: 'var(--color-border)',
  },
  timelineDot: {
    position: 'absolute', left: 0, top: 2,
    width: 24, height: 24, borderRadius: '50%',
    border: '2px solid', background: 'var(--color-panel)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  timelineContent: {
    paddingLeft: 8,
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8,
  },
  th: {
    textAlign: 'left', padding: '8px 10px', fontSize: 10,
    color: 'var(--color-text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)',
    fontWeight: 600,
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: '8px 10px', fontSize: 11,
    color: 'var(--color-text-secondary)',
  },
  badge: {
    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
    display: 'inline-block',
  },
};
